// Family & Loans & Zakat data model — all amounts in primary currency (from Lifeline settings)

export type RecurrenceFreq = "weekly" | "monthly" | "yearly";

export interface ExpenseEntry {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO
  paid?: boolean;
  paidAmount?: number;       // for partial payments
  recurring?: boolean;
  recurrenceFreq?: RecurrenceFreq;
  nextDueDate?: string;      // ISO — next auto-generation date
  parentRecurringId?: string; // if generated from a template
  hidden?: boolean;          // ghosted — visible but excluded from calculations
  // Linkage so notifications can deep-link
  ownerType?: "wife" | "child" | "parent" | "sibling" | "household";
  ownerId?: string;
}

// ---------------- Rates / Prices Catalog ----------------

export interface RateCategory {
  id: string;
  name: string;          // e.g. "School Fees", "Eid Clothes"
  defaultAmount: number; // current default rate
  scope: "wife" | "child" | "household" | "any";
  icon?: string;         // emoji
  recurring?: boolean;
  recurrenceFreq?: RecurrenceFreq;
  notes?: string;
}

export interface RatesCatalog {
  categories: RateCategory[];
}

// ---------------- Notifications ----------------

export type NotificationType = "payment" | "event" | "reminder" | "recurring" | "responsibility";
export type NotificationPriority = "high" | "medium" | "low";
export type NotificationStatus = "unread" | "read";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  dueDate?: string;        // ISO
  createdAt: string;       // ISO
  // Reference for click-through
  refType?: "wife" | "child" | "parent" | "sibling" | "household" | "loan" | "zakat" | "event" | "rate";
  refId?: string;
  // For dedupe — if same key already exists & unread, do not re-create
  dedupeKey?: string;
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
