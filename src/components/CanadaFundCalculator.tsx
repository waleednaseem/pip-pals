import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Dumbbell, Wallet, Coins, PiggyBank, Calculator, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubExpense {
  id: string;
  label: string;
  amount: string;
}

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

  // Simple expense inputs
  const [ghar, setGhar] = useState<string>("2200");
  const [ration, setRation] = useState<string>("1100");
  const [utilityWash, setUtilityWash] = useState<string>("350");
  const [transport, setTransport] = useState<string>("260");
  const [bhejnaTransfer, setBhejnaTransfer] = useState<string>("500");

  // Track which expenses are expanded to show sub-expenses
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());

  // Sub-expenses for each category
  const [gharSubs, setGharSubs] = useState<SubExpense[]>([]);
  const [rationSubs, setRationSubs] = useState<SubExpense[]>([]);
  const [utilityWashSubs, setUtilityWashSubs] = useState<SubExpense[]>([]);
  const [transportSubs, setTransportSubs] = useState<SubExpense[]>([]);
  const [bhejnaTransferSubs, setBhejnaTransferSubs] = useState<SubExpense[]>([]);

  // Tax Return (editable/static)
  const [taxReturn, setTaxReturn] = useState<string>("16051");

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

  // Calculate totals - use sub-expenses if expanded, otherwise use simple value
  const gharTotal = useMemo(() => 
    expandedExpenses.has("ghar") 
      ? gharSubs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(ghar),
    [expandedExpenses, gharSubs, ghar]
  );

  const rationTotal = useMemo(() => 
    expandedExpenses.has("ration")
      ? rationSubs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(ration),
    [expandedExpenses, rationSubs, ration]
  );

  const utilityWashTotal = useMemo(() => 
    expandedExpenses.has("utilityWash")
      ? utilityWashSubs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(utilityWash),
    [expandedExpenses, utilityWashSubs, utilityWash]
  );

  const transportTotal = useMemo(() => 
    expandedExpenses.has("transport")
      ? transportSubs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(transport),
    [expandedExpenses, transportSubs, transport]
  );

  const bhejnaTransferTotal = useMemo(() => 
    expandedExpenses.has("bhejnaTransfer")
      ? bhejnaTransferSubs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(bhejnaTransfer),
    [expandedExpenses, bhejnaTransferSubs, bhejnaTransfer]
  );

  const totalMonthlyExpense = useMemo(
    () => gymMonthly + gharTotal + rationTotal + utilityWashTotal + transportTotal + bhejnaTransferTotal,
    [gymMonthly, gharTotal, rationTotal, utilityWashTotal, transportTotal, bhejnaTransferTotal]
  );

  // Helper functions for managing sub-expenses
  const expandExpense = (expenseKey: string, setter: React.Dispatch<React.SetStateAction<SubExpense[]>>) => {
    setExpandedExpenses(prev => new Set(prev).add(expenseKey));
    setter([{ id: "1", label: "", amount: "0" }]);
  };

  const addSubExpense = (setter: React.Dispatch<React.SetStateAction<SubExpense[]>>) => {
    setter(prev => [...prev, { id: Date.now().toString(), label: "", amount: "0" }]);
  };

  const updateSubExpense = (
    setter: React.Dispatch<React.SetStateAction<SubExpense[]>>,
    id: string,
    field: keyof SubExpense,
    value: string
  ) => {
    setter(prev => prev.map(sub => sub.id === id ? { ...sub, [field]: value } : sub));
  };

  const removeSubExpense = (setter: React.Dispatch<React.SetStateAction<SubExpense[]>>, id: string) => {
    setter(prev => prev.filter(sub => sub.id !== id));
  };

  // Render expense field (either simple input or sub-expenses)
  const renderExpenseField = (
    expenseKey: string,
    icon: string,
    label: string,
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    subs: SubExpense[],
    setSubs: React.Dispatch<React.SetStateAction<SubExpense[]>>,
    total: number
  ) => {
    const isExpanded = expandedExpenses.has(expenseKey);

    if (isExpanded) {
      return (
        <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-base font-semibold">{icon} {label}</Label>
              <span className="text-lg font-bold font-mono-num text-primary">{formatCurrency(total)}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addSubExpense(setSubs)}
              className="h-8 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          {subs.map((sub) => (
            <div key={sub.id} className="flex gap-2 items-center">
              <Input
                placeholder="Label"
                value={sub.label}
                onChange={(e) => updateSubExpense(setSubs, sub.id, "label", e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                step="any"
                value={sub.amount}
                onChange={(e) => updateSubExpense(setSubs, sub.id, "amount", e.target.value)}
                className="w-32 font-mono-num"
              />
              {subs.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSubExpense(setSubs, sub.id)}
                  className="h-9 w-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label>{icon} {label}</Label>
        <div className="relative">
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono-num pr-10"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => expandExpense(expenseKey, setSubs)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderExpenseField("ghar", "🏠", "Ghar", ghar, setGhar, gharSubs, setGharSubs, gharTotal)}
            {renderExpenseField("ration", "🛒", "Ration", ration, setRation, rationSubs, setRationSubs, rationTotal)}
            {renderExpenseField("utilityWash", "🧺", "Utility/Wash", utilityWash, setUtilityWash, utilityWashSubs, setUtilityWashSubs, utilityWashTotal)}
            {renderExpenseField("transport", "🚌", "Transport", transport, setTransport, transportSubs, setTransportSubs, transportTotal)}
            {renderExpenseField("bhejnaTransfer", "💸", "Bhejna/Transfer", bhejnaTransfer, setBhejnaTransfer, bhejnaTransferSubs, setBhejnaTransferSubs, bhejnaTransferTotal)}
            
            {/* Gym (auto-calculated) */}
            <div className="space-y-2">
              <Label>💪 Gym (auto)</Label>
              <Input 
                type="number" 
                value={String(gymMonthly)} 
                readOnly 
                className="font-mono-num bg-muted/30" 
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted border-2 border-primary/20">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Conversions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cadToAed">Exchange: 1 CAD → AED</Label>
              <Input id="cadToAed" type="number" step="any" value={cadToAed} onChange={(e) => setCadToAed(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aedToPkr">Exchange: 1 AED → PKR</Label>
              <Input id="aedToPkr" type="number" step="any" value={aedToPkr} onChange={(e) => setAedToPkr(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadToUsd">Exchange: 1 CAD → USD</Label>
              <Input id="cadToUsd" type="number" step="any" value={cadToUsd} onChange={(e) => setCadToUsd(e.target.value)} className="font-mono-num" />
            </div>
          </div>

          {toNum(yearlySalaryCad) === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ℹ️ Please enter your Yearly Salary above to see conversions
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Only Dirham (AED)</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(onlyDirham, "AED") : "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Total PKR</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(totalPKR, "PKR") : "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Total USD</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(totalUSD, "USD") : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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