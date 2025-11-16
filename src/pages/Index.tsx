import { useState, useEffect } from "react";
import { TradingPair, TradeEntry, Totals, CalculatorInputs } from "@/types/calculator";
import { calculateTrade } from "@/utils/calculator";
import {
  saveTradeToStorage,
  getTradesFromStorage,
  clearTradesFromStorage,
  saveSelectedPair,
  getSelectedPair,
  clearSelectedPair,
  exportTradesToCSV,
} from "@/utils/storage";
import PairSelector from "@/components/PairSelector";
import CalculatorForm from "@/components/CalculatorForm";
import TradeHistory from "@/components/TradeHistory";
import TotalsSummary from "@/components/TotalsSummary";
import TimeConversion from "@/components/TimeConversion";
import DynamicCalculator from "@/components/DynamicCalculator";
import ActionButtons from "@/components/ActionButtons";
import { Lifeline } from "@/components/Lifeline";
import { TaxHistory } from "@/components/TaxHistory";
import CanadaFundCalculator from "@/components/CanadaFundCalculator";
import CurrencyConverter from "@/components/CurrencyConverter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, Plus, Trash } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [activeTab, setActiveTab] = useState<
    "calculator" | "lifeline" | "tax" | "canada" | "converter" | "salary"
  >("calculator");
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedPair = getSelectedPair();
    if (savedPair) {
      setSelectedPair(savedPair);
      setTrades(getTradesFromStorage());
    }
  }, []);

  const handleSelectPair = (pair: TradingPair) => {
    setSelectedPair(pair);
    saveSelectedPair(pair);
    toast({
      title: "Pair selected",
      description: `Now calculating for ${pair}`,
    });
  };

  const handleCalculate = (inputs: CalculatorInputs) => {
    if (!selectedPair) return;

    const trade = calculateTrade(inputs, selectedPair);
    saveTradeToStorage(trade);
    setTrades((prev) => [...prev, trade]);

    toast({
      title: "Trade added",
      description: `${trade.direction} ${trade.pair} - ${trade.profit.amount >= 0 ? "Profit" : "Loss"}: ${trade.profit.amount.toFixed(2)} ${trade.profit.currency}`,
    });
  };

  const handleClearHistory = () => {
    clearTradesFromStorage();
    setTrades([]);
    toast({
      title: "History cleared",
      description: "All trade calculations have been removed",
    });
  };

  const handleExportCSV = () => {
    exportTradesToCSV(trades);
    toast({
      title: "Export successful",
      description: "CSV file has been downloaded",
    });
  };

  const handleChangePair = () => {
    clearSelectedPair();
    clearTradesFromStorage();
    setSelectedPair(null);
    setTrades([]);
    toast({
      title: "Pair changed",
      description: "History cleared. Select a new pair to continue",
    });
  };

  const calculateTotals = (): Totals => {
    const totalTrades = trades.length;
    const totalPipsSigned = trades.reduce((sum, trade) => {
      const signedPips =
        trade.direction === "BUY"
          ? trade.exit > trade.entry
            ? trade.pips
            : -trade.pips
          : trade.entry > trade.exit
          ? trade.pips
          : -trade.pips;
      return sum + signedPips;
    }, 0);
    const totalPipsAbsolute = trades.reduce((sum, trade) => sum + trade.pips, 0);
    const totalProfitAmount = trades.reduce(
      (sum, trade) => sum + trade.profit.amount,
      0
    );

    return {
      totalTrades,
      totalPipsSigned: parseFloat(totalPipsSigned.toFixed(2)),
      totalPipsAbsolute: parseFloat(totalPipsAbsolute.toFixed(2)),
      totalProfit: {
        amount: parseFloat(totalProfitAmount.toFixed(2)),
        currency: trades[0]?.profit.currency || "USD",
      },
    };
  };

  if (!selectedPair) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PairSelector selectedPair={selectedPair} onSelectPair={handleSelectPair} />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button - All Screen Sizes */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[380px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-xl">Tools & Summary</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6 pb-6">
                  {/* Collapsible Dynamic Calculator */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <span className="font-semibold">Dynamic Calculator</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <DynamicCalculator pair={selectedPair} />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Collapsible Totals Summary */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <span className="font-semibold">Totals Summary</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <TotalsSummary totals={totals} />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Collapsible Time Conversion */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <span className="font-semibold">Time Conversion</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <TimeConversion />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Forex Trading Tools</h1>
              <p className="text-muted-foreground mt-1">
                Calculate trades and manage your financial goals
              </p>
            </div>
          </div>
          <ActionButtons
            onClearHistory={handleClearHistory}
            onExportCSV={handleExportCSV}
            onChangePair={handleChangePair}
            hasHistory={trades.length > 0}
          />
        </div>

        {/* Tabs for Calculator and Lifeline */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "calculator" | "lifeline" | "tax" | "canada" | "converter" | "salary")} className="w-full">
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as "calculator" | "lifeline" | "tax" | "canada" | "converter" | "salary")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="calculator">Forex Pip Calculator</SelectItem>
                <SelectItem value="lifeline">Setup Your Lifeline</SelectItem>
                <SelectItem value="tax">Tax History</SelectItem>
                <SelectItem value="canada">Canada Fund</SelectItem>
                <SelectItem value="converter">Currency Converter</SelectItem>
                <SelectItem value="salary">Salary Calculator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden md:inline-flex w-full max-w-full md:overflow-x-auto whitespace-nowrap gap-1">
            <TabsTrigger className="flex-shrink-0" value="calculator">Forex Pip Calculator</TabsTrigger>
            <TabsTrigger className="flex-shrink-0" value="lifeline">Setup Your Lifeline</TabsTrigger>
            <TabsTrigger className="flex-shrink-0" value="tax">Tax History</TabsTrigger>
            <TabsTrigger className="flex-shrink-0" value="canada">Canada Fund</TabsTrigger>
            <TabsTrigger className="flex-shrink-0" value="converter">Currency Converter</TabsTrigger>
            <TabsTrigger className="flex-shrink-0" value="salary">Salary Calculator</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <CalculatorForm pair={selectedPair} onCalculate={handleCalculate} />
            <TradeHistory trades={trades} />
          </TabsContent>

          {/* Lifeline Tab */}
          <TabsContent value="lifeline" className="mt-6">
            <Lifeline trades={trades} />
          </TabsContent>

          {/* Tax History Tab */}
          <TabsContent value="tax" className="mt-6">
            {(() => {
              const lifelineData = localStorage.getItem("forex-lifeline-data");
              if (!lifelineData) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    Please setup your Lifeline first to track tax payments
                  </div>
                );
              }
              const data = JSON.parse(lifelineData);
              return (
                <TaxHistory 
                  taxPayments={data.taxPayments || []} 
                  currency={data.settings?.currency || "USD"} 
                />
              );
            })()}
          </TabsContent>

          {/* Canada Fund Calculator Tab */}
          <TabsContent value="canada" className="space-y-6 mt-6">
            <CanadaFundCalculator />
          </TabsContent>

          {/* Currency Converter Tab */}
          <TabsContent value="converter" className="space-y-6 mt-6">
            <CurrencyConverter />
          </TabsContent>
          <TabsContent value="salary" className="space-y-6 mt-6">
            <SalaryCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const SalaryCalculator = () => {
  const [salary, setSalary] = useState<number>(0);
  const [expenses, setExpenses] = useState<{
    id: string;
    name: string;
    amount: number;
    color: string;
  }[]>([]);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newAmount, setNewAmount] = useState<string>("");

  const colors = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-lime-500",
    "bg-cyan-500",
  ];

  const totalUsed = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(0, salary - totalUsed);
  const pct = (amount: number) => (salary > 0 ? (amount / salary) * 100 : 0);

  const addExpense = () => {
    const amountNum = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amountNum) || amountNum <= 0) return;
    const color = colors[expenses.length % colors.length];
    setExpenses((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newName.trim(), amount: amountNum, color },
    ]);
    setNewName("");
    setNewAmount("");
    setAdding(false);
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  let offset = 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Salary Calculator</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Input
              type="number"
              value={salary ? salary : ""}
              onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
              placeholder="Enter your salary"
            />
            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
              {expenses.map((e) => {
                const width = Math.max(0, Math.min(100 - offset, pct(e.amount)));
                const segment = (
                  <div
                    key={e.id}
                    className={`${e.color} absolute h-full`}
                    style={{ left: `${offset}%`, width: `${width}%` }}
                  />
                );
                offset += width;
                return segment;
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${e.color}`} />
                  <Badge variant="outline">
                    {e.name} · {e.amount.toLocaleString()} ({Math.round(pct(e.amount))}%)
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Used</span>
              <span className="font-medium">{totalUsed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="font-medium">{remaining.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {adding && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Expense name (e.g., Ration)"
            />
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Amount"
            />
            <Button onClick={addExpense}>Add</Button>
          </div>
        )}

        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${e.color}`} />
                <div className="font-medium">{e.name}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">{Math.round(pct(e.amount))}%</div>
                <div className="font-semibold">{e.amount.toLocaleString()}</div>
                <Button variant="ghost" size="icon" onClick={() => removeExpense(e.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;
