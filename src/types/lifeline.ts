export interface ExternalCountryBudget {
  country: string;
  monthlyBudget: number; // Monthly budget in PRIMARY currency (e.g., CAD)
}

export type RecurringFreq = "weekly" | "monthly";

export interface LifelineRecurringExpense {
  id: string;
  amount: number;
  description: string;
  frequency: RecurringFreq;
  nextDueDate: string; // ISO
  active: boolean;
  createdAt: string;
}

export interface LifelineSettings {
  monthlyExpense: number; // Monthly expense target in selected currency
  monthlyIncome?: number; // Expected monthly income (used for tax bracket estimate)
  currency: string; // Selected currency (e.g., CAD, PKR, EUR)
  country: string; // Selected country (e.g., canada, usa, pakistan)
  taxRate: number; // Tax rate percentage (e.g., 30 for 30%)
  startDate: string;
  periodMonths: number; // 1 for monthly, 6 for 6-month tracking
  externalCountries?: string[]; // Additional countries for expense tracking (e.g., ["pakistan", "uae"])
  externalCountryBudgets?: ExternalCountryBudget[]; // Monthly budgets for external countries in PRIMARY currency
  autoSyncFamily?: boolean; // Auto-pull family expenses into Lifeline
}

export interface Transaction {
  id: string;
  amount: number; // Amount in selected currency
  amountUSD?: number; // Original USD amount if converted
  description: string;
  date: string;
  type: "expense" | "earning" | "tax";
  taxed?: boolean; // For earnings, tracks if tax has been paid
  exchangeRate?: number; // Exchange rate used for conversion
  country?: string; // Country for this transaction (main or external)
  isExternalExpense?: boolean; // If true, this is a mirror of an external country expense
  linkedTransactionId?: string; // Links mirrored main↔external transactions for safe deletes
  /** Origin markers for sync / recurring */
  source?: "manual" | "family" | "recurring";
  familyExpenseId?: string; // Dedupes family → lifeline sync
  recurringId?: string; // Parent recurring template id
}

export interface TaxPayment {
  id: string;
  amount: number; // Tax amount in USD (if applicable/tracked)
  amountLocal: number; // Tax amount in local currency
  exchangeRate: number;
  date: string;
  earningsIds: string[]; // Track which earnings were taxed
}

export interface ExternalCountryData {
  country: string;
  currency: string;
  transactions: Transaction[]; // All amounts stored in PRIMARY currency
  exchangeRate: number; // Rate from USD to this local currency (for display)
  monthlyBudget: number; // Monthly budget in PRIMARY currency
}

export interface LifelineData {
  settings: LifelineSettings;
  transactions: Transaction[];
  taxPayments: TaxPayment[];
  recurringExpenses?: LifelineRecurringExpense[];
  lastExchangeRateUpdate?: string;
  cachedExchangeRate?: number;
  externalCountryData?: ExternalCountryData[];
  lastFamilySyncAt?: string;
}

export interface LifelineStats {
  totalTarget: number;
  weeklyTarget: number;
  totalEarned: number;
  totalSpent: number;
  totalTaxPaid: number;
  untaxedEarnings: number;
  remaining: number;
  progressPercent: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  weeksRemaining: number;
}

export interface LifelineBackupPayload {
  version: 1;
  exportedAt: string;
  lifeline: LifelineData;
  family?: unknown;
  notifications?: unknown;
  ratesCatalog?: unknown;
}
