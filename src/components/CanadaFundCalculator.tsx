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
  PawPrint,
  Globe,
  Download
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
import jsPDF from "jspdf";

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

type TaxBracket = { min: number; max: number; rate: number; label: string };

const calcProgressiveTax = (income: number, brackets: TaxBracket[]): number => {
  if (income <= 0) return 0;
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    if (taxable > 0) tax += taxable * (b.rate / 100);
  }
  return tax;
};

const safeDiv = (num: number, den: number): number => (den > 0 ? num / den : 0);

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

  // Country & Salary
  const [selectedCountry, setSelectedCountry] = useState<keyof typeof COUNTRY_TAX_CONFIG>("canada");
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

  // Exchange rates (from selected country currency → target)
  const [fxRates, setFxRates] = useState({ AED: "2.60", PKR: "200.00", USD: "0.71" });

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

  // Fetch exchange rates for selected country currency
  useEffect(() => {
    const base = COUNTRY_TAX_CONFIG[selectedCountry].currency;
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.rates) {
          setFxRates({
            AED: (data.rates.AED ?? 1).toFixed(4),
            PKR: (data.rates.PKR ?? 1).toFixed(4),
            USD: (data.rates.USD ?? 1).toFixed(4),
          });
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
  }, [selectedCountry, toast]);

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

  // Get tax rate based on country and income
  const countryConfig = COUNTRY_TAX_CONFIG[selectedCountry];
  const applicableBracket = useMemo(() => {
    return countryConfig.brackets.find(b => yearlySalary >= b.min && yearlySalary < b.max) || countryConfig.brackets[0];
  }, [yearlySalary, countryConfig]);

  const effectiveTaxRate =
    yearlySalary > 0 ? (calcProgressiveTax(yearlySalary, countryConfig.brackets) / yearlySalary) * 100 : 0;

  const yearlyTax = calcProgressiveTax(yearlySalary, countryConfig.brackets);
  const monthlySalary = yearlySalary / 12;
  const taxPerMonth = yearlyTax / 12;
  const netMonthly = monthlySalary - taxPerMonth;
  const netYearly = netMonthly * 12;

  const workDenominator = toNum(weeksPerYear) * toNum(daysPerWeek) * toNum(hoursPerDay);
  const dayDenominator = toNum(weeksPerYear) * toNum(daysPerWeek);

  // Auto-update tax rate when country or salary changes
  useEffect(() => {
    setTaxRate(applicableBracket.rate.toString());
  }, [applicableBracket]);

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
  const yearlyAed = yearlySalary * toNum(fxRates.AED);
  const yearlyPkr = yearlySalary * toNum(fxRates.PKR);
  const yearlyUsd = yearlySalary * toNum(fxRates.USD);

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    const currency = countryConfig.currency;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addLine = (leftText: string, rightText: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.text(leftText, 20, y);
      doc.text(rightText, pageWidth - 20, y, { align: "right" });
      y += 7;
    };

    const addSection = (title: string) => {
      y += 4;
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y - 5, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, 20, y);
      doc.setTextColor(0, 0, 0);
      y += 10;
    };

    const addDivider = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 5;
    };

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("FINANCIAL PLAN REPORT", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${countryConfig.flag} ${countryConfig.name} • Generated: ${new Date().toLocaleDateString("en-CA")}`, pageWidth / 2, 28, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y = 52;

    // Income Section
    addSection("💰 INCOME OVERVIEW");
    addLine("Salary Type", salaryType.charAt(0).toUpperCase() + salaryType.slice(1));
    addLine("Gross Yearly Salary", formatCurrency(yearlySalary, currency), true);
    addLine("Gross Monthly Salary", formatCurrency(monthlySalary, currency));
    addLine("Hourly Rate", formatCurrency(safeDiv(yearlySalary, workDenominator), currency));
    addLine("Daily Rate", formatCurrency(safeDiv(yearlySalary, dayDenominator), currency));

    // Tax Section
    addSection("🏛️ TAX BREAKDOWN");
    addLine("Country", `${countryConfig.name}`);
    addLine("Tax Bracket", `${applicableBracket.rate}% (marginal)`);
    addLine("Effective Tax Rate", `${effectiveTaxRate.toFixed(1)}%`);
    addLine("Monthly Tax Deduction", formatCurrency(taxPerMonth, currency));
    addLine("Yearly Tax", formatCurrency(yearlyTax, currency));
    addLine("Net Monthly Income", formatCurrency(netMonthly, currency), true);
    addLine("Net Yearly Income", formatCurrency(netYearly, currency), true);

    // Expenses Section
    addSection("📋 MONTHLY EXPENSES");
    addLine("🏠 Rent", formatCurrency(toNum(rent), currency));
    addLine("🛒 Groceries", formatCurrency(toNum(groceries), currency));
    addLine("💡 Utilities", formatCurrency(toNum(utilities), currency));
    addLine("🚗 Transport", formatCurrency(toNum(transport), currency));
    addLine("💸 Family Support", formatCurrency(toNum(familySupport), currency));

    // Addon expenses
    if (activeAddons.length > 0) {
      addDivider();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("Additional Expenses:", 20, y);
      y += 7;
      activeAddons.forEach(id => {
        const addon = ADDON_OPTIONS.find(o => o.id === id);
        if (addon) {
          addLine(`${addon.emoji} ${addon.label}`, formatCurrency(toNum(addonValues[id] || "0"), currency));
        }
      });
    }

    addDivider();
    addLine("TOTAL MONTHLY EXPENSES", formatCurrency(totalExpenses, currency), true);
    addLine("TOTAL YEARLY EXPENSES", formatCurrency(totalExpenses * 12, currency), true);

    // Savings Section
    addSection("💎 SAVINGS SUMMARY");
    const savingsColor = monthlySavings >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(savingsColor[0], savingsColor[1], savingsColor[2]);
    addLine("Monthly Savings", formatCurrency(monthlySavings, currency), true);
    addLine("Yearly Savings", formatCurrency(yearlySavings, currency), true);
    doc.setTextColor(0, 0, 0);
    y += 3;
    addLine("Savings Rate", `${((monthlySavings / netMonthly) * 100).toFixed(1)}% of net income`);

    // Currency Conversions
    if (yearlySalary > 0) {
      addSection("🌍 CURRENCY CONVERSIONS (Yearly Salary)");
      addLine("AED", formatCurrency(yearlyAed, "AED"));
      addLine("PKR", formatCurrency(yearlyPkr, "PKR"));
      addLine("USD", formatCurrency(yearlyUsd, "USD"));
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by Financial Plan • Daily Planning", pageWidth / 2, y, { align: "center" });

    doc.save(`financial-plan-${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "PDF Exported", description: "Your financial plan report has been downloaded." });
  };

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
        <Button
          onClick={exportToPDF}
          variant="outline"
          size="sm"
          className="mt-2 gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
        >
          <Download className="w-4 h-4" />
          Export PDF Report
        </Button>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Hourly</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(safeDiv(yearlySalary, workDenominator), countryConfig.currency)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Daily</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(safeDiv(yearlySalary, dayDenominator), countryConfig.currency)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Weekly</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(safeDiv(yearlySalary, toNum(weeksPerYear)), countryConfig.currency)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="text-xs text-muted-foreground">Monthly</div>
                <div className="font-mono font-semibold text-sm">{formatCurrency(monthlySalary, countryConfig.currency)}</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <div className="text-xs text-muted-foreground">Yearly</div>
                <div className="font-mono font-bold text-sm text-primary">{formatCurrency(yearlySalary, countryConfig.currency)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Country & Tax Section */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Globe className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold">Country & Tax</h2>
              <p className="text-xs text-muted-foreground">Tax rates auto-adjust by country</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={selectedCountry} onValueChange={(val) => setSelectedCountry(val as keyof typeof COUNTRY_TAX_CONFIG)}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {Object.entries(COUNTRY_TAX_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{config.flag}</span>
                        <span>{config.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax Bracket</Label>
              <Select value={taxRate} onValueChange={setTaxRate}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border max-h-60">
                  {countryConfig.brackets.map((bracket, idx) => (
                    <SelectItem key={idx} value={bracket.rate.toString()}>
                      {bracket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Country Tax Info */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">{countryConfig.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-xs text-muted-foreground mb-1">Effective Tax ({effectiveTaxRate.toFixed(1)}%)</div>
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
                    <Label className="text-xs">{countryConfig.currency} → AED</Label>
                    <Input type="number" step="any" value={fxRates.AED} onChange={(e) => setFxRates({ ...fxRates, AED: e.target.value })} className="h-9 glass-input font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{countryConfig.currency} → PKR</Label>
                    <Input type="number" step="any" value={fxRates.PKR} onChange={(e) => setFxRates({ ...fxRates, PKR: e.target.value })} className="h-9 glass-input font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{countryConfig.currency} → USD</Label>
                    <Input type="number" step="any" value={fxRates.USD} onChange={(e) => setFxRates({ ...fxRates, USD: e.target.value })} className="h-9 glass-input font-mono" />
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
