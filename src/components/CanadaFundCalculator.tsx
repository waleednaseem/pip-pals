import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Home, Dumbbell, Wallet, Coins, PiggyBank, Calculator, ArrowRightLeft } from "lucide-react";

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
  // Inputs
  const [yearlySalaryCad, setYearlySalaryCad] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("22");

  // Gym / Health monthly inputs
  const [gymBoy, setGymBoy] = useState<string>("0");
  const [gymGirl, setGymGirl] = useState<string>("0");
  const [nutrition, setNutrition] = useState<string>("0");
  const [trainerPerMonth, setTrainerPerMonth] = useState<string>("0");

  // Exchange rates
  const [cadToAed, setCadToAed] = useState<string>("0"); // 1 CAD -> AED
  const [aedToPkr, setAedToPkr] = useState<string>("0"); // 1 AED -> PKR

  // Default monthly expenses (editable)
  const [ghar, setGhar] = useState<string>("2200");
  const [ration, setRation] = useState<string>("1100");
  const [utilityWash, setUtilityWash] = useState<string>("350");
  const [transport, setTransport] = useState<string>("260");
  const [bhejnaTransfer, setBhejnaTransfer] = useState<string>("500");

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

  const totalMonthlyExpense = useMemo(
    () => gymMonthly + toNum(ghar) + toNum(ration) + toNum(utilityWash) + toNum(transport) + toNum(bhejnaTransfer),
    [gymMonthly, ghar, ration, utilityWash, transport, bhejnaTransfer]
  );

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
  const totalUSD = useMemo(() => toNum(yearlySalaryCad) / 1.4, [yearlySalaryCad]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ghar">🏠 Ghar</Label>
              <Input id="ghar" type="number" step="any" value={ghar} onChange={(e) => setGhar(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ration">🛒 Ration</Label>
              <Input id="ration" type="number" step="any" value={ration} onChange={(e) => setRation(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gym">💪 Gym (auto)</Label>
              <Input id="gym" type="number" value={String(gymMonthly)} readOnly className="font-mono-num bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utilityWash">🧺 Utility/Wash</Label>
              <Input id="utilityWash" type="number" step="any" value={utilityWash} onChange={(e) => setUtilityWash(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transport">🚌 Transport</Label>
              <Input id="transport" type="number" step="any" value={transport} onChange={(e) => setTransport(e.target.value)} className="font-mono-num" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bhejna">💸 Bhejna/Transfer</Label>
              <Input id="bhejna" type="number" step="any" value={bhejnaTransfer} onChange={(e) => setBhejnaTransfer(e.target.value)} className="font-mono-num" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
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
              <Label htmlFor="usdRate">CAD → USD (fixed)</Label>
              <Input id="usdRate" type="text" value="÷ 1.4" readOnly className="font-mono-num bg-muted/30" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Only Dirham (AED)</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(onlyDirham, "AED")}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Total PKR</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(totalPKR, "PKR")}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-sm text-muted-foreground">Total USD</div>
              <div className="text-lg font-semibold font-mono-num">{formatCurrency(totalUSD, "USD")}</div>
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