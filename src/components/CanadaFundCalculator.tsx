import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Dumbbell, Wallet, Coins, PiggyBank, Calculator, ArrowRightLeft, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number, currency: string = "CAD") => {
  if (!isFinite(value)) return "-";
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);
  } catch {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
};

const toNum = (v: string | number) => {
  const n = typeof v === "number" ? v : parseFloat(v as string);
  return isNaN(n) ? 0 : n;
};

interface SubExpense {
  id: string;
  name: string;
  amount: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  subExpenses: SubExpense[];
}

export default function CanadaFundCalculator() {
  const { toast } = useToast();
  
  // Inputs
  const [yearlySalaryCad, setYearlySalaryCad] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("22");

  // Gym / Health monthly inputs
  const [gymBoy, setGymBoy] = useState<string>("0");
  const [gymGirl, setGymGirl] = useState<string>("0");
  const [nutrition, setNutrition] = useState<string>("0");
  const [trainerPerMonth, setTrainerPerMonth] = useState<string>("0");

  // Dynamic expense categories with sub-expenses
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([
    {
      id: "ghar",
      name: "Ghar",
      emoji: "🏠",
      subExpenses: [{ id: "ghar-1", name: "Rent", amount: "2200" }],
    },
    {
      id: "ration",
      name: "Ration",
      emoji: "🛒",
      subExpenses: [{ id: "ration-1", name: "Groceries", amount: "1100" }],
    },
    {
      id: "utility",
      name: "Utility/Wash",
      emoji: "🧺",
      subExpenses: [{ id: "utility-1", name: "Utilities", amount: "350" }],
    },
    {
      id: "transport",
      name: "Transport",
      emoji: "🚌",
      subExpenses: [{ id: "transport-1", name: "Transit", amount: "260" }],
    },
    {
      id: "bhejna",
      name: "Bhejna/Transfer",
      emoji: "💸",
      subExpenses: [{ id: "bhejna-1", name: "Transfer", amount: "500" }],
    },
  ]);

  // Exchange rates
  const [cadToAed, setCadToAed] = useState<string>("2.60"); // 1 CAD -> AED (default)
  const [aedToPkr, setAedToPkr] = useState<string>("77.05"); // 1 AED -> PKR (default)
  const [cadToUsd, setCadToUsd] = useState<string>("0.71"); // 1 CAD -> USD (default)

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/CAD");
        const data = await response.json();
        
        if (data.rates) {
          setCadToAed(data.rates.AED.toFixed(4));
          setCadToUsd(data.rates.USD.toFixed(4));
          
          // Fetch PKR rate from AED
          const aedResponse = await fetch("https://api.exchangerate-api.com/v4/latest/AED");
          const aedData = await aedResponse.json();
          if (aedData.rates) {
            setAedToPkr(aedData.rates.PKR.toFixed(4));
          }
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        toast({
          title: "Exchange Rate Error",
          description: "Using default rates. You can update them manually.",
          variant: "destructive",
        });
      }
    };

    fetchExchangeRates();
  }, [toast]);

  // Tax Return (editable/static)
  const [taxReturn, setTaxReturn] = useState<string>("16051");

  // Functions to manage sub-expenses
  const addSubExpense = (categoryId: string) => {
    setExpenseCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subExpenses: [
                ...cat.subExpenses,
                {
                  id: `${categoryId}-${Date.now()}`,
                  name: "",
                  amount: "0",
                },
              ],
            }
          : cat
      )
    );
  };

  const removeSubExpense = (categoryId: string, subExpenseId: string) => {
    setExpenseCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subExpenses: cat.subExpenses.filter((sub) => sub.id !== subExpenseId),
            }
          : cat
      )
    );
  };

  const updateSubExpense = (
    categoryId: string,
    subExpenseId: string,
    field: "name" | "amount",
    value: string
  ) => {
    setExpenseCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              subExpenses: cat.subExpenses.map((sub) =>
                sub.id === subExpenseId ? { ...sub, [field]: value } : sub
              ),
            }
          : cat
      )
    );
  };

  // Calculate totals for each category
  const getCategoryTotal = (categoryId: string) => {
    const category = expenseCategories.find((cat) => cat.id === categoryId);
    if (!category) return 0;
    return category.subExpenses.reduce((sum, sub) => sum + toNum(sub.amount), 0);
  };

  // Derived values
  const monthlySalary = useMemo(() => toNum(yearlySalaryCad) / 12, [yearlySalaryCad]);
  const taxPerMonth = useMemo(() => monthlySalary * (toNum(taxRate) / 100), [monthlySalary, taxRate]);
  const afterTaxPerMonth = useMemo(() => monthlySalary - taxPerMonth, [monthlySalary, taxPerMonth]);
  const afterTaxPerYear = useMemo(() => afterTaxPerMonth * 12, [afterTaxPerMonth]);

  const gymMonthly = useMemo(
    () => toNum(gymBoy) + toNum(gymGirl) + toNum(nutrition) + toNum(trainerPerMonth),
    [gymBoy, gymGirl, nutrition, trainerPerMonth]
  );
  const gymYearly = useMemo(() => gymMonthly * 12, [gymMonthly]);

  const totalMonthlyExpense = useMemo(() => {
    const categoriesTotal = expenseCategories.reduce(
      (sum, cat) => sum + getCategoryTotal(cat.id),
      0
    );
    return gymMonthly + categoriesTotal;
  }, [gymMonthly, expenseCategories]);

  const yearlySavings = useMemo(
    () => (afterTaxPerMonth - totalMonthlyExpense) * 12,
    [afterTaxPerMonth, totalMonthlyExpense]
  );
  const halfYearSavings = useMemo(() => yearlySavings / 2, [yearlySavings]);

  const onlyDirham = useMemo(() => toNum(yearlySalaryCad) * toNum(cadToAed), [yearlySalaryCad, cadToAed]);
  const totalPKR = useMemo(
    () => toNum(yearlySalaryCad) * (toNum(cadToAed) * toNum(aedToPkr)),
    [yearlySalaryCad, cadToAed, aedToPkr]
  );
  const totalUSD = useMemo(() => toNum(yearlySalaryCad) * toNum(cadToUsd), [yearlySalaryCad, cadToUsd]);

  return (
    <div className="space-y-6">
      {/* Salary Calculations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Canada Fund — Salary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearly">Yearly Salary (CAD)</Label>
              <Input
                id="yearly"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="e.g., 72000"
                value={yearlySalaryCad}
                onChange={(e) => setYearlySalaryCad(e.target.value)}
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxReturn">Tax Return (CAD)</Label>
              <Input
                id="taxReturn"
                type="number"
                inputMode="decimal"
                step="any"
                value={taxReturn}
                onChange={(e) => setTaxReturn(e.target.value)}
                className="font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Monthly Salary</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(monthlySalary)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Tax per Month</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(taxPerMonth)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">After-Tax per Month</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(afterTaxPerMonth)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">After-Tax per Year</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(afterTaxPerYear)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gym / Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Gym & Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gymBoy">Gym Boy / Month</Label>
              <Input id="gymBoy" type="number" step="any" value={gymBoy} onChange={(e) => setGymBoy(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymGirl">Gym Girl / Month</Label>
              <Input id="gymGirl" type="number" step="any" value={gymGirl} onChange={(e) => setGymGirl(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nutrition">Nutrition / Month</Label>
              <Input id="nutrition" type="number" step="any" value={nutrition} onChange={(e) => setNutrition(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer">Trainer / Month</Label>
              <Input id="trainer" type="number" step="any" value={trainerPerMonth} onChange={(e) => setTrainerPerMonth(e.target.value)} className="font-mono-num" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Gym per Month</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(gymMonthly)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Gym per Year</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(gymYearly)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Monthly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gym - Auto calculated */}
          <div className="p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">💪 Gym (auto-calculated)</Label>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(gymMonthly)}</div>
            </div>
          </div>

          {/* Dynamic Expense Categories */}
          {expenseCategories.map((category) => {
            const categoryTotal = getCategoryTotal(category.id);
            return (
              <div key={category.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">
                    {category.emoji} {category.name}
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold font-mono-num">
                      {formatCurrency(categoryTotal)}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addSubExpense(category.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {category.subExpenses.map((subExpense, index) => (
                    <div key={subExpense.id} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Sub-expense name"
                          value={subExpense.name}
                          onChange={(e) =>
                            updateSubExpense(category.id, subExpense.id, "name", e.target.value)
                          }
                          className="text-sm"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            +
                          </span>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={subExpense.amount}
                            onChange={(e) =>
                              updateSubExpense(category.id, subExpense.id, "amount", e.target.value)
                            }
                            className="font-mono-num pl-7"
                          />
                        </div>
                      </div>
                      {category.subExpenses.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSubExpense(category.id, subExpense.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/20">
            <div className="text-sm text-muted-foreground">Total Monthly Expense</div>
            <div className="text-2xl font-bold font-mono-num">{formatCurrency(totalMonthlyExpense)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Savings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Savings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-sm text-muted-foreground">Yearly Savings</div>
            <div className="text-xl font-semibold font-mono-num">{formatCurrency(yearlySavings)}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-sm text-muted-foreground">Half-Year Savings</div>
            <div className="text-xl font-semibold font-mono-num">{formatCurrency(halfYearSavings)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Conversions */}
     

      {/* 3-Month Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            3-Month Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-5 rounded-lg bg-primary/10">
            <div className="text-sm text-muted-foreground">Three-Month Expense</div>
            <div className="text-3xl font-bold font-mono-num">{formatCurrency(totalMonthlyExpense * 3)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}