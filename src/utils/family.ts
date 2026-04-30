import {
  FamilyData, GroupExpensesData, ExpenseGroup, GroupExpense, GroupSettlement,
  RatesCatalog, RateCategory, AppNotification, ExpenseEntry,
} from "@/types/family";

const FAMILY_KEY = "family-data";
const GROUP_KEY = "group-expenses-data";
const RATES_KEY = "family-rates-catalog";
const NOTIF_KEY = "app-notifications";

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

// ---------- Rates Catalog ----------

const DEFAULT_RATES: RateCategory[] = [
  { id: "r-school-fee", name: "School Fees", defaultAmount: 0, scope: "child", icon: "🎒", recurring: true, recurrenceFreq: "monthly" },
  { id: "r-uniform", name: "Uniform & Accessories", defaultAmount: 0, scope: "child", icon: "👕" },
  { id: "r-books", name: "Books & Stationery", defaultAmount: 0, scope: "child", icon: "📚" },
  { id: "r-tuition", name: "Tuition", defaultAmount: 0, scope: "child", icon: "✏️", recurring: true, recurrenceFreq: "monthly" },
  { id: "r-medical-c", name: "Child Medical", defaultAmount: 0, scope: "child", icon: "💊" },
  { id: "r-toys", name: "Toys & Outing", defaultAmount: 0, scope: "child", icon: "🎁" },
  { id: "r-clothes-w", name: "Wife Clothing", defaultAmount: 0, scope: "wife", icon: "👗" },
  { id: "r-jewellery", name: "Jewellery", defaultAmount: 0, scope: "wife", icon: "💍" },
  { id: "r-medical-w", name: "Wife Medical", defaultAmount: 0, scope: "wife", icon: "🏥" },
  { id: "r-beauty", name: "Beauty / Salon", defaultAmount: 0, scope: "wife", icon: "💄" },
  { id: "r-allowance", name: "Monthly Allowance", defaultAmount: 0, scope: "wife", icon: "💵", recurring: true, recurrenceFreq: "monthly" },
  { id: "r-grocery", name: "Grocery", defaultAmount: 0, scope: "household", icon: "🛒", recurring: true, recurrenceFreq: "weekly" },
  { id: "r-utilities", name: "Utilities", defaultAmount: 0, scope: "household", icon: "💡", recurring: true, recurrenceFreq: "monthly" },
];

export const getRatesCatalog = (): RatesCatalog => {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return { categories: DEFAULT_RATES };
    const parsed = JSON.parse(raw);
    return { categories: parsed.categories?.length ? parsed.categories : DEFAULT_RATES };
  } catch {
    return { categories: DEFAULT_RATES };
  }
};

export const saveRatesCatalog = (data: RatesCatalog) => {
  localStorage.setItem(RATES_KEY, JSON.stringify(data));
};

// ---------- Notifications ----------

export const getNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveNotifications = (list: AppNotification[]) => {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
};

export const addNotification = (n: Omit<AppNotification, "id" | "createdAt" | "status">) => {
  const list = getNotifications();
  if (n.dedupeKey && list.some(x => x.dedupeKey === n.dedupeKey && x.status === "unread")) return;
  const next: AppNotification = {
    ...n,
    id: uid(),
    createdAt: new Date().toISOString(),
    status: "unread",
  };
  saveNotifications([next, ...list].slice(0, 200));
};

// ---------- Recurring & Notification Generator ----------

const addInterval = (iso: string, freq: "weekly" | "monthly" | "yearly"): string => {
  const d = new Date(iso);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
};

const isDue = (iso?: string) => !!iso && new Date(iso).getTime() <= Date.now();

const processOwnerExpenses = (
  list: ExpenseEntry[],
  ownerType: NonNullable<ExpenseEntry["ownerType"]>,
  ownerId: string,
  ownerName: string,
): { next: ExpenseEntry[]; created: number } => {
  let created = 0;
  const next: ExpenseEntry[] = [];
  for (const e of list) {
    if (e.recurring && e.recurrenceFreq && !e.parentRecurringId) {
      let due = e.nextDueDate || addInterval(e.date, e.recurrenceFreq);
      let cursor = due;
      const generated: ExpenseEntry[] = [];
      let safety = 0;
      while (isDue(cursor) && safety < 24) {
        generated.push({
          id: uid(),
          amount: e.amount,
          category: e.category,
          description: e.description,
          date: cursor,
          paid: false,
          parentRecurringId: e.id,
          ownerType, ownerId,
        });
        addNotification({
          title: `Recurring: ${e.description}`,
          description: `${ownerName} — ${e.category} (${new Date(cursor).toLocaleDateString()})`,
          type: "recurring",
          priority: "medium",
          dueDate: cursor,
          refType: ownerType,
          refId: ownerId,
          dedupeKey: `rec-${e.id}-${cursor.slice(0, 10)}`,
        });
        cursor = addInterval(cursor, e.recurrenceFreq);
        safety++;
      }
      created += generated.length;
      next.push({ ...e, nextDueDate: cursor }, ...generated);
    } else {
      next.push(e);
    }

    // Overdue notification (>7 days since date, still unpaid, not a template)
    if (!e.paid && !e.recurring && e.amount > 0) {
      const ageDays = (Date.now() - new Date(e.date).getTime()) / 86400000;
      if (ageDays > 7) {
        addNotification({
          title: "Overdue payment",
          description: `${ownerName} — ${e.description} (${e.amount.toFixed(2)})`,
          type: "payment",
          priority: "high",
          dueDate: e.date,
          refType: ownerType,
          refId: ownerId,
          dedupeKey: `overdue-${e.id}`,
        });
      }
    }
  }
  return { next, created };
};

/** Run on app open. Generates due recurring expenses + smart notifications. */
export const runRecurringEngine = () => {
  const data = getFamilyData();
  let changed = false;

  data.wives = data.wives.map(w => {
    const { next, created } = processOwnerExpenses(w.expenses, "wife", w.id, w.name);
    if (created > 0) changed = true;
    return { ...w, expenses: next };
  });
  data.children = data.children.map(c => {
    const { next, created } = processOwnerExpenses(c.expenses, "child", c.id, c.name);
    if (created > 0) changed = true;
    return { ...c, expenses: next };
  });
  data.parents = data.parents.map(p => {
    const { next, created } = processOwnerExpenses(p.expenses, "parent", p.id, p.name);
    if (created > 0) changed = true;
    return { ...p, expenses: next };
  });
  data.siblings = data.siblings.map(s => {
    const { next, created } = processOwnerExpenses(s.expenses, "sibling", s.id, s.name);
    if (created > 0) changed = true;
    return { ...s, expenses: next };
  });

  // Birthdays for children & wives (next 7 days)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = (dob?: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    const nx = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (nx < today) nx.setFullYear(today.getFullYear() + 1);
    const days = Math.round((nx.getTime() - today.getTime()) / 86400000);
    return days <= 7 ? { days, next: nx } : null;
  };
  data.children.forEach(c => {
    const u = upcoming(c.dob);
    if (u) addNotification({
      title: `🎂 ${c.name}'s birthday in ${u.days} days`,
      description: `Plan a gift / event for ${c.name}`,
      type: "event", priority: u.days <= 2 ? "high" : "medium",
      dueDate: u.next.toISOString(),
      refType: "child", refId: c.id,
      dedupeKey: `bday-child-${c.id}-${u.next.getFullYear()}`,
    });
  });

  // Loan due reminders
  data.loans.filter(l => l.status === "active" && l.dueDate).forEach(l => {
    const days = (new Date(l.dueDate!).getTime() - Date.now()) / 86400000;
    if (days <= 7 && days >= -30) {
      addNotification({
        title: days < 0 ? `Loan overdue: ${l.counterparty}` : `Loan due in ${Math.ceil(days)} days`,
        description: `${l.type === "borrowed" ? "You owe" : "Owed to you"}: ${l.counterparty}`,
        type: "payment", priority: days < 0 ? "high" : "medium",
        dueDate: l.dueDate, refType: "loan", refId: l.id,
        dedupeKey: `loan-${l.id}-${l.dueDate?.slice(0, 10)}`,
      });
    }
  });

  if (changed) saveFamilyData(data);
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
