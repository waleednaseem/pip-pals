export interface LifelineSettings {
  monthlyExpense: number;
  currency: string;
  startDate: string;
  periodMonths: number; // 1 for monthly, 6 for 6-month tracking
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: "expense" | "earning" | "tax";
  taxed?: boolean; // For earnings, tracks if tax has been paid
}

export interface TaxPayment {
  id: string;
  amount: number;
  amountCAD: number;
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
