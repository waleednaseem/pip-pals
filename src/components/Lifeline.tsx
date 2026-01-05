import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, PlusCircle, Trash2, TrendingUp, TrendingDown, Target, Calendar, DollarSign, AlertCircle, Settings2, Download, Globe } from "lucide-react";
import jsPDF from "jspdf";
import { LifelineData, Transaction, LifelineStats } from "@/types/lifeline";
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

interface LifelineProps {}

export const Lifeline = ({}: LifelineProps) => {
  const [data, setData] = useState<LifelineData | null>(null);
  const [stats, setStats] = useState<LifelineStats | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1.35);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const { toast } = useToast();

  // Setup form states
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>("canada");
  const [periodMonths, setPeriodMonths] = useState("1");

  // Transaction form states
  const [transAmount, setTransAmount] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transType, setTransType] = useState<"expense" | "earning">("expense");

  // Derived values
  const countryConfig = COUNTRY_TAX_CONFIG[selectedCountry];
  const currency = countryConfig.currency;

  // Calculate effective tax rate based on yearly income and country
  const { calculatedTaxRate, applicableBracket } = useMemo(() => {
    if (!monthlyExpense || parseFloat(monthlyExpense) <= 0) {
      return { calculatedTaxRate: 0, applicableBracket: null };
    }
    const yearlyIncome = parseFloat(monthlyExpense) * 12;
    const brackets = countryConfig.brackets;
    
    // Find the applicable bracket
    const bracket = brackets.find(b => yearlyIncome >= b.min && yearlyIncome < b.max);
    const rate = bracket ? bracket.rate : brackets[brackets.length - 1].rate;
    return { 
      calculatedTaxRate: rate, 
      applicableBracket: bracket || brackets[brackets.length - 1]
    };
  }, [monthlyExpense, selectedCountry, countryConfig]);

  // Calculate yearly income for display
  const yearlyIncome = useMemo(() => {
    if (!monthlyExpense || parseFloat(monthlyExpense) <= 0) return 0;
    return parseFloat(monthlyExpense) * 12;
  }, [monthlyExpense]);

  useEffect(() => {
    loadData();
    // fetchExchangeRate(); // loadData handles this if data exists. If not, we don't need to fetch yet.
  }, []);

  const fetchExchangeRate = async () => {
    if (!data) return;

    setIsLoadingRate(true);
    try {
      const rate = await getExchangeRate(data.settings.currency);
      setExchangeRate(rate);
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    } finally {
      setIsLoadingRate(false);
    }
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

    const settings = {
      monthlyExpense: parseFloat(monthlyExpense),
      currency: currency,
      country: selectedCountry,
      startDate: new Date().toISOString(),
      periodMonths: parseInt(periodMonths),
      taxRate: calculatedTaxRate,
    };

    initializeLifeline(settings);
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

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    loadData();
    
    toast({
      title: "Transaction Deleted",
      description: "Transaction removed successfully",
    });
  };

  const handlePayTax = async () => {
    if (!data) return;
    
    const taxOwedLocal = calculateTaxOwed(data, exchangeRate);
    if (taxOwedLocal <= 0) {
      toast({
        title: "No Tax Owed",
        description: "You have no untaxed earnings at the moment",
      });
      return;
    }

    setIsPaying(true);
    try {
      await payTax(exchangeRate);
      loadData();
      
      const taxOwedUSD = taxOwedLocal / exchangeRate;
      toast({
        title: "Tax Paid Successfully",
        description: `Paid ${formatCurrency(taxOwedLocal, data.settings.currency)} (USD $${taxOwedUSD.toFixed(2)})`,
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
    
    toast({
      title: "Lifeline Reset",
      description: "All data has been cleared",
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!data || !stats) return;

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
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL STATEMENT", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth / 2, 30, { align: "center" });

    y = 55;

    // Account Summary Box
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, y - 5, pageWidth - 30, 50, 3, 3, "F");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT SUMMARY", 20, y + 5);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 10, pageWidth - 20, y + 10);

    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Left column
    doc.text(`Currency: ${data.settings.currency}`, 20, y);
    doc.text(`Period: ${data.settings.periodMonths} Month(s)`, 20, y + 8);
    doc.text(`Tax Rate: ${data.settings.taxRate}%`, 20, y + 16);
    
    // Right column
    doc.text(`Exchange Rate: 1 USD = ${exchangeRate.toFixed(2)} ${data.settings.currency}`, 110, y);
    doc.text(`Days Remaining: ${stats.daysRemaining}`, 110, y + 8);
    doc.text(`Progress: ${stats.progressPercent.toFixed(1)}%`, 110, y + 16);

    y += 45;

    // Financial Overview
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL OVERVIEW", 20, y);
    y += 8;

    // Stats boxes
    const boxWidth = (pageWidth - 50) / 3;
    
    // Total Earned (Green)
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(15, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(22, 101, 52); // green-800
    doc.setFontSize(9);
    doc.text("TOTAL EARNED (CREDIT)", 20, y + 10);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`+ ${formatCurrency(stats.totalEarned, data.settings.currency)}`, 20, y + 22);

    // Total Spent (Red)
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(20 + boxWidth, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(153, 27, 27); // red-800
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL SPENT (DEBIT)", 25 + boxWidth, y + 10);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatCurrency(stats.totalSpent, data.settings.currency)}`, 25 + boxWidth, y + 22);

    // Balance
    doc.setFillColor(224, 231, 255); // indigo-100
    doc.roundedRect(25 + boxWidth * 2, y, boxWidth, 30, 2, 2, "F");
    doc.setTextColor(55, 48, 163); // indigo-700
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

    const taxOwedLocal = calculateTaxOwed(data, exchangeRate);
    const taxOwedUSD = taxOwedLocal / exchangeRate;

    // Tax Status Box
    if (taxOwedLocal > 0) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(15, y, pageWidth - 30, 25, 2, 2, "F");
      doc.setTextColor(180, 83, 9); // amber-700
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TAX UNPAID", 20, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Amount Due: ${formatCurrency(taxOwedLocal, data.settings.currency)} (USD $${taxOwedUSD.toFixed(2)})`, 20, y + 18);
    } else {
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(15, y, pageWidth - 30, 25, 2, 2, "F");
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TAX PAID", 20, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Tax Paid: ${formatCurrency(stats.totalTaxPaid, data.settings.currency)}`, 20, y + 18);
    }

    y += 35;

    // Transaction History Table
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION HISTORY", 20, y);
    y += 8;

    // Table header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("DATE", 20, y + 7);
    doc.text("DESCRIPTION", 45, y + 7);
    doc.text("STATUS", 105, y + 7);
    doc.text("CREDIT", 135, y + 7);
    doc.text("DEBIT", 165, y + 7);

    y += 12;

    // Sort transactions by date (newest first)
    const sortedTransactions = [...data.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedTransactions.forEach((transaction, index) => {
      // Check for page overflow
      if (y > 270) {
        doc.addPage();
        y = 20;
        
        // Add table header on new page
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

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y - 3, pageWidth - 30, 10, "F");
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Date
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), 20, y + 4);
      
      // Description (truncate if too long)
      doc.setTextColor(30, 41, 59);
      const desc = transaction.description.length > 30 
        ? transaction.description.substring(0, 30) + "..." 
        : transaction.description;
      doc.text(desc, 45, y + 4);
      
      // Tax Status
      if (transaction.type === "earning") {
        if (transaction.taxed) {
          doc.setTextColor(22, 101, 52); // green-800
          doc.text("TAXED", 105, y + 4);
        } else {
          doc.setTextColor(180, 83, 9); // amber-700
          doc.text("UNTAXED", 105, y + 4);
        }
      } else if (transaction.type === "tax") {
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text("TAX PAID", 105, y + 4);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 105, y + 4);
      }
      
      // Credit column (only for earnings)
      if (transaction.type === "earning") {
        doc.setTextColor(22, 101, 52); // green-800
        doc.text(formatCurrency(transaction.amount, data.settings.currency), 135, y + 4);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 135, y + 4);
      }
      
      // Debit column (for expenses and tax)
      if (transaction.type === "expense" || transaction.type === "tax") {
        doc.setTextColor(153, 27, 27); // red-800
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

    // Save the PDF
    const fileName = `lifeline-statement-${now.toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: "Statement Exported",
      description: `Saved as ${fileName}`,
    });
  };

  if (!isSetup || !data) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card glow-primary mb-4">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
            Setup Your Lifeline
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Define your financial goals and let us calculate your earning targets automatically
          </p>
        </div>

        {/* Setup Form Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Monthly Expense - Featured Input */}
            <div className="space-y-3">
              <Label htmlFor="monthly-expense" className="text-base font-medium flex items-center gap-2">
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
                Country
              </Label>
              <Select value={selectedCountry} onValueChange={(val) => setSelectedCountry(val as CountryKey)}>
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

            {/* Tax Rate Display (Auto-calculated) */}
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
  const taxOwedLocal = calculateTaxOwed(data, exchangeRate);
  const taxOwedUSD = taxOwedLocal / exchangeRate;

  // Calculate USD to Local conversion display
  // Get country config for display
  const savedCountryConfig = COUNTRY_TAX_CONFIG[data.settings.country as CountryKey] || COUNTRY_TAX_CONFIG.canada;
  const usdToLocalDisplay = `1 USD = ${exchangeRate.toFixed(2)} ${data.settings.currency}`;

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
            Tax: {data.settings.taxRate}%
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

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Lifeline Progress
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quota Progress</span>
              <span className="font-medium">
                {stats.progressPercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.progressPercent} className="h-3" />
            
            {/* Show how many months/weeks/days filled */}
            <div className="text-sm text-muted-foreground">
              {(() => {
                const monthsFilled = Math.floor(stats.remaining / data.settings.monthlyExpense);
                const remainingAfterMonths = stats.remaining % data.settings.monthlyExpense;
                const weeklyExpense = data.settings.monthlyExpense / 4.35; // Average weeks per month
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

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm text-primary font-semibold">Tax Payable ({data.settings.taxRate}%)</p>
                  <p className="text-xs text-muted-foreground">Based on untaxed earnings</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(taxOwedLocal, data.settings.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${taxOwedUSD.toFixed(2)} USD
                  </p>
                </div>
              </div>
              
              {taxOwedLocal > 0 && (
                <Button 
                  onClick={handlePayTax} 
                  disabled={isPaying}
                  className="w-full mt-2"
                  variant="default"
                >
                  {isPaying ? "Processing..." : `Pay Tax (${formatCurrency(taxOwedLocal, data.settings.currency)})`}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Payment Card */}
      {taxOwedLocal > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Tax Due ({data.settings.taxRate}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Untaxed Earnings</span>
                <span className="font-semibold text-lg">{formatCurrency(taxOwedLocal / (data.settings.taxRate/100), data.settings.currency)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tax Amount ({data.settings.taxRate}%)</span>
                <span className="font-bold text-xl text-destructive">
                  {formatCurrency(taxOwedLocal, data.settings.currency)}
                </span>
              </div>
            </div>
            <Button 
              onClick={handlePayTax} 
              className="w-full"
              variant="destructive"
              disabled={isPaying}
            >
              {isPaying ? "Processing..." : "Pay Tax Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tax Summary if already paid */}
      {stats.totalTaxPaid > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Tax Paid</span>
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(stats.totalTaxPaid, data.settings.currency)}
              </span>
            </div>
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
              {data.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
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
    </div>
  );
};
