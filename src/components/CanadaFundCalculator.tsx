import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Dumbbell, Wallet, Coins, PiggyBank, Calculator, Plus, Trash2, Settings, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  
  // --- Work Configuration ---
  const [hoursPerDay, setHoursPerDay] = useState<string>("8");
  const [daysPerWeek, setDaysPerWeek] = useState<string>("5");
  const [weeksPerYear, setWeeksPerYear] = useState<string>("52");

  // --- Salary Inputs (Bidirectional) ---
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [dailyRate, setDailyRate] = useState<string>("");
  const [monthlySalary, setMonthlySalary] = useState<string>("");
  const [yearlySalaryCad, setYearlySalaryCad] = useState<string>("");

  const updateSalaries = (type: 'hourly' | 'daily' | 'monthly' | 'yearly', value: string) => {
    const val = parseFloat(value);
    
    if (value === "") {
        setHourlyRate("");
        setDailyRate("");
        setMonthlySalary("");
        setYearlySalaryCad("");
        return;
    }

    if (isNaN(val)) {
        // Allow typing negative or partial numbers without updating others yet
        switch(type) {
            case 'hourly': setHourlyRate(value); break;
            case 'daily': setDailyRate(value); break;
            case 'monthly': setMonthlySalary(value); break;
            case 'yearly': setYearlySalaryCad(value); break;
        }
        return;
    }

    const h = parseFloat(hoursPerDay) || 8;
    const d = parseFloat(daysPerWeek) || 5;
    const w = parseFloat(weeksPerYear) || 52;

    let yearly = 0;
    // Calculate Yearly first as the base truth
    switch (type) {
        case 'hourly': yearly = val * h * d * w; break;
        case 'daily': yearly = val * d * w; break;
        case 'monthly': yearly = val * 12; break;
        case 'yearly': yearly = val; break;
    }

    // Update all fields
    // We use Math.round or toFixed to avoid ugly floating point errors, but keep precision
    setYearlySalaryCad(type === 'yearly' ? value : yearly.toFixed(2).replace(/\.00$/, ''));
    setMonthlySalary(type === 'monthly' ? value : (yearly / 12).toFixed(2).replace(/\.00$/, ''));
    
    const calculatedDaily = yearly / w / d;
    setDailyRate(type === 'daily' ? value : calculatedDaily.toFixed(2).replace(/\.00$/, ''));
    
    const calculatedHourly = yearly / w / d / h;
    setHourlyRate(type === 'hourly' ? value : calculatedHourly.toFixed(2).replace(/\.00$/, ''));
  };

  // Update when config changes
  useEffect(() => {
    if (yearlySalaryCad) {
       updateSalaries('yearly', yearlySalaryCad);
    }
  }, [hoursPerDay, daysPerWeek, weeksPerYear]);


  // --- Other Inputs ---
  const [taxRate, setTaxRate] = useState<string>("22");
  const [taxReturn, setTaxReturn] = useState<string>("16051");

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

  // Derived values
  const monthlySalaryNum = toNum(monthlySalary);
  const taxPerMonth = useMemo(() => monthlySalaryNum * (toNum(taxRate) / 100), [monthlySalaryNum, taxRate]);
  const afterTaxPerMonth = useMemo(() => monthlySalaryNum - taxPerMonth, [monthlySalaryNum, taxPerMonth]);
  const afterTaxPerYear = useMemo(() => afterTaxPerMonth * 12, [afterTaxPerMonth]);

  const gymMonthly = useMemo(
    () => toNum(gymBoy) + toNum(gymGirl) + toNum(nutrition) + toNum(trainerPerMonth),
    [gymBoy, gymGirl, nutrition, trainerPerMonth]
  );
  const gymYearly = useMemo(() => gymMonthly * 12, [gymMonthly]);

  // Calculate totals - use sub-expenses if expanded, otherwise use simple value
  const calculateExpenseTotal = (
    baseValue: string, 
    subs: SubExpense[], 
    isExpanded: boolean
  ) => {
    return isExpanded 
      ? subs.reduce((sum, sub) => sum + toNum(sub.amount), 0)
      : toNum(baseValue);
  };

  const gharTotal = useMemo(() => calculateExpenseTotal(ghar, gharSubs, expandedExpenses.has("ghar")), [ghar, gharSubs, expandedExpenses]);
  const rationTotal = useMemo(() => calculateExpenseTotal(ration, rationSubs, expandedExpenses.has("ration")), [ration, rationSubs, expandedExpenses]);
  const utilityWashTotal = useMemo(() => calculateExpenseTotal(utilityWash, utilityWashSubs, expandedExpenses.has("utilityWash")), [utilityWash, utilityWashSubs, expandedExpenses]);
  const transportTotal = useMemo(() => calculateExpenseTotal(transport, transportSubs, expandedExpenses.has("transport")), [transport, transportSubs, expandedExpenses]);
  const bhejnaTransferTotal = useMemo(() => calculateExpenseTotal(bhejnaTransfer, bhejnaTransferSubs, expandedExpenses.has("bhejnaTransfer")), [bhejnaTransfer, bhejnaTransferSubs, expandedExpenses]);

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

  // Render expense field
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
            <div key={sub.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <Input
                placeholder="Item name"
                value={sub.label}
                onChange={(e) => updateSubExpense(setSubs, sub.id, "label", e.target.value)}
                className="flex-1 min-w-0"
              />
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="any"
                  placeholder="Amount"
                  value={sub.amount}
                  onChange={(e) => updateSubExpense(setSubs, sub.id, "amount", e.target.value)}
                  className="w-full sm:w-28 font-mono-num"
                />
                {subs.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSubExpense(setSubs, sub.id)}
                    className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
      {/* Income & Tax Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Income Settings
              </div>
              <Accordion type="single" collapsible className="w-full max-w-[150px]">
                <AccordionItem value="settings" className="border-none">
                  <AccordionTrigger className="py-0 text-sm hover:no-underline text-muted-foreground">
                    <Settings className="h-4 w-4 mr-1" /> Config
                  </AccordionTrigger>
                  <AccordionContent className="absolute bg-background border p-4 rounded-lg shadow-lg z-10 mt-2 w-[250px] right-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Hours / Day</Label>
                        <Input value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Days / Week</Label>
                        <Input value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Weeks / Year</Label>
                        <Input value={weeksPerYear} onChange={(e) => setWeeksPerYear(e.target.value)} className="h-8" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly">Hourly Rate</Label>
                <Input
                  id="hourly"
                  type="number"
                  placeholder="0.00"
                  value={hourlyRate}
                  onChange={(e) => updateSalaries('hourly', e.target.value)}
                  className="font-mono-num"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily">Daily Income</Label>
                <Input
                  id="daily"
                  type="number"
                  placeholder="0.00"
                  value={dailyRate}
                  onChange={(e) => updateSalaries('daily', e.target.value)}
                  className="font-mono-num"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly">Monthly Salary</Label>
                <Input
                  id="monthly"
                  type="number"
                  placeholder="0.00"
                  value={monthlySalary}
                  onChange={(e) => updateSalaries('monthly', e.target.value)}
                  className="font-mono-num"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly">Yearly Salary</Label>
                <Input
                  id="yearly"
                  type="number"
                  placeholder="0.00"
                  value={yearlySalaryCad}
                  onChange={(e) => updateSalaries('yearly', e.target.value)}
                  className="font-mono-num font-bold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Tax & Net Income
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="font-mono-num"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxReturn">Est. Tax Return (Yearly)</Label>
                <Input
                  id="taxReturn"
                  type="number"
                  value={taxReturn}
                  onChange={(e) => setTaxReturn(e.target.value)}
                  className="font-mono-num"
                />
              </div>
            </div>
            
            <div className="pt-2 space-y-3">
              <div className="flex justify-between items-center p-2 rounded bg-muted/40">
                <span className="text-sm text-muted-foreground">Tax per Month</span>
                <span className="font-mono-num font-medium text-destructive">{formatCurrency(taxPerMonth)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">Net Pay per Month</span>
                <span className="font-mono-num font-bold text-lg text-primary">{formatCurrency(afterTaxPerMonth)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenses */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Living Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderExpenseField("ghar", "🏠", "Ghar (Rent)", ghar, setGhar, gharSubs, setGharSubs, gharTotal)}
            {renderExpenseField("ration", "🛒", "Ration (Groceries)", ration, setRation, rationSubs, setRationSubs, rationTotal)}
            {renderExpenseField("utilityWash", "🧺", "Utilities / Wash", utilityWash, setUtilityWash, utilityWashSubs, setUtilityWashSubs, utilityWashTotal)}
            {renderExpenseField("transport", "🚌", "Transport", transport, setTransport, transportSubs, setTransportSubs, transportTotal)}
            {renderExpenseField("bhejnaTransfer", "💸", "Family Support", bhejnaTransfer, setBhejnaTransfer, bhejnaTransferSubs, setBhejnaTransferSubs, bhejnaTransferTotal)}
            
            <div className="pt-4 border-t mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Living Total</span>
                <span className="font-mono-num font-bold">{formatCurrency(gharTotal + rationTotal + utilityWashTotal + transportTotal + bhejnaTransferTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gym & Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Gym & Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gymBoy">Gym (Self)</Label>
                <Input id="gymBoy" type="number" value={gymBoy} onChange={(e) => setGymBoy(e.target.value)} className="font-mono-num" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymGirl">Gym (Partner)</Label>
                <Input id="gymGirl" type="number" value={gymGirl} onChange={(e) => setGymGirl(e.target.value)} className="font-mono-num" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nutrition">Nutrition</Label>
                <Input id="nutrition" type="number" value={nutrition} onChange={(e) => setNutrition(e.target.value)} className="font-mono-num" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer">Trainer</Label>
                <Input id="trainer" type="number" value={trainerPerMonth} onChange={(e) => setTrainerPerMonth(e.target.value)} className="font-mono-num" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">Total Health</span>
              <span className="font-mono-num font-bold">{formatCurrency(gymMonthly)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Savings Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Savings Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Expenses</span>
              <span className="font-mono-num font-medium text-destructive">-{formatCurrency(totalMonthlyExpense)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-primary/20">
              <span className="font-semibold text-lg">Monthly Savings</span>
              <span className={`font-mono-num font-bold text-lg ${afterTaxPerMonth - totalMonthlyExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(afterTaxPerMonth - totalMonthlyExpense)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
               <div className="p-2 rounded bg-background/50 text-center">
                 <div className="text-xs text-muted-foreground">Yearly Savings</div>
                 <div className="font-mono-num font-semibold">{formatCurrency(yearlySavings)}</div>
               </div>
               <div className="p-2 rounded bg-background/50 text-center">
                 <div className="text-xs text-muted-foreground">Half-Year</div>
                 <div className="font-mono-num font-semibold">{formatCurrency(halfYearSavings)}</div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Conversions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cadToAed">1 CAD → AED</Label>
              <Input id="cadToAed" type="number" step="any" value={cadToAed} onChange={(e) => setCadToAed(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aedToPkr">1 AED → PKR</Label>
              <Input id="aedToPkr" type="number" step="any" value={aedToPkr} onChange={(e) => setAedToPkr(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadToUsd">1 CAD → USD</Label>
              <Input id="cadToUsd" type="number" step="any" value={cadToUsd} onChange={(e) => setCadToUsd(e.target.value)} className="font-mono-num" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Yearly in AED</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(onlyDirham, "AED") : "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Yearly in PKR</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(totalPKR, "PKR") : "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Yearly in USD</div>
              <div className="text-lg font-semibold font-mono-num">
                {toNum(yearlySalaryCad) > 0 ? formatCurrency(totalUSD, "USD") : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
