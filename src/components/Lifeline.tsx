import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, PlusCircle, Trash2, TrendingUp, TrendingDown, Target, Calendar, DollarSign, AlertCircle, Settings2, Download, Globe, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import jsPDF from "jspdf";
import { LifelineData, Transaction, LifelineStats, ExternalCountryData } from "@/types/lifeline";
import {
  getLifelineData,
  initializeLifeline,
  addTransaction,
  deleteTransaction,
  calculateLifelineStats,
  formatCurrency,
  getExchangeRate,
  calculateTaxOwed,
  payTax,
  saveLifelineData,
} from "@/utils/lifeline";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

// Country tax configurations
const COUNTRY_TAX_CONFIG = {
  canada: {
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    brackets: [
      { min: 0, max: 57375, rate: 15, label: "15% (Up to $57,375)" },
      { min: 57375, max: 114750, rate: 20.5, label: "20.5% ($57,375 - $114,750)" },
      { min: 114750, max: 177882, rate: 26, label: "26% ($114,750 - $177,882)" },
      { min: 177882, max: 253414, rate: 29, label: "29% ($177,882 - $253,414)" },
      { min: 253414, max: Infinity, rate: 33, label: "33% (Above $253,414)" },
    ],
    description: "Federal income tax brackets (2025). Provincial taxes may apply additionally.",
  },
  usa: {
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    brackets: [
      { min: 0, max: 11600, rate: 10, label: "10% (Up to $11,600)" },
      { min: 11600, max: 47150, rate: 12, label: "12% ($11,600 - $47,150)" },
      { min: 47150, max: 100525, rate: 22, label: "22% ($47,150 - $100,525)" },
      { min: 100525, max: 191950, rate: 24, label: "24% ($100,525 - $191,950)" },
      { min: 191950, max: 243725, rate: 32, label: "32% ($191,950 - $243,725)" },
      { min: 243725, max: 609350, rate: 35, label: "35% ($243,725 - $609,350)" },
      { min: 609350, max: Infinity, rate: 37, label: "37% (Above $609,350)" },
    ],
    description: "Federal income tax brackets (2024). State taxes may apply additionally.",
  },
  pakistan: {
    name: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
    brackets: [
      { min: 0, max: 600000, rate: 0, label: "0% (Up to PKR 600,000)" },
      { min: 600000, max: 1200000, rate: 2.5, label: "2.5% (PKR 600,000 - 1,200,000)" },
      { min: 1200000, max: 2400000, rate: 12.5, label: "12.5% (PKR 1,200,000 - 2,400,000)" },
      { min: 2400000, max: 3600000, rate: 22.5, label: "22.5% (PKR 2,400,000 - 3,600,000)" },
      { min: 3600000, max: 6000000, rate: 27.5, label: "27.5% (PKR 3,600,000 - 6,000,000)" },
      { min: 6000000, max: Infinity, rate: 35, label: "35% (Above PKR 6,000,000)" },
    ],
    description: "Pakistan Income Tax rates for salaried individuals (FY 2024-25).",
  },
  uae: {
    name: "UAE",
    flag: "🇦🇪",
    currency: "AED",
    brackets: [
      { min: 0, max: Infinity, rate: 0, label: "0% - No Personal Income Tax" },
    ],
    description: "UAE has no personal income tax. Corporate tax of 9% applies for businesses earning above AED 375,000.",
  },
  ksa: {
    name: "Saudi Arabia",
    flag: "🇸🇦",
    currency: "SAR",
    brackets: [
      { min: 0, max: Infinity, rate: 0, label: "0% - No Personal Income Tax" },
    ],
    description: "Saudi Arabia has no personal income tax for individuals. Zakat (2.5%) applies to Saudi nationals and GCC citizens on certain assets.",
  },
};

type CountryKey = keyof typeof COUNTRY_TAX_CONFIG;

// Pie chart colors
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// Helper function to calculate tax bracket based on income
const calculateTaxBracket = (yearlyIncome: number, countryKey: CountryKey) => {
  const countryConfig = COUNTRY_TAX_CONFIG[countryKey];
  const brackets = countryConfig.brackets;
  
  const bracket = brackets.find(b => yearlyIncome >= b.min && yearlyIncome < b.max);
  const rate = bracket ? bracket.rate : brackets[brackets.length - 1].rate;
  return { 
    rate, 
    bracket: bracket || brackets[brackets.length - 1]
  };
};

interface LifelineProps {}

export const Lifeline = ({}: LifelineProps) => {
  const [data, setData] = useState<LifelineData | null>(null);
  const [stats, setStats] = useState<LifelineStats | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1.35);
  const [externalRates, setExternalRates] = useState<Record<string, number>>({});
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const { toast } = useToast();

  // Setup form states
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>("canada");
  const [periodMonths, setPeriodMonths] = useState("1");
  const [selectedExternalCountries, setSelectedExternalCountries] = useState<CountryKey[]>([]);
  const [externalBudgets, setExternalBudgets] = useState<Record<string, string>>({});

  // Transaction form states
  const [transAmount, setTransAmount] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transType, setTransType] = useState<"expense" | "earning">("expense");

  // External country transaction states
  const [extTransAmount, setExtTransAmount] = useState("");
  const [extTransDescription, setExtTransDescription] = useState("");
  const [extTransType, setExtTransType] = useState<"expense" | "earning">("expense");
  const [inputCurrencyMode, setInputCurrencyMode] = useState<"primary" | "local">("primary");
  const [activeExternalTab, setActiveExternalTab] = useState<string>("");
  const [fundAmount, setFundAmount] = useState("");

  // Derived values
  const countryConfig = COUNTRY_TAX_CONFIG[selectedCountry];
  const currency = countryConfig.currency;

  // Get available external countries (exclude selected main country)
  const availableExternalCountries = useMemo(() => {
    return Object.entries(COUNTRY_TAX_CONFIG)
      .filter(([key]) => key !== selectedCountry)
      .map(([key, config]) => ({ key: key as CountryKey, ...config }));
  }, [selectedCountry]);

  // Calculate effective tax rate based on yearly income and country (for setup)
  const { calculatedTaxRate, applicableBracket } = useMemo(() => {
    if (!monthlyExpense || parseFloat(monthlyExpense) <= 0) {
      return { calculatedTaxRate: 0, applicableBracket: null };
    }
    const yearlyIncome = parseFloat(monthlyExpense) * 12;
    const { rate, bracket } = calculateTaxBracket(yearlyIncome, selectedCountry);
    return { 
      calculatedTaxRate: rate, 
      applicableBracket: bracket
    };
  }, [monthlyExpense, selectedCountry]);

  // Calculate yearly income for display in setup
  const yearlyIncome = useMemo(() => {
    if (!monthlyExpense || parseFloat(monthlyExpense) <= 0) return 0;
    return parseFloat(monthlyExpense) * 12;
  }, [monthlyExpense]);

  // Calculate LIVE tax bracket based on actual earnings (for dashboard)
  const liveTaxInfo = useMemo(() => {
    const defaultBracket = { min: 0, max: Infinity, rate: 0, label: "0%" };
    
    if (!data || !stats) {
      return {
        totalEarnings: 0,
        projectedYearlyIncome: 0,
        currentRate: 0,
        currentBracket: defaultBracket,
        projectedRate: 0,
        projectedBracket: defaultBracket,
        untaxedEarnings: 0,
        taxedEarnings: 0,
        taxOwed: 0,
      };
    }
    
    const countryKey = data.settings.country as CountryKey;
    const config = COUNTRY_TAX_CONFIG[countryKey];
    
    if (!config) {
      return {
        totalEarnings: stats.totalEarned,
        projectedYearlyIncome: 0,
        currentRate: 0,
        currentBracket: defaultBracket,
        projectedRate: 0,
        projectedBracket: defaultBracket,
        untaxedEarnings: 0,
        taxedEarnings: 0,
        taxOwed: 0,
      };
    }
    
    // Total earnings so far
    const totalEarnings = stats.totalEarned;
    
    // Annualize based on period
    const daysElapsed = Math.max(stats.daysElapsed, 1);
    const projectedYearlyIncome = (totalEarnings / daysElapsed) * 365;
    
    // Current tax bracket based on actual earnings
    const { rate: currentRate, bracket: currentBracket } = calculateTaxBracket(totalEarnings, countryKey);
    
    // Projected tax bracket based on annualized income
    const { rate: projectedRate, bracket: projectedBracket } = calculateTaxBracket(projectedYearlyIncome, countryKey);
    
    // Untaxed earnings and taxed earnings
    const untaxedEarnings = data.transactions
      .filter(t => t.type === "earning" && !t.taxed && (!t.country || t.country === countryKey))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const taxedEarnings = data.transactions
      .filter(t => t.type === "earning" && t.taxed && (!t.country || t.country === countryKey))
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate tax on untaxed earnings using current bracket rate
    const taxOwed = untaxedEarnings * (currentRate / 100);
    
    return {
      totalEarnings,
      projectedYearlyIncome,
      currentRate,
      currentBracket,
      projectedRate,
      projectedBracket,
      untaxedEarnings,
      taxedEarnings,
      taxOwed,
    };
  }, [data, stats]);

  // Calculate expense distribution by country for pie chart - ALL IN MAIN CURRENCY
  const expenseDistribution = useMemo(() => {
    if (!data) return [];

    const distribution: { name: string; value: number; flag: string }[] = [];
    
    // Main country expenses (already in main currency)
    const mainCountryKey = data.settings.country as CountryKey;
    const mainConfig = COUNTRY_TAX_CONFIG[mainCountryKey] || COUNTRY_TAX_CONFIG.canada;
    const mainExpenses = data.transactions
      .filter(t => {
        // Filter out explicit external expenses (new data)
        if (t.isExternalExpense) return false;

        // Filter out legacy external expenses based on flag in description (existing data)
        // Check if description starts with any external country flag
        const isLegacyExternal = Object.values(COUNTRY_TAX_CONFIG).some(config => 
          config.name !== mainConfig.name && t.description.startsWith(config.flag)
        );
        if (isLegacyExternal) return false;

        return (t.type === "expense" || t.type === "tax") && (!t.country || t.country === mainCountryKey);
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (mainExpenses > 0) {
      distribution.push({
        name: mainConfig.name,
        value: mainExpenses,
        flag: mainConfig.flag,
      });
    }

    // External country expenses - already stored in main currency
    if (data.externalCountryData) {
      data.externalCountryData.forEach(extData => {
        const extConfig = COUNTRY_TAX_CONFIG[extData.country as CountryKey];
        if (!extConfig) return;
        
        // Transactions are already in primary currency (CAD), no conversion needed
        const extExpenses = extData.transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);
        
        if (extExpenses > 0) {
          distribution.push({
            name: extConfig.name,
            value: extExpenses,
            flag: extConfig.flag,
          });
        }
      });
    }

    return distribution;
  }, [data, exchangeRate, externalRates]);

  // Calculate earnings by country - show in main currency for comparison
  const earningsDistribution = useMemo(() => {
    if (!data) return [];

    const distribution: { name: string; value: number; flag: string; originalValue?: number; originalCurrency?: string }[] = [];
    
    // Main country earnings (already in main currency)
    const mainCountryKey = data.settings.country as CountryKey;
    const mainConfig = COUNTRY_TAX_CONFIG[mainCountryKey] || COUNTRY_TAX_CONFIG.canada;
    const mainEarnings = data.transactions
      .filter(t => t.type === "earning" && (!t.country || t.country === mainCountryKey))
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (mainEarnings > 0) {
      distribution.push({
        name: mainConfig.name,
        value: mainEarnings,
        flag: mainConfig.flag,
      });
    }

    // External country earnings - convert to main currency for comparison
    if (data.externalCountryData) {
      data.externalCountryData.forEach(extData => {
        const extConfig = COUNTRY_TAX_CONFIG[extData.country as CountryKey];
        if (!extConfig) return;
        
        const extEarnings = extData.transactions
          .filter(t => t.type === "earning")
          .reduce((sum, t) => sum + t.amount, 0);
        
        if (extEarnings > 0) {
          // Convert to main currency for comparison
          const extRate = externalRates[extConfig.currency] || 1;
          const mainRate = exchangeRate;
          const earningsInMainCurrency = (extEarnings / extRate) * mainRate;
          
          distribution.push({
            name: extConfig.name,
            value: earningsInMainCurrency,
            flag: extConfig.flag,
            originalValue: extEarnings,
            originalCurrency: extConfig.currency,
          });
        }
      });
    }

    return distribution;
  }, [data, exchangeRate, externalRates]);

  useEffect(() => {
    loadData();
  }, []);

  const fetchExternalRates = async (countries: string[]) => {
    const rates: Record<string, number> = {};
    for (const country of countries) {
      const config = COUNTRY_TAX_CONFIG[country as CountryKey];
      if (config && config.currency !== "USD") {
        try {
          const rate = await getExchangeRate(config.currency);
          rates[config.currency] = rate;
        } catch (e) {
          console.error(`Failed to fetch rate for ${config.currency}`);
        }
      }
    }
    setExternalRates(rates);
  };

  const loadData = async () => {
    const lifelineData = getLifelineData();
    if (lifelineData) {
      setData(lifelineData);
      setIsSetup(true);
      const rate = await getExchangeRate(lifelineData.settings.currency);
      setExchangeRate(rate);
      const calculatedStats = calculateLifelineStats(lifelineData, rate);
      setStats(calculatedStats);

      // Load external rates
      if (lifelineData.settings.externalCountries?.length) {
        await fetchExternalRates(lifelineData.settings.externalCountries);
        setActiveExternalTab(lifelineData.settings.externalCountries[0]);
      }
    }
  };

  const handleSetup = () => {
    if (!monthlyExpense || parseFloat(monthlyExpense) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid monthly expense amount",
        variant: "destructive",
      });
      return;
    }

    // Validate external country budgets
    const externalCountryBudgets = selectedExternalCountries.map(country => ({
      country,
      monthlyBudget: parseFloat(externalBudgets[country] || "0"),
    }));

    const settings = {
      monthlyExpense: parseFloat(monthlyExpense),
      currency: currency,
      country: selectedCountry,
      startDate: new Date().toISOString(),
      periodMonths: parseInt(periodMonths),
      taxRate: calculatedTaxRate,
      externalCountries: selectedExternalCountries,
      externalCountryBudgets,
    };

    initializeLifeline(settings);
    
    // Initialize external country data
    if (selectedExternalCountries.length > 0) {
      const lifelineData = getLifelineData();
      if (lifelineData) {
        lifelineData.externalCountryData = selectedExternalCountries.map(country => ({
          country,
          currency: COUNTRY_TAX_CONFIG[country].currency,
          transactions: [],
          exchangeRate: 1,
          monthlyBudget: parseFloat(externalBudgets[country] || "0"),
        }));
        saveLifelineData(lifelineData);
        fetchExternalRates(selectedExternalCountries);
      }
    }
    
    loadData();
    
    toast({
      title: "Lifeline Activated",
      description: "Your earning targets have been set!",
    });
  };

  const handleAddTransaction = () => {
    if (!transAmount || parseFloat(transAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!transDescription.trim()) {
      toast({
        title: "Missing Description",
        description: "Please add a description",
        variant: "destructive",
      });
      return;
    }

    if (!data) return;

    // Input is always considered to be in the selected Local Currency
    let finalAmount = parseFloat(transAmount);
    let amountUSD: number | undefined = undefined;

    if (data.settings.currency !== "USD") {
      amountUSD = finalAmount / exchangeRate;
    } else {
      amountUSD = finalAmount;
    }

    const transaction: Transaction = {
      id: uuidv4(),
      amount: finalAmount,
      amountUSD: amountUSD,
      description: transDescription,
      date: new Date().toISOString(),
      type: transType,
      exchangeRate: data.settings.currency !== "USD" ? exchangeRate : undefined,
      country: data.settings.country,
    };

    addTransaction(transaction);
    loadData();
    
    setTransAmount("");
    setTransDescription("");
    
    toast({
      title: "Transaction Added",
      description: `${transType === "expense" ? "Expense" : "Earning"} recorded successfully`,
    });
  };

  const handleAddExternalTransaction = (extCountry: string) => {
    if (!extTransAmount || parseFloat(extTransAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!extTransDescription.trim()) {
      toast({
        title: "Missing Description",
        description: "Please add a description",
        variant: "destructive",
      });
      return;
    }

    if (!data) return;

    const extConfig = COUNTRY_TAX_CONFIG[extCountry as CountryKey];
    const extRate = externalRates[extConfig.currency] || 1;
    const mainCurrencyRate = exchangeRate;

    // Calculate amounts based on input mode
    const rawAmount = parseFloat(extTransAmount);
    let amountInPrimary = 0;
    let amountInLocal = 0;

    if (inputCurrencyMode === "primary") {
      // Amount is entered in PRIMARY currency (e.g. CAD)
      amountInPrimary = rawAmount;
      amountInLocal = (amountInPrimary / mainCurrencyRate) * extRate;
    } else {
      // Amount is entered in LOCAL currency (e.g. PKR)
      amountInLocal = rawAmount;
      amountInPrimary = (amountInLocal / extRate) * mainCurrencyRate;
    }

    // Check for insufficient funds if it's an expense
    if (extTransType === "expense") {
      const extData = data.externalCountryData?.find(e => e.country === extCountry);
      const currentEarnings = extData?.transactions
        .filter(t => t.type === "earning")
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      const currentExpenses = extData?.transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
      const balance = currentEarnings - currentExpenses;
      
      // Allow a small margin of error for floating point calculations (e.g. 0.01)
      if (amountInPrimary > balance + 0.01) {
         toast({
          title: "Insufficient Funds",
          description: `Insufficient funds in ${extCountry}. Available: ${formatCurrency(balance, data.settings.currency)}`,
          variant: "destructive",
        });
        return;
      }
    }

    const transaction: Transaction = {
      id: uuidv4(),
      amount: amountInPrimary, // Always store in PRIMARY currency
      amountUSD: amountInPrimary / mainCurrencyRate,
      description: extTransDescription,
      date: new Date().toISOString(),
      type: extTransType,
      exchangeRate: extRate,
      country: extCountry,
    };

    // Add to external country data
    const updatedData = { ...data };
    if (!updatedData.externalCountryData) {
      updatedData.externalCountryData = [];
    }
    
    const extIndex = updatedData.externalCountryData.findIndex(e => e.country === extCountry);
    const extData = data.externalCountryData?.find(e => e.country === extCountry);
    const monthlyBudget = extData?.monthlyBudget || 0;
    
    if (extIndex >= 0) {
      updatedData.externalCountryData[extIndex].transactions.push(transaction);
      updatedData.externalCountryData[extIndex].exchangeRate = extRate;
    } else {
      updatedData.externalCountryData.push({
        country: extCountry,
        currency: extConfig.currency,
        transactions: [transaction],
        exchangeRate: extRate,
        monthlyBudget,
      });
    }

    // If expense, also deduct from main country transactions
    if (extTransType === "expense") {
      const mainExpenseTransaction: Transaction = {
        id: uuidv4(),
        amount: amountInPrimary,
        amountUSD: amountInPrimary / mainCurrencyRate,
        description: `${extConfig.flag} ${extTransDescription} (≈${formatCurrency(amountInLocal, extConfig.currency)})`,
        date: new Date().toISOString(),
        type: "expense",
        exchangeRate: mainCurrencyRate,
        country: data.settings.country,
        isExternalExpense: true,
      };
      updatedData.transactions.push(mainExpenseTransaction);
    }

    saveLifelineData(updatedData);
    loadData();
    
    setExtTransAmount("");
    setExtTransDescription("");
    
    toast({
      title: "Transaction Added",
      description: `${extTransType === "expense" ? "Expense" : "Earning"} of ${formatCurrency(amountInPrimary, data.settings.currency)} (≈${formatCurrency(amountInLocal, extConfig.currency)}) recorded`,
    });
  };

  const handleTransferFund = (extCountry: string) => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to transfer",
        variant: "destructive",
      });
      return;
    }

    if (!data) return;

    const extConfig = COUNTRY_TAX_CONFIG[extCountry as CountryKey];
    const amount = parseFloat(fundAmount);

    // Validate: cannot transfer more than available primary balance
    if (amount > stats.remaining) {
      toast({
        title: "Insufficient Balance",
        description: `Primary balance is ${formatCurrency(stats.remaining, data.settings.currency)}. You cannot transfer more than that.`,
        variant: "destructive",
      });
      return;
    }

    // 1. Create Expense in Primary Country
    const mainTransaction: Transaction = {
      id: uuidv4(),
      amount: amount,
      amountUSD: data.settings.currency !== "USD" ? amount / exchangeRate : amount,
      description: `Fund Transfer to ${extConfig.name} ${extConfig.flag}`,
      date: new Date().toISOString(),
      type: "expense",
      exchangeRate: data.settings.currency !== "USD" ? exchangeRate : undefined,
      country: data.settings.country,
    };

    // 2. Add Fund (Earning) to Sub Country
    const extRate = externalRates[extConfig.currency] || 1;
    const mainCurrencyRate = exchangeRate;

    const extTransaction: Transaction = {
      id: uuidv4(),
      amount: amount, // Stored in PRIMARY currency
      amountUSD: amount / mainCurrencyRate,
      description: "Fund Received from Primary",
      date: new Date().toISOString(),
      type: "earning", // Treating Fund as Earning for the Sub Country
      exchangeRate: extRate,
      country: extCountry,
    };

    const currentData = getLifelineData();
    if (!currentData) return;

    // Add to main transactions
    currentData.transactions.push(mainTransaction);

    // Add to external country data
    if (!currentData.externalCountryData) {
      currentData.externalCountryData = [];
    }
    
    const extIndex = currentData.externalCountryData.findIndex(e => e.country === extCountry);
    
    if (extIndex >= 0) {
      currentData.externalCountryData[extIndex].transactions.push(extTransaction);
    } else {
      currentData.externalCountryData.push({
        country: extCountry,
        currency: extConfig.currency,
        transactions: [extTransaction],
        exchangeRate: extRate,
        monthlyBudget: 0,
      });
    }

    saveLifelineData(currentData);
    loadData();
    
    setFundAmount("");
    
    toast({
      title: "Funds Transferred",
      description: `Transferred ${formatCurrency(amount, data.settings.currency)} to ${extConfig.name}`,
    });
  };

  const handleDeleteExternalTransaction = (extCountry: string, transId: string) => {
    if (!data) return;

    const updatedData = { ...data };
    const extIndex = updatedData.externalCountryData?.findIndex(e => e.country === extCountry);
    
    if (extIndex !== undefined && extIndex >= 0 && updatedData.externalCountryData) {
      updatedData.externalCountryData[extIndex].transactions = 
        updatedData.externalCountryData[extIndex].transactions.filter(t => t.id !== transId);
      saveLifelineData(updatedData);
      loadData();
      
      toast({
        title: "Transaction Deleted",
        description: "Transaction removed successfully",
      });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    loadData();
    
    toast({
      title: "Transaction Deleted",
      description: "Transaction removed successfully",
    });
  };

  const handlePayTax = async () => {
    if (!data || !liveTaxInfo) return;
    
    if (liveTaxInfo.taxOwed <= 0) {
      toast({
        title: "No Tax Owed",
        description: "You have no untaxed earnings at the moment",
      });
      return;
    }

    setIsPaying(true);
    try {
      await payTax(exchangeRate, liveTaxInfo.currentRate);
      loadData();
      
      const taxOwedUSD = liveTaxInfo.taxOwed / exchangeRate;
      toast({
        title: "Tax Paid Successfully",
        description: `Paid ${formatCurrency(liveTaxInfo.taxOwed, data.settings.currency)} (USD $${taxOwedUSD.toFixed(2)})`,
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Failed to process tax payment",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("forex-lifeline-data");
    setData(null);
    setStats(null);
    setIsSetup(false);
    setMonthlyExpense("");
    setSelectedExternalCountries([]);
    
    toast({
      title: "Lifeline Reset",
      description: "All data has been cleared",
    });
  };

  const toggleExternalCountry = (country: CountryKey) => {
    setSelectedExternalCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  // Export to PDF for main country
  const exportToPDF = () => {
    if (!data || !stats || !liveTaxInfo) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let y = 20;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL STATEMENT", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth / 2, 30, { align: "center" });

    y = 55;

    // Account Summary
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y - 5, pageWidth - 30, 60, 3, 3, "F");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT SUMMARY", 20, y + 5);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 10, pageWidth - 20, y + 10);

    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Currency: ${data.settings.currency}`, 20, y);
    doc.text(`Period: ${data.settings.periodMonths} Month(s)`, 20, y + 8);
    doc.text(`Current Tax Bracket: ${liveTaxInfo.currentRate}%`, 20, y + 16);
    doc.text(`Projected Yearly Income: ${formatCurrency(liveTaxInfo.projectedYearlyIncome, data.settings.currency)}`, 20, y + 24);
    
    doc.text(`Exchange Rate: 1 USD = ${exchangeRate.toFixed(2)} ${data.settings.currency}`, 110, y);
    doc.text(`Days Remaining: ${stats.daysRemaining}`, 110, y + 8);
    doc.text(`Progress: ${stats.progressPercent.toFixed(1)}%`, 110, y + 16);
    doc.text(`Total Earnings: ${formatCurrency(liveTaxInfo.totalEarnings, data.settings.currency)}`, 110, y + 24);

    y += 55;

    // Financial Overview boxes
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL OVERVIEW", 20, y);
    y += 8;

    const boxWidth = (pageWidth - 50) / 3;
    
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(15, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(9);
    doc.text("TOTAL EARNED (CREDIT)", 20, y + 10);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`+ ${formatCurrency(stats.totalEarned, data.settings.currency)}`, 20, y + 22);

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(20 + boxWidth, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL SPENT (DEBIT)", 25 + boxWidth, y + 10);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatCurrency(stats.totalSpent, data.settings.currency)}`, 25 + boxWidth, y + 22);

    doc.setFillColor(224, 231, 255);
    doc.roundedRect(25 + boxWidth * 2, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(55, 48, 163);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("BALANCE", 30 + boxWidth * 2, y + 10);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(stats.remaining, data.settings.currency), 30 + boxWidth * 2, y + 22);

    y += 45;

    // Tax Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TAX SUMMARY", 20, y);
    y += 8;

    if (liveTaxInfo.taxOwed > 0) {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, y, pageWidth - 30, 35, 2, 2, "F");
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TAX UNPAID", 20, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Untaxed Earnings: ${formatCurrency(liveTaxInfo.untaxedEarnings, data.settings.currency)}`, 20, y + 18);
      doc.text(`Tax Due (${liveTaxInfo.currentRate}%): ${formatCurrency(liveTaxInfo.taxOwed, data.settings.currency)}`, 20, y + 26);
      y += 45;
    } else {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(15, y, pageWidth - 30, 25, 2, 2, "F");
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TAX PAID", 20, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Tax Paid: ${formatCurrency(stats.totalTaxPaid, data.settings.currency)}`, 20, y + 18);
      y += 35;
    }

    // Transaction History
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION HISTORY", 20, y);
    y += 8;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("DATE", 20, y + 7);
    doc.text("DESCRIPTION", 45, y + 7);
    doc.text("STATUS", 105, y + 7);
    doc.text("CREDIT", 135, y + 7);
    doc.text("DEBIT", 165, y + 7);

    y += 12;

    const sortedTransactions = [...data.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedTransactions.forEach((transaction, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, pageWidth - 30, 10, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("DATE", 20, y + 7);
        doc.text("DESCRIPTION", 45, y + 7);
        doc.text("STATUS", 105, y + 7);
        doc.text("CREDIT", 135, y + 7);
        doc.text("DEBIT", 165, y + 7);
        y += 12;
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y - 3, pageWidth - 30, 10, "F");
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      doc.setTextColor(100, 116, 139);
      doc.text(new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), 20, y + 4);
      
      doc.setTextColor(30, 41, 59);
      const desc = transaction.description.length > 30 
        ? transaction.description.substring(0, 30) + "..." 
        : transaction.description;
      doc.text(desc, 45, y + 4);
      
      if (transaction.type === "earning") {
        if (transaction.taxed) {
          doc.setTextColor(22, 101, 52);
          doc.text("TAXED", 105, y + 4);
        } else {
          doc.setTextColor(180, 83, 9);
          doc.text("UNTAXED", 105, y + 4);
        }
      } else if (transaction.type === "tax") {
        doc.setTextColor(180, 83, 9);
        doc.text("TAX PAID", 105, y + 4);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 105, y + 4);
      }
      
      if (transaction.type === "earning") {
        doc.setTextColor(22, 101, 52);
        doc.text(formatCurrency(transaction.amount, data.settings.currency), 135, y + 4);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 135, y + 4);
      }
      
      if (transaction.type === "expense" || transaction.type === "tax") {
        doc.setTextColor(153, 27, 27);
        doc.text(formatCurrency(transaction.amount, data.settings.currency), 165, y + 4);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 165, y + 4);
      }

      y += 10;
    });

    // Footer
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y - 5, pageWidth - 15, y - 5);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("This is a computer-generated statement. No signature is required.", pageWidth / 2, y, { align: "center" });
    doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth / 2, y + 5, { align: "center" });

    const fileName = `lifeline-statement-${now.toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: "Statement Exported",
      description: `Saved as ${fileName}`,
    });
  };

  // Export External Country PDF
  const exportExternalCountryPDF = (extCountry: string) => {
    if (!data) return;

    const extConfig = COUNTRY_TAX_CONFIG[extCountry as CountryKey];
    const extData = data.externalCountryData?.find(e => e.country === extCountry);
    if (!extConfig || !extData) return;

    const mainConfig = COUNTRY_TAX_CONFIG[data.settings.country as CountryKey];
    const extRate = externalRates[extConfig.currency] || 1;
    const toLocal = (amount: number) => (amount / exchangeRate) * extRate;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let y = 20;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`${extConfig.flag} ${extConfig.name.toUpperCase()} STATEMENT`, pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth / 2, 30, { align: "center" });

    y = 55;

    // Account Info
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y - 5, pageWidth - 30, 40, 3, 3, "F");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT INFORMATION", 20, y + 5);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 10, pageWidth - 20, y + 10);

    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Local Currency: ${extConfig.currency}`, 20, y);
    doc.text(`Main Country: ${mainConfig.flag} ${mainConfig.name} (${mainConfig.currency})`, 20, y + 8);
    doc.text(`Exchange Rate: 1 USD = ${extRate.toFixed(2)} ${extConfig.currency}`, 110, y);
    doc.text(`Tax Applicable: No (External Country)`, 110, y + 8);

    y += 40;

    // Calculate totals
    // Credits: Expenses from main country (money coming IN to this country) + Local earnings
    const creditsFromMain = extData.transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const localEarnings = extData.transactions
      .filter(t => t.type === "earning")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = creditsFromMain + localEarnings;
    
    // Debits: Only local expenses that stay in this country (we don't have this concept yet, 
    // but for now expenses are "from main" so they're credits here)
    // For now, debits are 0 since all expenses are funded from main
    const totalDebits = 0;
    const balance = totalCredits - totalDebits;

    // Summary boxes
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL SUMMARY", 20, y);
    y += 8;

    const boxWidth = (pageWidth - 50) / 3;
    
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(15, y, boxWidth, 35, 2, 2, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(9);
    doc.text("TOTAL CREDITS", 20, y + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`+ ${formatCurrency(toLocal(totalCredits), extConfig.currency)}`, 20, y + 22);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`From ${mainConfig.currency}: ${formatCurrency(toLocal(creditsFromMain), extConfig.currency)}`, 20, y + 30);

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(20 + boxWidth, y, boxWidth, 35, 2, 2, "F");
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL DEBITS", 25 + boxWidth, y + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatCurrency(toLocal(totalDebits), extConfig.currency)}`, 25 + boxWidth, y + 22);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Local expenses only", 25 + boxWidth, y + 30);

    doc.setFillColor(224, 231, 255);
    doc.roundedRect(25 + boxWidth * 2, y, boxWidth, 35, 2, 2, "F");
    doc.setTextColor(55, 48, 163);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("BALANCE", 30 + boxWidth * 2, y + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(toLocal(balance), extConfig.currency), 30 + boxWidth * 2, y + 22);

    y += 50;

    // Transaction History
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION HISTORY", 20, y);
    y += 8;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("DATE", 20, y + 7);
    doc.text("DESCRIPTION", 50, y + 7);
    doc.text("SOURCE", 110, y + 7);
    doc.text("CREDIT", 145, y + 7);
    doc.text("DEBIT", 175, y + 7);

    y += 12;

    const sortedExtTransactions = [...extData.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedExtTransactions.forEach((transaction, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, pageWidth - 30, 10, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("DATE", 20, y + 7);
        doc.text("DESCRIPTION", 50, y + 7);
        doc.text("SOURCE", 110, y + 7);
        doc.text("CREDIT", 145, y + 7);
        doc.text("DEBIT", 175, y + 7);
        y += 12;
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y - 3, pageWidth - 30, 10, "F");
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      doc.setTextColor(100, 116, 139);
      doc.text(new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), 20, y + 4);
      
      doc.setTextColor(30, 41, 59);
      const desc = transaction.description.length > 28 
        ? transaction.description.substring(0, 28) + "..." 
        : transaction.description;
      doc.text(desc, 50, y + 4);
      
      // Source
      if (transaction.type === "expense") {
        doc.setTextColor(55, 48, 163);
        doc.text(`From ${mainConfig.currency}`, 110, y + 4);
      } else {
        doc.setTextColor(22, 101, 52);
        doc.text("Local", 110, y + 4);
      }
      
      // Credits - both expenses (from main) and local earnings are credits here
      doc.setTextColor(22, 101, 52);
      doc.text(formatCurrency(toLocal(transaction.amount), extConfig.currency), 145, y + 4);
      
      // Debits - none for now
      doc.setTextColor(100, 116, 139);
      doc.text("-", 175, y + 4);

      y += 10;
    });

    // Footer
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y - 5, pageWidth - 15, y - 5);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("This is a computer-generated statement. No signature is required.", pageWidth / 2, y, { align: "center" });
    doc.text(`External Country Statement - No Tax Applied`, pageWidth / 2, y + 5, { align: "center" });

    const fileName = `${extCountry}-statement-${now.toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: "Statement Exported",
      description: `Saved as ${fileName}`,
    });
  };

  // Render external country section
  const renderExternalCountrySection = (extCountry: string) => {
    const extConfig = COUNTRY_TAX_CONFIG[extCountry as CountryKey];
    if (!extConfig || !data || !stats) return null;

    const extData = data.externalCountryData?.find(e => e.country === extCountry);
    const extRate = externalRates[extConfig.currency] || 1;
    const mainRate = exchangeRate;
    const mainConfig = COUNTRY_TAX_CONFIG[data.settings.country as CountryKey];

    // Calculate stats for this external country - ALL IN PRIMARY CURRENCY
    const extEarnings = extData?.transactions.filter(t => t.type === "earning").reduce((sum, t) => sum + t.amount, 0) || 0;
    const extExpenses = extData?.transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0) || 0;
    
    // Monthly budget for this country (in PRIMARY currency)
    const monthlyBudget = extData?.monthlyBudget || 0;
    const totalBudget = monthlyBudget * data.settings.periodMonths;
    const remaining = totalBudget - extExpenses + extEarnings;
    const progressPercent = totalBudget > 0 ? Math.min((extExpenses / totalBudget) * 100, 100) : 0;

    // Convert to local currency for display
    const toLocal = (amount: number) => (amount / mainRate) * extRate;

    return (
      <div className="space-y-4">
        {/* External Country Header with Export */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{extConfig.flag}</span>
            <div>
              <h3 className="font-semibold">{extConfig.name}</h3>
              <p className="text-xs text-muted-foreground">No Tax Applied • External Country</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportExternalCountryPDF(extCountry)}>
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>

        {/* Lifeline Progress for External Country */}
        {monthlyBudget > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {extConfig.name} Lifeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Monthly Budget</p>
                  <p className="text-sm font-semibold">{formatCurrency(toLocal(monthlyBudget), extConfig.currency)}</p>
                  <p className="text-xs text-muted-foreground">(≈{formatCurrency(monthlyBudget, data.settings.currency)})</p>
                </div>
                <div className="p-2 rounded bg-red-500/10">
                  <p className="text-xs text-red-600">Spent</p>
                  <p className="text-sm font-semibold text-red-700">{formatCurrency(toLocal(extExpenses), extConfig.currency)}</p>
                  <p className="text-xs text-muted-foreground">(≈{formatCurrency(extExpenses, data.settings.currency)})</p>
                </div>
                <div className="p-2 rounded bg-green-500/10">
                  <p className="text-xs text-green-600">Remaining</p>
                  <p className={`text-sm font-semibold ${remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(toLocal(remaining), extConfig.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">(≈{formatCurrency(remaining, data.settings.currency)})</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Country Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Exchange Rate</p>
            <p className="text-sm font-semibold">1 {data.settings.currency} ≈ {(extRate / mainRate).toFixed(2)} {extConfig.currency}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-600 dark:text-red-400">Total Expenses</p>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {formatCurrency(toLocal(extExpenses), extConfig.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (≈{formatCurrency(extExpenses, data.settings.currency)})
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">Local Earnings</p>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {formatCurrency(toLocal(extEarnings), extConfig.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (≈{formatCurrency(extEarnings, data.settings.currency)})
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary">Available Funds</p>
            <p className={`text-sm font-semibold ${(extEarnings - extExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(toLocal(extEarnings - extExpenses), extConfig.currency)}
            </p>
             <p className="text-xs text-muted-foreground mt-1">
              (≈{formatCurrency(extEarnings - extExpenses, data.settings.currency)})
            </p>
          </div>
        </div>

        {/* Fund Transfer Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Add Funds from Primary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="Amount to transfer..."
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="pl-8"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  {data.settings.currency}
                </div>
              </div>
              <Button onClick={() => handleTransferFund(extCountry)} size="sm">
                Transfer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will deduct from Main Country balance and add to {extConfig.name} funds.
            </p>
          </CardContent>
        </Card>

        {/* Add Transaction Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Add {extConfig.flag} {extConfig.name} Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Amount</Label>
                  <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                    <button 
                      className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${inputCurrencyMode === 'primary' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setInputCurrencyMode('primary')}
                    >
                      {data.settings.currency}
                    </button>
                    <button 
                      className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${inputCurrencyMode === 'local' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setInputCurrencyMode('local')}
                    >
                      {extConfig.currency}
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={extTransAmount}
                  onChange={(e) => setExtTransAmount(e.target.value)}
                />
                {extTransAmount && parseFloat(extTransAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {inputCurrencyMode === 'primary' 
                      ? formatCurrency(toLocal(parseFloat(extTransAmount)), extConfig.currency)
                      : formatCurrency((parseFloat(extTransAmount) / extRate) * mainRate, data.settings.currency)
                    }
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={extTransType} onValueChange={(v: any) => setExtTransType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                        Expense
                      </span>
                    </SelectItem>
                    <SelectItem value="earning">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        Earning
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {extTransType === "expense" && extTransAmount && parseFloat(extTransAmount) > 0 && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                💡 This will record <strong>
                  {inputCurrencyMode === 'primary' 
                    ? formatCurrency(parseFloat(extTransAmount), data.settings.currency)
                    : formatCurrency((parseFloat(extTransAmount) / extRate) * mainRate, data.settings.currency)
                  }
                </strong> (≈{inputCurrencyMode === 'primary' 
                  ? formatCurrency(toLocal(parseFloat(extTransAmount)), extConfig.currency)
                  : formatCurrency(parseFloat(extTransAmount), extConfig.currency)
                }) as expense in {extConfig.name}
              </p>
            )}
            
            {extTransType === "earning" && extTransAmount && parseFloat(extTransAmount) > 0 && (
              <p className="text-xs text-green-600 bg-green-500/10 p-2 rounded">
                ✓ Local earning of <strong>
                  {inputCurrencyMode === 'primary' 
                    ? formatCurrency(parseFloat(extTransAmount), data.settings.currency)
                    : formatCurrency((parseFloat(extTransAmount) / extRate) * mainRate, data.settings.currency)
                  }
                </strong> (≈{inputCurrencyMode === 'primary' 
                  ? formatCurrency(toLocal(parseFloat(extTransAmount)), extConfig.currency)
                  : formatCurrency(parseFloat(extTransAmount), extConfig.currency)
                }) - stays in {extConfig.name} only
              </p>
            )}
            
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="e.g. Family support, Shopping"
                value={extTransDescription}
                onChange={(e) => setExtTransDescription(e.target.value)}
              />
            </div>
            <Button onClick={() => handleAddExternalTransaction(extCountry)} className="w-full" size="sm">
              Add Transaction
            </Button>
          </CardContent>
        </Card>

        {/* Transaction List */}
        {extData && extData.transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transaction History ({extConfig.currency})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {extData.transactions.slice().reverse().map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${transaction.type === "expense" ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}`}>
                          {transaction.type === "expense" ? "Expense" : "Earning"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`font-semibold text-sm ${transaction.type === "expense" ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === "expense" ? "-" : "+"}{formatCurrency(toLocal(transaction.amount), extConfig.currency)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          (≈{formatCurrency(transaction.amount, data.settings.currency)})
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExternalTransaction(extCountry, transaction.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (!isSetup || !data) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card glow-primary mb-4">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Setup Your Lifeline
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Track your earnings, manage expenses, and stay on top of your financial goals with smart tax calculations
          </p>
        </div>

        {/* Setup Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configure Your Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monthly Expense Input */}
            <div className="space-y-3">
              <Label htmlFor="monthly-expense" className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Monthly Expense Target
              </Label>
              <div className="relative">
                <Input
                  id="monthly-expense"
                  type="number"
                  placeholder="Enter your monthly expenses..."
                  value={monthlyExpense}
                  onChange={(e) => setMonthlyExpense(e.target.value)}
                  className="h-14 text-lg pl-4 pr-16"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {currency}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This is the amount you need to cover every month
              </p>
            </div>

            {/* Country Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Residence Country
              </Label>
              <Select value={selectedCountry} onValueChange={(val) => {
                setSelectedCountry(val as CountryKey);
                // Remove this country from external if selected
                setSelectedExternalCountries(prev => prev.filter(c => c !== val));
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COUNTRY_TAX_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.flag} {config.name} ({config.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {countryConfig.description}
              </p>
            </div>

            {/* External Countries Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                External Countries (Optional)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select countries where you also spend money or have local income
              </p>
              <div className="flex flex-wrap gap-2">
                {availableExternalCountries.map((country) => (
                  <Button
                    key={country.key}
                    type="button"
                    variant={selectedExternalCountries.includes(country.key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleExternalCountry(country.key)}
                    className="h-9"
                  >
                    {country.flag} {country.name}
                  </Button>
                ))}
              </div>
              {selectedExternalCountries.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border/30">
                  <p className="text-xs text-primary font-medium">
                    ✓ {selectedExternalCountries.length} external {selectedExternalCountries.length === 1 ? 'country' : 'countries'} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set monthly budget for each country (in {currency})
                  </p>
                  {selectedExternalCountries.map(country => {
                    const config = COUNTRY_TAX_CONFIG[country];
                    return (
                      <div key={country} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="text-xl">{config.flag}</span>
                        <div className="flex-1">
                          <Label className="text-xs">{config.name} Monthly Budget</Label>
                          <Input
                            type="number"
                            placeholder={`0.00 ${currency}`}
                            value={externalBudgets[country] || ""}
                            onChange={(e) => setExternalBudgets(prev => ({
                              ...prev,
                              [country]: e.target.value
                            }))}
                            className="h-9 mt-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {currency}/month
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tax Rate Display */}
            <div className="p-4 rounded-xl glass-subtle border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Auto-detected Tax Rate
                </span>
                <span className="text-xl font-bold text-primary">{calculatedTaxRate}%</span>
              </div>
              
              {monthlyExpense && parseFloat(monthlyExpense) > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yearly Income</span>
                    <span className="font-semibold">{formatCurrency(yearlyIncome, currency)}</span>
                  </div>
                  {applicableBracket && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax Bracket</span>
                      <span className="font-medium text-primary">{applicableBracket.label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Yearly Tax</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(yearlyIncome * (calculatedTaxRate / 100), currency)}
                    </span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {countryConfig.description}
              </p>
            </div>

            {/* Tracking Period */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Tracking Period
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "1", label: "1 Month" },
                  { value: "3", label: "3 Months" },
                  { value: "6", label: "6 Months" },
                  { value: "12", label: "1 Year" },
                ].map((period) => (
                  <Button
                    key={period.value}
                    type="button"
                    variant={periodMonths === period.value ? "default" : "outline"}
                    onClick={() => setPeriodMonths(period.value)}
                    className="h-12 text-sm"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            {monthlyExpense && parseFloat(monthlyExpense) > 0 && (
              <div className="p-4 rounded-xl glass-subtle border border-primary/20 space-y-3">
                <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Your Targets Preview
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Target</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(parseFloat(monthlyExpense) * parseInt(periodMonths), currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weekly Target</p>
                    <p className="text-xl font-bold">
                      {formatCurrency((parseFloat(monthlyExpense) * parseInt(periodMonths)) / (parseInt(periodMonths) * 4.35), currency)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button onClick={handleSetup} className="w-full h-14 text-lg font-semibold gap-2">
              <Activity className="h-5 w-5" />
              Start Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats || !data) return null;

  const quotaStatus = stats.progressPercent >= 100 ? "complete" : "active";

  const savedCountryConfig = COUNTRY_TAX_CONFIG[data.settings.country as CountryKey] || COUNTRY_TAX_CONFIG.canada;
  const usdToLocalDisplay = `1 USD = ${exchangeRate.toFixed(2)} ${data.settings.currency}`;

  const hasExternalCountries = data.settings.externalCountries && data.settings.externalCountries.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-primary">Your Lifeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span>{savedCountryConfig.flag}</span>
            <span>{savedCountryConfig.name}</span>
          </div>
          <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            Tax: {liveTaxInfo.currentRate}%
          </div>
          <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            {usdToLocalDisplay}
          </div>
          <Button variant="outline" size="icon" onClick={exportToPDF} title="Export PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Main Tabs for Countries */}
      <Tabs defaultValue="main" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="main" className="flex-1 min-w-[100px] gap-1">
            {savedCountryConfig.flag} {savedCountryConfig.name}
          </TabsTrigger>
          {hasExternalCountries && data.settings.externalCountries?.map(country => {
            const config = COUNTRY_TAX_CONFIG[country as CountryKey];
            return (
              <TabsTrigger key={country} value={country} className="flex-1 min-w-[100px] gap-1">
                {config.flag} {config.name}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="analytics" className="flex-1 min-w-[100px] gap-1">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Main Country Tab */}
        <TabsContent value="main" className="mt-4 space-y-4">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Lifeline Progress
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quota Progress</span>
                  <span className="font-medium">{stats.progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={stats.progressPercent} className="h-3" />
                
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const monthsFilled = Math.floor(stats.remaining / data.settings.monthlyExpense);
                    const remainingAfterMonths = stats.remaining % data.settings.monthlyExpense;
                    const weeklyExpense = data.settings.monthlyExpense / 4.35;
                    const weeksFilled = Math.floor(remainingAfterMonths / weeklyExpense);
                    const remainingAfterWeeks = remainingAfterMonths % weeklyExpense;
                    const dailyExpense = weeklyExpense / 7;
                    const daysFilled = Math.floor(remainingAfterWeeks / dailyExpense);
                    
                    return (
                      <span>
                        Quota Filled: <span className="font-semibold text-foreground">{monthsFilled} months</span>, <span className="font-semibold text-foreground">{weeksFilled} weeks</span>, and <span className="font-semibold text-foreground">{daysFilled} days</span> out of {data.settings.periodMonths} months
                      </span>
                    );
                  })()}
                </div>
                
                {quotaStatus === "complete" && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    🎉 Congratulations! Your {data.settings.periodMonths}-month quota is complete!
                  </p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Target className="h-3 w-3" />
                    Target
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(stats.totalTarget, data.settings.currency)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <TrendingUp className="h-3 w-3" />
                    Earned
                  </div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(stats.totalEarned, data.settings.currency)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <TrendingDown className="h-3 w-3" />
                    Spent
                  </div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(stats.totalSpent, data.settings.currency)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    Remaining
                  </div>
                  <p className="text-sm font-semibold">
                    {stats.daysRemaining}d / {stats.weeksRemaining}w
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Weekly Target</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.weeklyTarget || 0, data.settings.currency)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Target</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalTarget || 0, data.settings.currency)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400">Total Earned</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(stats.totalEarned || 0, data.settings.currency)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-sm text-red-600 dark:text-red-400">Total Spent</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(stats.totalSpent || 0, data.settings.currency)}
                    </p>
                  </div>
                </div>

                {/* Live Tax Bracket Card */}
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-primary font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Live Tax Status
                      </p>
                      <p className="text-xs text-muted-foreground">Based on your actual earnings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {liveTaxInfo.currentRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Current Bracket</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Earnings</p>
                      <p className="text-sm font-semibold">{formatCurrency(liveTaxInfo.totalEarnings, data.settings.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Projected Yearly</p>
                      <p className="text-sm font-semibold">{formatCurrency(liveTaxInfo.projectedYearlyIncome, data.settings.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taxed Earnings</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(liveTaxInfo.taxedEarnings, data.settings.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Untaxed Earnings</p>
                      <p className="text-sm font-semibold text-amber-600">{formatCurrency(liveTaxInfo.untaxedEarnings, data.settings.currency)}</p>
                    </div>
                  </div>
                  
                  {liveTaxInfo.currentBracket && (
                    <p className="text-xs text-primary/80 bg-primary/5 p-2 rounded">
                      📊 Current Bracket: {liveTaxInfo.currentBracket.label}
                    </p>
                  )}
                </div>

                {/* Tax Owed Card */}
                {liveTaxInfo.taxOwed > 0 && (
                  <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Tax Due ({liveTaxInfo.currentRate}%)
                        </p>
                        <p className="text-xs text-muted-foreground">On untaxed earnings</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {formatCurrency(liveTaxInfo.taxOwed, data.settings.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${(liveTaxInfo.taxOwed / exchangeRate).toFixed(2)} USD
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handlePayTax} 
                      disabled={isPaying}
                      className="w-full"
                      variant="default"
                    >
                      {isPaying ? "Processing..." : `Pay Tax (${formatCurrency(liveTaxInfo.taxOwed, data.settings.currency)})`}
                    </Button>
                  </div>
                )}

                {/* Tax Paid Summary */}
                {stats.totalTaxPaid > 0 && liveTaxInfo.taxOwed <= 0 && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">All Tax Paid ✓</span>
                      </div>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(stats.totalTaxPaid, data.settings.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* External Countries Lifeline Summary */}
          {hasExternalCountries && data.externalCountryData && data.externalCountryData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  External Countries Lifeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.externalCountryData.map(extData => {
                  const extConfig = COUNTRY_TAX_CONFIG[extData.country as CountryKey];
                  if (!extConfig) return null;
                  
                  const extRate = externalRates[extConfig.currency] || 1;
                  const toLocal = (amount: number) => (amount / exchangeRate) * extRate;
                  
                  const extExpenses = extData.transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
                  const extEarnings = extData.transactions.filter(t => t.type === "earning").reduce((sum, t) => sum + t.amount, 0);
                  const monthlyBudget = extData.monthlyBudget || 0;
                  const totalBudget = monthlyBudget * data.settings.periodMonths;
                  const remaining = totalBudget - extExpenses + extEarnings;
                  const progressPercent = totalBudget > 0 ? Math.min((extExpenses / totalBudget) * 100, 100) : 0;
                  
                  return (
                    <div key={extData.country} className="p-3 rounded-lg border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{extConfig.flag}</span>
                          <span className="font-medium text-sm">{extConfig.name}</span>
                        </div>
                        {monthlyBudget > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(monthlyBudget, data.settings.currency)}/month
                          </span>
                        )}
                      </div>
                      
                      {monthlyBudget > 0 && (
                        <>
                          <Progress value={progressPercent} className="h-1.5" />
                          <div className="flex justify-between text-xs">
                            <span className="text-red-600">
                              Spent: {formatCurrency(extExpenses, data.settings.currency)}
                              <span className="text-muted-foreground ml-1">(≈{formatCurrency(toLocal(extExpenses), extConfig.currency)})</span>
                            </span>
                            <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Left: {formatCurrency(remaining, data.settings.currency)}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {!monthlyBudget && (
                        <p className="text-xs text-muted-foreground">
                          Spent: {formatCurrency(extExpenses, data.settings.currency)} (≈{formatCurrency(toLocal(extExpenses), extConfig.currency)})
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Add Transaction Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Add Transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                  />
                  {data.settings.currency !== "USD" && transAmount && (
                    <p className="text-xs text-muted-foreground">
                      ≈ ${(parseFloat(transAmount) / exchangeRate).toFixed(2)} USD
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={transType} onValueChange={(v: any) => setTransType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense ({data.settings.currency})</SelectItem>
                      <SelectItem value="earning">Earning {data.settings.currency !== "USD" ? "(USD Input)" : "(USD)"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Freelance project, Groceries"
                  value={transDescription}
                  onChange={(e) => setTransDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleAddTransaction} className="w-full">
                Add Transaction
              </Button>
            </CardContent>
          </Card>

          {/* Transactions List */}
          {data.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.transactions.slice().reverse().map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                          {transaction.type === "earning" && (
                            <span className={`px-1.5 py-0.5 rounded ${transaction.taxed ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'}`}>
                              {transaction.taxed ? 'Taxed' : 'Untaxed'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-sm ${
                            transaction.type === "earning"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {transaction.type === "earning" ? "+" : "-"}
                          {formatCurrency(transaction.amount, data.settings.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* External Country Tabs */}
        {hasExternalCountries && data.settings.externalCountries?.map(country => (
          <TabsContent key={country} value={country} className="mt-4">
            {renderExternalCountrySection(country)}
          </TabsContent>
        ))}

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Expense Distribution by Country
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                All amounts shown in {data.settings.currency}
              </p>
            </CardHeader>
            <CardContent>
              {expenseDistribution.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={expenseDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, flag }) => `${flag} ${formatCurrency(value, data.settings.currency)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value, data.settings.currency)}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No expenses recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expenses by Country */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Expenses by Country ({data.settings.currency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenseDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="flex items-center gap-2">
                        <span>{item.flag}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(item.value, data.settings.currency)}
                      </span>
                    </div>
                  ))}
                  {expenseDistribution.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expenses yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Earnings by Country */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Earnings by Country ({data.settings.currency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {earningsDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="flex items-center gap-2">
                        <span>{item.flag}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(item.value, data.settings.currency)}
                      </span>
                    </div>
                  ))}
                  {earningsDistribution.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No earnings yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
