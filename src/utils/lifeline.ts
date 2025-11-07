import { LifelineSettings, Transaction, LifelineData, LifelineStats, TaxPayment } from "@/types/lifeline";
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
    taxPayments: [],
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

export const getUSDToCADRate = async (): Promise<number> => {
  const data = getLifelineData();
  const now = new Date();
  
  // Check if we have a cached rate from today
  if (data?.cachedExchangeRate && data.lastExchangeRateUpdate) {
    const lastUpdate = new Date(data.lastExchangeRateUpdate);
    const isSameDay = lastUpdate.toDateString() === now.toDateString();
    if (isSameDay) {
      return data.cachedExchangeRate;
    }
  }
  
  try {
    // Using a free exchange rate API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const rates = await response.json();
    const cadRate = rates.rates.CAD;
    
    // Cache the rate
    if (data) {
      data.cachedExchangeRate = cadRate;
      data.lastExchangeRateUpdate = now.toISOString();
      saveLifelineData(data);
    }
    
    return cadRate;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    // Fallback to a default rate if API fails
    return data?.cachedExchangeRate || 1.35;
  }
};

export const calculateTaxOwed = (data: LifelineData, trades: TradeEntry[], exchangeRate: number): number => {
  const TAX_RATE = 0.30; // 30% Canadian tax
  
  // Ensure taxPayments exists
  const taxPayments = data.taxPayments || [];
  
  // Get untaxed trade earnings (trades are in USD, convert to CAD)
  const untaxedTradeEarnings = trades
    .filter(trade => {
      // Check if this trade has been taxed
      const hasTaxPayment = taxPayments.some(payment => 
        payment.earningsIds.includes(`trade-${trade.id}`)
      );
      return !hasTaxPayment && trade.profit.amount > 0;
    })
    .reduce((sum, trade) => sum + (trade.profit.amount * exchangeRate), 0); // Convert USD to CAD
  
  // Get untaxed manual earnings (already in CAD)
  const untaxedManualEarnings = data.transactions
    .filter(t => t.type === "earning" && !t.taxed)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalUntaxedEarningsCAD = untaxedTradeEarnings + untaxedManualEarnings;
  return totalUntaxedEarningsCAD * TAX_RATE;
};

export const payTax = async (
  trades: TradeEntry[],
  exchangeRate: number
): Promise<void> => {
  const data = getLifelineData();
  if (!data) return;
  
  // Initialize taxPayments if it doesn't exist
  if (!data.taxPayments) {
    data.taxPayments = [];
  }
  
  const taxAmountCAD = calculateTaxOwed(data, trades, exchangeRate);
  if (taxAmountCAD <= 0) return;
  
  const taxAmountUSD = taxAmountCAD / exchangeRate;
  
  // Get IDs of earnings being taxed
  const earningsIds: string[] = [];
  
  // Mark trades as taxed
  trades.forEach(trade => {
    const hasTaxPayment = data.taxPayments.some(payment => 
      payment.earningsIds.includes(`trade-${trade.id}`)
    );
    if (!hasTaxPayment && trade.profit.amount > 0) {
      earningsIds.push(`trade-${trade.id}`);
    }
  });
  
  // Mark manual earnings as taxed
  data.transactions = data.transactions.map(t => {
    if (t.type === "earning" && !t.taxed) {
      earningsIds.push(t.id);
      return { ...t, taxed: true };
    }
    return t;
  });
  
  // Create tax payment record
  const taxPayment: TaxPayment = {
    id: crypto.randomUUID(),
    amount: taxAmountUSD,
    amountCAD: taxAmountCAD,
    exchangeRate,
    date: new Date().toISOString(),
    earningsIds,
  };
  
  data.taxPayments.push(taxPayment);
  
  // Add tax as expense transaction (in CAD)
  const taxTransaction: Transaction = {
    id: crypto.randomUUID(),
    amount: taxAmountCAD,
    amountUSD: taxAmountUSD,
    description: `Tax Payment (30% Canadian Tax)`,
    date: new Date().toISOString(),
    type: "tax",
    exchangeRate,
  };
  
  data.transactions.push(taxTransaction);
  saveLifelineData(data);
};

export const calculateLifelineStats = (
  data: LifelineData,
  trades: TradeEntry[],
  exchangeRate: number
): LifelineStats => {
  const { settings, transactions } = data;
  const { monthlyExpense, periodMonths, startDate } = settings;

  // Calculate total target for the period (in CAD)
  const totalTarget = monthlyExpense * periodMonths;
  
  // Calculate weekly target
  const weeksInPeriod = (periodMonths * 30.44) / 7; // Average days per month / 7
  const weeklyTarget = totalTarget / weeksInPeriod;

  // Calculate earnings from trades (convert USD to CAD)
  const tradeEarnings = trades.reduce((sum, trade) => sum + (trade.profit.amount * exchangeRate), 0);
  
  // Calculate earnings from manual transactions (already in CAD)
  const manualEarnings = transactions
    .filter((t) => t.type === "earning")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalEarned = tradeEarnings + manualEarnings;

  // Calculate total spent (including tax) - in CAD
  const totalSpent = transactions
    .filter((t) => t.type === "expense" || t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate total tax paid - in CAD
  const totalTaxPaid = transactions
    .filter((t) => t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate untaxed earnings in CAD
  const untaxedEarnings = calculateTaxOwed(data, trades, exchangeRate) / 0.30; // Reverse the 30% to get base amount

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
    totalTaxPaid,
    untaxedEarnings,
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
