import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Wallet, 
  Home, 
  PiggyBank, 
  TrendingUp,
  ChevronDown,
  Plus,
  X,
  Dumbbell,
  Stethoscope,
  Wifi,
  ShoppingBag,
  GraduationCap,
  Plane,
  Gift,
  Gamepad2,
  Baby,
  PawPrint
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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

// Addon expense categories
const ADDON_OPTIONS = [
  { id: "gym", label: "Gym", icon: Dumbbell, emoji: "🏋️" },
  { id: "nutrition", label: "Nutrition", icon: Stethoscope, emoji: "🥗" },
  { id: "medical", label: "Medical", icon: Stethoscope, emoji: "🏥" },
  { id: "internet", label: "Internet/Phone", icon: Wifi, emoji: "📱" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, emoji: "🛍️" },
  { id: "education", label: "Education", icon: GraduationCap, emoji: "📚" },
  { id: "travel", label: "Travel", icon: Plane, emoji: "✈️" },
  { id: "gifts", label: "Gifts", icon: Gift, emoji: "🎁" },
  { id: "entertainment", label: "Entertainment", icon: Gamepad2, emoji: "🎮" },
  { id: "childcare", label: "Childcare", icon: Baby, emoji: "👶" },
  { id: "pets", label: "Pets", icon: PawPrint, emoji: "🐾" },
];

export default function CanadaFundCalculator() {
  const { toast } = useToast();

  // Work Configuration
  const [hoursPerDay, setHoursPerDay] = useState<string>("8");
  const [daysPerWeek, setDaysPerWeek] = useState<string>("5");
  const [weeksPerYear, setWeeksPerYear] = useState<string>("52");

  // Salary
  const [salaryType, setSalaryType] = useState<string>("yearly");
  const [salaryAmount, setSalaryAmount] = useState<string>("");

  // Tax
  const [taxRate, setTaxRate] = useState<string>("22");

  // Expenses
  const [rent, setRent] = useState<string>("2200");
  const [groceries, setGroceries] = useState<string>("1100");
  const [utilities, setUtilities] = useState<string>("350");
  const [transport, setTransport] = useState<string>("260");
  const [familySupport, setFamilySupport] = useState<string>("500");

  // Addon expenses
  const [activeAddons, setActiveAddons] = useState<string[]>([]);
  const [addonValues, setAddonValues] = useState<Record<string, string>>({});
  const [addonPopoverOpen, setAddonPopoverOpen] = useState(false);

  // Exchange rates
  const [cadToAed, setCadToAed] = useState<string>("2.60");
  const [aedToPkr, setAedToPkr] = useState<string>("77.05");
  const [cadToUsd, setCadToUsd] = useState<string>("0.71");

  // Collapsible states
  const [showWorkConfig, setShowWorkConfig] = useState(false);
  const [showRates, setShowRates] = useState(false);

  const addAddon = (id: string) => {
    if (!activeAddons.includes(id)) {
      setActiveAddons([...activeAddons, id]);
      setAddonValues({ ...addonValues, [id]: "0" });
    }
    setAddonPopoverOpen(false);
  };

  const removeAddon = (id: string) => {
    setActiveAddons(activeAddons.filter(a => a !== id));
    const newValues = { ...addonValues };
    delete newValues[id];
    setAddonValues(newValues);
  };

  const updateAddonValue = (id: string, value: string) => {
    setAddonValues({ ...addonValues, [id]: value });
  };

  // Fetch exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/CAD");
        const data = await response.json();
        if (data.rates) {
          setCadToAed(data.rates.AED.toFixed(4));
          setCadToUsd(data.rates.USD.toFixed(4));
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
          description: "Using default rates.",
          variant: "destructive",
        });
      }
    };
    fetchExchangeRates();
  }, [toast]);

  // Calculate yearly salary from any input type
  const yearlySalary = useMemo(() => {
    const amount = toNum(salaryAmount);
    const h = toNum(hoursPerDay);
    const d = toNum(daysPerWeek);
    const w = toNum(weeksPerYear);

    switch (salaryType) {
      case "hourly": return amount * h * d * w;
      case "daily": return amount * d * w;
      case "monthly": return amount * 12;
      case "yearly": return amount;
      default: return 0;
    }
  }, [salaryAmount, salaryType, hoursPerDay, daysPerWeek, weeksPerYear]);

  const monthlySalary = yearlySalary / 12;
  const taxPerMonth = monthlySalary * (toNum(taxRate) / 100);
  const netMonthly = monthlySalary - taxPerMonth;
  const netYearly = netMonthly * 12;

  // Expenses
  const addonTotal = useMemo(() => {
    return activeAddons.reduce((sum, id) => sum + toNum(addonValues[id] || 0), 0);
  }, [activeAddons, addonValues]);

  const totalExpenses = useMemo(() => {
    return toNum(rent) + toNum(groceries) + toNum(utilities) + toNum(transport) + toNum(familySupport) + addonTotal;
  }, [rent, groceries, utilities, transport, familySupport, addonTotal]);

  const monthlySavings = netMonthly - totalExpenses;
  const yearlySavings = monthlySavings * 12;

  // Currency conversions
  const yearlyAed = yearlySalary * toNum(cadToAed);
  const yearlyPkr = yearlyAed * toNum(aedToPkr);
  const yearlyUsd = yearlySalary * toNum(cadToUsd);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-2">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Financial Plan
        </h1>
        <p className="text-muted-foreground text-sm">Calculate your income, expenses & savings</p>
      </div>

      {/* Income Section */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-semibold">Income</h2>
              <p className="text-xs text-muted-foreground">Enter your salary details</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salary Type</Label>
              <Select value={salaryType} onValueChange={setSalaryType}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="daily">Daily Rate</SelectItem>
                  <SelectItem value="monthly">Monthly Salary</SelectItem>
                  <SelectItem value="yearly">Yearly Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (CAD)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                className="glass-input font-mono"
              />
            </div>
          </div>

          {/* Work Config Collapsible */}
          {(salaryType === "hourly" || salaryType === "daily") && (
            <Collapsible open={showWorkConfig} onOpenChange={setShowWorkConfig}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${showWorkConfig ? 'rotate-180' : ''}`} />
                Work Configuration
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Hours/Day</Label>
                    <Input
                      type="number"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(e.target.value)}
                      className="h-9 glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Days/Week</Label>
                    <Input
                      type="number"
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(e.target.value)}
                      className="h-9 glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weeks/Year</Label>
                    <Input
                      type="number"
                      value={weeksPerYear}
                      onChange={(e) => setWeeksPerYear(e.target.value)}
                      className="h-9 glass-input"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Income Summary */}
          {yearlySalary > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Hourly</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(yearlySalary / (toNum(weeksPerYear) * toNum(daysPerWeek) * toNum(hoursPerDay)))}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Daily</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(yearlySalary / (toNum(weeksPerYear) * toNum(daysPerWeek)))}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Monthly</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(monthlySalary)}</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <div className="text-xs text-muted-foreground">Yearly</div>
                <div className="font-mono font-bold text-sm text-primary">{formatCurrency(yearlySalary)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Section */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold">Tax & Net Income</h2>
              <p className="text-xs text-muted-foreground">Calculate your take-home pay</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Tax Rate</Label>
            <Select value={taxRate} onValueChange={setTaxRate}>
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="15">15% - Low Income</SelectItem>
                <SelectItem value="20">20% - Lower Middle</SelectItem>
                <SelectItem value="22">22% - Average</SelectItem>
                <SelectItem value="26">26% - Middle Income</SelectItem>
                <SelectItem value="29">29% - Upper Middle</SelectItem>
                <SelectItem value="33">33% - High Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-xs text-muted-foreground mb-1">Monthly Tax</div>
              <div className="font-mono font-bold text-destructive">{formatCurrency(taxPerMonth)}</div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xs text-muted-foreground mb-1">Net Monthly</div>
              <div className="font-mono font-bold text-emerald-500">{formatCurrency(netMonthly)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Home className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="font-semibold">Monthly Expenses</h2>
              <p className="text-xs text-muted-foreground">Track your spending</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">🏠 Rent</Label>
              <Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} className="glass-input font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">🛒 Groceries</Label>
              <Input type="number" value={groceries} onChange={(e) => setGroceries(e.target.value)} className="glass-input font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">💡 Utilities</Label>
              <Input type="number" value={utilities} onChange={(e) => setUtilities(e.target.value)} className="glass-input font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">🚗 Transport</Label>
              <Input type="number" value={transport} onChange={(e) => setTransport(e.target.value)} className="glass-input font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">💸 Family Support</Label>
              <Input type="number" value={familySupport} onChange={(e) => setFamilySupport(e.target.value)} className="glass-input font-mono" />
            </div>
          </div>

          {/* Addons Section */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Additional Expenses</span>
              </div>
              <Popover open={addonPopoverOpen} onOpenChange={setAddonPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs glass-button">
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-background border border-border" align="end">
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {ADDON_OPTIONS.filter(opt => !activeAddons.includes(opt.id)).map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => addAddon(opt.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors text-left"
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    {ADDON_OPTIONS.filter(opt => !activeAddons.includes(opt.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">All addons added</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {activeAddons.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeAddons.map(id => {
                  const addon = ADDON_OPTIONS.find(o => o.id === id);
                  if (!addon) return null;
                  return (
                    <div key={id} className="space-y-1 relative group">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{addon.emoji} {addon.label}</Label>
                        <button
                          onClick={() => removeAddon(id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 transition-all"
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                      <Input
                        type="number"
                        value={addonValues[id] || "0"}
                        onChange={(e) => updateAddonValue(id, e.target.value)}
                        className="glass-input font-mono h-9"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-lg">
                Click "Add" to include optional expenses like Gym, Medical, Shopping, etc.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <span className="font-medium">Total Expenses</span>
            <span className="font-mono font-bold text-lg text-destructive">{formatCurrency(totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Savings Summary */}
      <Card className="glass-card overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="p-5 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Savings Summary</h2>
              <p className="text-xs text-muted-foreground">Your financial overview</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background/50 text-center">
              <div className="text-xs text-muted-foreground mb-1">Monthly Savings</div>
              <div className={`font-mono font-bold text-xl ${monthlySavings >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {formatCurrency(monthlySavings)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background/50 text-center">
              <div className="text-xs text-muted-foreground mb-1">Yearly Savings</div>
              <div className={`font-mono font-bold text-xl ${yearlySavings >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {formatCurrency(yearlySavings)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Conversions */}
      {yearlySalary > 0 && (
        <Card className="glass-card overflow-hidden">
          <Collapsible open={showRates} onOpenChange={setShowRates}>
            <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <h2 className="font-semibold">Currency Conversions</h2>
                  <p className="text-xs text-muted-foreground">Yearly salary in other currencies</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showRates ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-5 pt-0 space-y-4">
                {/* Exchange Rate Inputs */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs">CAD → AED</Label>
                    <Input type="number" step="any" value={cadToAed} onChange={(e) => setCadToAed(e.target.value)} className="h-9 glass-input font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">AED → PKR</Label>
                    <Input type="number" step="any" value={aedToPkr} onChange={(e) => setAedToPkr(e.target.value)} className="h-9 glass-input font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CAD → USD</Label>
                    <Input type="number" step="any" value={cadToUsd} onChange={(e) => setCadToUsd(e.target.value)} className="h-9 glass-input font-mono" />
                  </div>
                </div>

                {/* Conversion Results */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">AED (Yearly)</div>
                    <div className="font-mono font-semibold text-sm break-all">{formatCurrency(yearlyAed, "AED")}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">PKR (Yearly)</div>
                    <div className="font-mono font-semibold text-sm break-all">{formatCurrency(yearlyPkr, "PKR")}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">USD (Yearly)</div>
                    <div className="font-mono font-semibold text-sm break-all">{formatCurrency(yearlyUsd, "USD")}</div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
