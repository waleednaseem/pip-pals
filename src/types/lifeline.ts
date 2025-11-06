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
  type: "expense" | "earning";
}

export interface LifelineData {
  settings: LifelineSettings;
  transactions: Transaction[];
}

export interface LifelineStats {
  totalTarget: number;
  weeklyTarget: number;
  totalEarned: number;
  totalSpent: number;
  remaining: number;
  progressPercent: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  weeksRemaining: number;
}
