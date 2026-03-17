import { LifelineSettings, Transaction, LifelineData, LifelineStats, TaxPayment } from "@/types/lifeline";

const LIFELINE_STORAGE_KEY = "forex-lifeline-data";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CAD: 1.35,
  PKR: 278,
  AED: 3.67,
  SAR: 3.75,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83,
};

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

export const getExchangeRate = async (targetCurrency: string): Promise<number> => {
  if (targetCurrency === "USD") return 1;

  const data = getLifelineData();
  const now = new Date();
  
  // Check if we have a cached rate from today for this currency
  if (data?.cachedExchangeRate && data.lastExchangeRateUpdate && data.settings.currency === targetCurrency) {
    const lastUpdate = new Date(data.lastExchangeRateUpdate);
    const isSameDay = lastUpdate.toDateString() === now.toDateString();
    if (isSameDay) {
      return data.cachedExchangeRate;
    }
  }
  
  try {
    // Using a free exchange rate API
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    const rates = await response.json();
    const rate = rates.rates[targetCurrency];
    
    if (!rate) throw new Error(`Rate for ${targetCurrency} not found`);

    // Cache the rate
    if (data) {
      data.cachedExchangeRate = rate;
      data.lastExchangeRateUpdate = now.toISOString();
      saveLifelineData(data);
    }
    
    return rate;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    // Fallback to cached rate only if it matches the target currency
    if (data?.cachedExchangeRate && data.settings.currency === targetCurrency) {
      return data.cachedExchangeRate;
    }
    
    // Check fallback rates
    if (FALLBACK_RATES[targetCurrency]) {
      return FALLBACK_RATES[targetCurrency];
    }

    return 1;
  }
};

export const calculateTaxOwed = (data: LifelineData, exchangeRate: number, overrideTaxRate?: number): number => {
  const TAX_RATE = overrideTaxRate !== undefined ? (overrideTaxRate / 100) : (data.settings.taxRate || 30) / 100;
  
  // Get untaxed manual earnings (already in local currency)
  const untaxedManualEarnings = data.transactions
    .filter(t => t.type === "earning" && !t.taxed)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalUntaxedEarningsLocal = untaxedManualEarnings;
  return totalUntaxedEarningsLocal * TAX_RATE;
};

export const payTax = async (
  exchangeRate: number,
  liveTaxRate?: number
): Promise<void> => {
  const data = getLifelineData();
  if (!data) return;
  
  // Initialize taxPayments if it doesn't exist
  if (!data.taxPayments) {
    data.taxPayments = [];
  }
  
  const taxAmountLocal = calculateTaxOwed(data, exchangeRate, liveTaxRate);
  if (taxAmountLocal <= 0) return;
  
  const taxAmountUSD = taxAmountLocal / exchangeRate;
  
  // Get IDs of earnings being taxed
  const earningsIds: string[] = [];
  
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
    amountLocal: taxAmountLocal,
    exchangeRate,
    date: new Date().toISOString(),
    earningsIds,
  };
  
  data.taxPayments.push(taxPayment);
  
  // Add tax as expense transaction (in local currency)
  const taxTransaction: Transaction = {
    id: crypto.randomUUID(),
    amount: taxAmountLocal,
    amountUSD: taxAmountUSD,
    description: `Tax Payment (${data.settings.taxRate}% Tax)`,
    date: new Date().toISOString(),
    type: "tax",
    exchangeRate,
  };
  
  data.transactions.push(taxTransaction);
  saveLifelineData(data);
};

export const calculateLifelineStats = (
  data: LifelineData,
  exchangeRate: number
): LifelineStats => {
  const { settings, transactions } = data;
  const { monthlyExpense, periodMonths, startDate, taxRate } = settings;
  const TAX_RATE = (taxRate || 30) / 100;

  // Calculate total target for the period (in local currency)
  const totalTarget = monthlyExpense * periodMonths;
  
  // Calculate weekly target
  const weeksInPeriod = (periodMonths * 30.44) / 7; // Average days per month / 7
  const weeklyTarget = totalTarget / weeksInPeriod;

  // Calculate earnings from manual transactions (already in local currency)
  const manualEarnings = transactions
    .filter((t) => t.type === "earning")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalEarned = manualEarnings;

  // Calculate total spent (including tax) - in local currency
  const totalSpent = transactions
    .filter((t) => t.type === "expense" || t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate total tax paid - in local currency
  const totalTaxPaid = transactions
    .filter((t) => t.type === "tax")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate untaxed earnings in local currency
  const untaxedEarnings = calculateTaxOwed(data, exchangeRate) / TAX_RATE; // Reverse the tax rate to get base amount

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
