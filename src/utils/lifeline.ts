import { LifelineSettings, Transaction, LifelineData, LifelineStats } from "@/types/lifeline";
import { TradeEntry } from "@/types/calculator";

const LIFELINE_STORAGE_KEY = "forex-lifeline-data";

export const getLifelineData = (): LifelineData | null => {
  const stored = localStorage.getItem(LIFELINE_STORAGE_KEY);
  if (!stored) return null;
  return JSON.parse(stored);
};

export const saveLifelineData = (data: LifelineData): void => {
  localStorage.setItem(LIFELINE_STORAGE_KEY, JSON.stringify(data));
};

export const initializeLifeline = (settings: LifelineSettings): void => {
  const data: LifelineData = {
    settings,
    transactions: [],
  };
  saveLifelineData(data);
};

export const addTransaction = (transaction: Transaction): void => {
  const data = getLifelineData();
  if (!data) return;
  
  data.transactions.push(transaction);
  saveLifelineData(data);
};

export const deleteTransaction = (id: string): void => {
  const data = getLifelineData();
  if (!data) return;
  
  data.transactions = data.transactions.filter((t) => t.id !== id);
  saveLifelineData(data);
};

export const calculateLifelineStats = (
  data: LifelineData,
  trades: TradeEntry[]
): LifelineStats => {
  const { settings, transactions } = data;
  const { monthlyExpense, periodMonths, startDate } = settings;

  // Calculate total target for the period
  const totalTarget = monthlyExpense * periodMonths;
  
  // Calculate weekly target
  const weeksInPeriod = (periodMonths * 30.44) / 7; // Average days per month / 7
  const weeklyTarget = totalTarget / weeksInPeriod;

  // Calculate earnings from trades
  const tradeEarnings = trades.reduce((sum, trade) => sum + trade.profit.amount, 0);
  
  // Calculate earnings from manual transactions
  const manualEarnings = transactions
    .filter((t) => t.type === "earning")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalEarned = tradeEarnings + manualEarnings;

  // Calculate total spent
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate remaining quota
  const remaining = totalEarned - totalSpent;

  // Calculate progress percentage
  const progressPercent = Math.min((remaining / totalTarget) * 100, 100);

  // Calculate time tracking
  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysTotal = Math.floor(periodMonths * 30.44);
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  return {
    totalTarget,
    weeklyTarget,
    totalEarned,
    totalSpent,
    remaining,
    progressPercent,
    daysElapsed,
    daysTotal,
    daysRemaining,
    weeksRemaining,
  };
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${currency} ${amount.toFixed(2)}`;
};
