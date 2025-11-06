import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, Trash2, TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import { TradeEntry } from "@/types/calculator";
import { LifelineData, Transaction, LifelineStats } from "@/types/lifeline";
import {
  getLifelineData,
  initializeLifeline,
  addTransaction,
  deleteTransaction,
  calculateLifelineStats,
  formatCurrency,
} from "@/utils/lifeline";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

interface LifelineProps {
  trades: TradeEntry[];
}

export const Lifeline = ({ trades }: LifelineProps) => {
  const [data, setData] = useState<LifelineData | null>(null);
  const [stats, setStats] = useState<LifelineStats | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const { toast } = useToast();

  // Setup form states
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [periodMonths, setPeriodMonths] = useState("1");

  // Transaction form states
  const [transAmount, setTransAmount] = useState("");
  const [transDescription, setTransDescription] = useState("");
  const [transType, setTransType] = useState<"expense" | "earning">("expense");

  useEffect(() => {
    loadData();
  }, [trades]);

  const loadData = () => {
    const lifelineData = getLifelineData();
    if (lifelineData) {
      setData(lifelineData);
      setIsSetup(true);
      const calculatedStats = calculateLifelineStats(lifelineData, trades);
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
      currency,
      startDate: new Date().toISOString(),
      periodMonths: parseInt(periodMonths),
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

    const transaction: Transaction = {
      id: uuidv4(),
      amount: parseFloat(transAmount),
      description: transDescription,
      date: new Date().toISOString(),
      type: transType,
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

  const handleReset = () => {
    localStorage.removeItem("forex-lifeline-data");
    setData(null);
    setStats(null);
    setIsSetup(false);
    setMonthlyExpense("");
    
    toast({
      title: "Lifeline Reset",
      description: "All lifeline data has been cleared",
    });
  };

  if (!isSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Setup Your Lifeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyExpense">Monthly Expenses</Label>
            <Input
              id="monthlyExpense"
              type="number"
              placeholder="Enter your monthly expenses"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="PKR">PKR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Tracking Period</Label>
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSetup} className="w-full">
            Activate Lifeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !data) return null;

  const quotaStatus = stats.progressPercent >= 100 ? "complete" : "active";

  return (
    <div className="space-y-4">
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
            
            {/* Show how many months/weeks filled */}
            <div className="text-sm text-muted-foreground">
              {(() => {
                const monthsFilled = Math.floor(stats.remaining / data.settings.monthlyExpense);
                const remainingAfterMonths = stats.remaining % data.settings.monthlyExpense;
                const weeklyExpense = data.settings.monthlyExpense / 4.35; // Average weeks per month
                const weeksFilled = Math.floor(remainingAfterMonths / weeklyExpense);
                
                return (
                  <span>
                    Quota Filled: <span className="font-semibold text-foreground">{monthsFilled} months</span> and <span className="font-semibold text-foreground">{weeksFilled} weeks</span> out of {data.settings.periodMonths} months
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

          {/* Weekly Target */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Weekly Target</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(stats.weeklyTarget, data.settings.currency)}
            </p>
          </div>

          {/* Net Balance */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className={`text-2xl font-bold ${stats.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(stats.remaining, data.settings.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transAmount">Amount</Label>
              <Input
                id="transAmount"
                type="number"
                placeholder="0.00"
                value={transAmount}
                onChange={(e) => setTransAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transType">Type</Label>
              <Select value={transType} onValueChange={(value: "expense" | "earning") => setTransType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="earning">Earning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transDescription">Description</Label>
            <Input
              id="transDescription"
              placeholder="What is this transaction for?"
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
