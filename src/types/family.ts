// Family & Loans & Zakat data model — all amounts in primary currency (from Lifeline settings)

export interface ExpenseEntry {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO
  paid?: boolean;
  recurring?: boolean; // if true, treated as monthly
}

export interface Wife {
  id: string;
  name: string;
  marriageDate?: string;
  mahrTotal?: number;
  mahrPaid?: number;
  monthlyAllowance?: number;
  walletBalance?: number; // current funds you have allocated to her
  notes?: string;
  expenses: ExpenseEntry[];
}

export interface Child {
  id: string;
  motherId: string; // Wife.id
  name: string;
  dob?: string;
  gender?: "male" | "female";
  schoolName?: string;
  schoolClass?: string;
  monthlyFee?: number;
  notes?: string;
  expenses: ExpenseEntry[];
}

export interface Parent {
  id: string;
  name: string;
  relation: "father" | "mother";
  monthlyAllowance?: number;
  notes?: string;
  expenses: ExpenseEntry[];
}

export interface Sibling {
  id: string;
  name: string;
  relation: "brother" | "sister";
  monthlyAllowance?: number;
  notes?: string;
  expenses: ExpenseEntry[];
}

export interface HouseholdExpense {
  id: string;
  category: "grocery" | "utilities" | "rent" | "staff" | "maintenance" | "vehicle" | "other";
  label: string;
  amount: number;
  date: string;
  recurring?: boolean;
  paid?: boolean;
  notes?: string;
}

export interface FamilyEvent {
  id: string;
  title: string;
  date: string;
  amount: number;
  assignedTo?: { type: "wife" | "child" | "parent" | "sibling" | "household"; id?: string };
  notes?: string;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Loan {
  id: string;
  type: "borrowed" | "lent"; // borrowed = I owe; lent = owed to me
  counterparty: string;
  amount: number;
  date: string;
  dueDate?: string;
  note?: string;
  payments: LoanPayment[];
  status: "active" | "settled" | "written-off";
}

export interface ZakatRecord {
  id: string;
  date: string;
  totalWealth: number;
  zakatDue: number; // 2.5%
  paid: boolean;
  paidDate?: string;
  note?: string;
}

export interface FamilyData {
  wives: Wife[];
  children: Child[];
  parents: Parent[];
  siblings: Sibling[];
  household: HouseholdExpense[];
  events: FamilyEvent[];
  loans: Loan[];
  zakat: ZakatRecord[];
}

// ---------------- Group Expenses (Splitwise-style) ----------------

export interface GroupMember {
  id: string;
  name: string;
}

export interface GroupExpenseSplit {
  memberId: string;
  share: number; // amount this member owes for this expense
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  date: string;
  category?: string;
  splitMode: "equal" | "unequal" | "percentage" | "shares";
  splits: GroupExpenseSplit[];
}

export interface GroupSettlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  members: GroupMember[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
}

export interface GroupExpensesData {
  groups: ExpenseGroup[];
}
