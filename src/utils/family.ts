import { FamilyData, GroupExpensesData, ExpenseGroup, GroupExpense, GroupSettlement } from "@/types/family";

const FAMILY_KEY = "family-data";
const GROUP_KEY = "group-expenses-data";

const emptyFamily: FamilyData = {
  wives: [],
  children: [],
  parents: [],
  siblings: [],
  household: [],
  events: [],
  loans: [],
  zakat: [],
};

export const getFamilyData = (): FamilyData => {
  try {
    const raw = localStorage.getItem(FAMILY_KEY);
    if (!raw) return { ...emptyFamily };
    const parsed = JSON.parse(raw);
    return { ...emptyFamily, ...parsed };
  } catch {
    return { ...emptyFamily };
  }
};

export const saveFamilyData = (data: FamilyData) => {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(data));
};

export const getGroupData = (): GroupExpensesData => {
  try {
    const raw = localStorage.getItem(GROUP_KEY);
    if (!raw) return { groups: [] };
    return JSON.parse(raw);
  } catch {
    return { groups: [] };
  }
};

export const saveGroupData = (data: GroupExpensesData) => {
  localStorage.setItem(GROUP_KEY, JSON.stringify(data));
};

// ---------- Calculations ----------

export const sumExpenses = (entries: { amount: number }[]) =>
  entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

export const wifeTotal = (data: FamilyData, wifeId: string) => {
  const wife = data.wives.find(w => w.id === wifeId);
  if (!wife) return 0;
  const wifeSpend = sumExpenses(wife.expenses);
  const childSpend = data.children
    .filter(c => c.motherId === wifeId)
    .reduce((s, c) => s + sumExpenses(c.expenses) + (c.monthlyFee || 0), 0);
  return wifeSpend + (wife.monthlyAllowance || 0) + childSpend;
};

export const loanOutstanding = (loan: { amount: number; payments: { amount: number }[] }) =>
  Math.max(0, loan.amount - loan.payments.reduce((s, p) => s + p.amount, 0));

export const calcZakat = (totalWealth: number) => +(totalWealth * 0.025).toFixed(2);

// ---------- Group expense split logic ----------

export const computeSplits = (
  amount: number,
  members: { id: string }[],
  mode: GroupExpense["splitMode"],
  custom?: { memberId: string; value: number }[]
): { memberId: string; share: number }[] => {
  if (mode === "equal") {
    const per = +(amount / members.length).toFixed(2);
    return members.map(m => ({ memberId: m.id, share: per }));
  }
  if (mode === "unequal") {
    return (custom || []).map(c => ({ memberId: c.memberId, share: +c.value.toFixed(2) }));
  }
  if (mode === "percentage") {
    return (custom || []).map(c => ({ memberId: c.memberId, share: +((amount * c.value) / 100).toFixed(2) }));
  }
  // shares
  const totalShares = (custom || []).reduce((s, c) => s + c.value, 0) || 1;
  return (custom || []).map(c => ({ memberId: c.memberId, share: +((amount * c.value) / totalShares).toFixed(2) }));
};

// Net balance per member: positive = they are owed money; negative = they owe money
export const computeBalances = (group: ExpenseGroup): Record<string, number> => {
  const bal: Record<string, number> = {};
  group.members.forEach(m => (bal[m.id] = 0));
  for (const e of group.expenses) {
    bal[e.payerId] = (bal[e.payerId] || 0) + e.amount;
    for (const s of e.splits) {
      bal[s.memberId] = (bal[s.memberId] || 0) - s.share;
    }
  }
  for (const s of group.settlements) {
    bal[s.fromId] = (bal[s.fromId] || 0) + s.amount; // payer reduces their debt
    bal[s.toId] = (bal[s.toId] || 0) - s.amount;
  }
  Object.keys(bal).forEach(k => (bal[k] = +bal[k].toFixed(2)));
  return bal;
};

// Greedy debt simplification: returns minimal transactions
export const simplifyDebts = (
  balances: Record<string, number>
): { fromId: string; toId: string; amount: number }[] => {
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];
  Object.entries(balances).forEach(([id, amt]) => {
    if (amt > 0.01) creditors.push({ id, amt });
    else if (amt < -0.01) debtors.push({ id, amt: -amt });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const result: { fromId: string; toId: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    result.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: +pay.toFixed(2) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return result;
};

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
