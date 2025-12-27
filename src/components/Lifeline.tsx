import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, PlusCircle, Trash2, TrendingUp, TrendingDown, Target, Calendar, DollarSign, AlertCircle, Settings2, Download } from "lucide-react";
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
  const [currency, setCurrency] = useState("USD");
  const [periodMonths, setPeriodMonths] = useState("1");
  const [taxRate, setTaxRate] = useState("30");

  // Transaction form states
  const [transAmount, setTransAmount] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transType, setTransType] = useState<"expense" | "earning">("expense");

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
      startDate: new Date().toISOString(),
      periodMonths: parseInt(periodMonths),
      taxRate: parseFloat(taxRate) || 30,
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
    doc.text("DESCRIPTION", 55, y + 7);
    doc.text("TYPE", 120, y + 7);
    doc.text("STATUS", 145, y + 7);
    doc.text("AMOUNT", 175, y + 7);

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
        doc.text("DESCRIPTION", 55, y + 7);
        doc.text("TYPE", 120, y + 7);
        doc.text("STATUS", 145, y + 7);
        doc.text("AMOUNT", 175, y + 7);
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
      const desc = transaction.description.length > 25 
        ? transaction.description.substring(0, 25) + "..." 
        : transaction.description;
      doc.text(desc, 55, y + 4);
      
      // Type with styling
      if (transaction.type === "earning") {
        doc.setTextColor(22, 101, 52); // green-800
        doc.text("CREDIT", 120, y + 4);
      } else if (transaction.type === "tax") {
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text("TAX", 120, y + 4);
      } else {
        doc.setTextColor(153, 27, 27); // red-800
        doc.text("DEBIT", 120, y + 4);
      }
      
      // Tax Status
      if (transaction.type === "earning") {
        if (transaction.taxed) {
          doc.setTextColor(22, 101, 52); // green-800
          doc.text("TAXED", 145, y + 4);
        } else {
          doc.setTextColor(180, 83, 9); // amber-700
          doc.text("UNTAXED", 145, y + 4);
        }
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("-", 145, y + 4);
      }
      
      // Amount with color
      if (transaction.type === "earning") {
        doc.setTextColor(22, 101, 52);
        doc.text(`+${formatCurrency(transaction.amount, data.settings.currency)}`, 175, y + 4);
      } else {
        doc.setTextColor(153, 27, 27);
        doc.text(`-${formatCurrency(transaction.amount, data.settings.currency)}`, 175, y + 4);
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Setup Your Lifeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-expense">Monthly Expense Target</Label>
            <Input
              id="monthly-expense"
              type="number"
              placeholder="e.g. 2000"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                placeholder="e.g. 30"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tracking Period</Label>
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSetup} className="w-full">
            Start Tracking
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !data) return null;

  const quotaStatus = stats.progressPercent >= 100 ? "complete" : "active";
  const taxOwedLocal = calculateTaxOwed(data, exchangeRate);
  const taxOwedUSD = taxOwedLocal / exchangeRate;

  // Calculate USD to Local conversion display
  const usdToLocalDisplay = `1 USD = ${exchangeRate.toFixed(2)} ${data.settings.currency}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary">Your Lifeline</h2>
        <div className="flex items-center gap-4">
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
