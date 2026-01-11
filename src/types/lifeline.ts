export interface ExternalCountryBudget {
  country: string;
  monthlyBudget: number; // Monthly budget in PRIMARY currency (e.g., CAD)
}

export interface LifelineSettings {
  monthlyExpense: number; // Monthly expense in selected currency
  currency: string; // Selected currency (e.g., CAD, PKR, EUR)
  country: string; // Selected country (e.g., canada, usa, pakistan)
  taxRate: number; // Tax rate percentage (e.g., 30 for 30%)
  startDate: string;
  periodMonths: number; // 1 for monthly, 6 for 6-month tracking
  externalCountries?: string[]; // Additional countries for expense tracking (e.g., ["pakistan", "uae"])
  externalCountryBudgets?: ExternalCountryBudget[]; // Monthly budgets for external countries in PRIMARY currency
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
  lastExchangeRateUpdate?: string;
  cachedExchangeRate?: number;
  externalCountryData?: ExternalCountryData[];
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
