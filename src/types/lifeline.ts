export interface LifelineSettings {
  monthlyExpense: number; // Monthly expense in selected currency
  currency: string; // Selected currency (e.g., CAD, PKR, EUR)
  country: string; // Selected country (e.g., canada, usa, pakistan)
  taxRate: number; // Tax rate percentage (e.g., 30 for 30%)
  startDate: string;
  periodMonths: number; // 1 for monthly, 6 for 6-month tracking
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
}

export interface TaxPayment {
  id: string;
  amount: number; // Tax amount in USD (if applicable/tracked)
  amountLocal: number; // Tax amount in local currency
  exchangeRate: number;
  date: string;
  earningsIds: string[]; // Track which earnings were taxed
}

export interface LifelineData {
  settings: LifelineSettings;
  transactions: Transaction[];
  taxPayments: TaxPayment[];
  lastExchangeRateUpdate?: string;
  cachedExchangeRate?: number;
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
