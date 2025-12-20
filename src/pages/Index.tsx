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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Menu, ChevronDown, Plus, Trash } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Index = () => {
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
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="canada" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="pair">Select Pair</TabsTrigger>
              <TabsTrigger value="canada">Canada Fund</TabsTrigger>
              <TabsTrigger value="converter">Currency Converter</TabsTrigger>
            </TabsList>

            <TabsContent value="pair" className="mt-6">
              <PairSelector selectedPair={selectedPair} onSelectPair={handleSelectPair} />
            </TabsContent>

            <TabsContent value="canada" className="mt-6">
              <CanadaFundCalculator />
            </TabsContent>

            <TabsContent value="converter" className="mt-6">
              <CurrencyConverter />
            </TabsContent>
          </Tabs>
        </div>
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
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="calculator">Forex Pip Calculator</TabsTrigger>
            <TabsTrigger value="lifeline">Setup Your Lifeline</TabsTrigger>
            <TabsTrigger value="tax">Tax History</TabsTrigger>
            <TabsTrigger value="canada">Canada Fund</TabsTrigger>
            <TabsTrigger value="converter">Currency Converter</TabsTrigger>
            <TabsTrigger value="salary">Salary Calculator</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <CalculatorForm pair={selectedPair} onCalculate={handleCalculate} />
            <TradeHistory trades={trades} />
          </TabsContent>

          {/* Lifeline Tab */}
          <TabsContent value="lifeline" className="mt-6">
            <Lifeline />
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

          {/* Salary Calculator Tab */}
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
    subExpenses: { id: string; name: string; amount: number }[];
    allowSubExpenses: boolean;
  }[]>([]);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newAmount, setNewAmount] = useState<string>("");
  
  // Sub-expense states
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<string>("");
  const [newSubAmount, setNewSubAmount] = useState<string>("");

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
    if (!newName.trim() || isNaN(amountNum) || amountNum < 0) return;
    
    const allowSubExpenses = amountNum === 0;
    const color = colors[expenses.length % colors.length];
    
    setExpenses((prev) => [
      ...prev,
      { 
        id: crypto.randomUUID(), 
        name: newName.trim(), 
        amount: amountNum, 
        color,
        subExpenses: [],
        allowSubExpenses
      },
    ]);
    setNewName("");
    setNewAmount("");
    setAdding(false);
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addSubExpense = (expenseId: string) => {
    const amountNum = parseFloat(newSubAmount);
    if (!newSubName.trim() || isNaN(amountNum) || amountNum <= 0) return;

    setExpenses((prev) => prev.map(e => {
      if (e.id === expenseId) {
        const newSub = { id: crypto.randomUUID(), name: newSubName.trim(), amount: amountNum };
        const updatedSubExpenses = [...e.subExpenses, newSub];
        const newTotal = updatedSubExpenses.reduce((sum, s) => sum + s.amount, 0);
        return { ...e, subExpenses: updatedSubExpenses, amount: newTotal };
      }
      return e;
    }));
    
    setNewSubName("");
    setNewSubAmount("");
    setAddingSubFor(null);
  };

  const removeSubExpense = (expenseId: string, subId: string) => {
    setExpenses((prev) => prev.map(e => {
      if (e.id === expenseId) {
        const updatedSubExpenses = e.subExpenses.filter(s => s.id !== subId);
        const newTotal = updatedSubExpenses.reduce((sum, s) => sum + s.amount, 0);
        return { ...e, subExpenses: updatedSubExpenses, amount: newTotal };
      }
      return e;
    }));
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
              placeholder="Amount (0 for sub-expenses)"
            />
            <Button onClick={addExpense}>Add</Button>
          </div>
        )}

        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
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

              {e.allowSubExpenses && (
                <div className="pl-6 space-y-2">
                  {e.subExpenses.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                      <span>{sub.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{sub.amount.toLocaleString()}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => removeSubExpense(e.id, sub.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {addingSubFor === e.id ? (
                    <div className="flex gap-2 mt-2">
                      <Input
                        className="h-8 text-sm"
                        value={newSubName}
                        onChange={(ev) => setNewSubName(ev.target.value)}
                        placeholder="Item name"
                      />
                      <Input
                        className="h-8 text-sm w-24"
                        type="number"
                        value={newSubAmount}
                        onChange={(ev) => setNewSubAmount(ev.target.value)}
                        placeholder="Amount"
                      />
                      <Button size="sm" onClick={() => addSubExpense(e.id)}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingSubFor(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-muted-foreground" 
                      onClick={() => {
                        setAddingSubFor(e.id);
                        setNewSubName("");
                        setNewSubAmount("");
                      }}
                    >
                      + Add sub-expense
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;
