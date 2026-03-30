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
import { Menu, ChevronDown, Plus, Trash, Download, History, Clock, X, Save, FileText, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Index = () => {
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
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

  // Define available tabs based on whether pair is selected
  const availableTabs = selectedPair 
    ? [
        { value: "calculator", label: "Forex Pip Calculator" },
        { value: "converter", label: "Currency Converter" },
      ]
    : [
        { value: "lifeline", label: "Setup Your Lifeline" },
        { value: "tax", label: "Tax History" },
        { value: "canada", label: "Financial Plan" },
        { value: "converter", label: "Currency Converter" },
        { value: "salary", label: "Expense Calculator" },
        { value: "dynamic-calc", label: "Dynamic Calculator" },
        { value: "time-convert", label: "Time Conversion" },
        { value: "pair", label: "Select Trading Pair" },
      ];

  // Set default tab based on pair selection
  useEffect(() => {
    if (!selectedPair && activeTab === "calculator") {
      setActiveTab("canada");
    } else if (selectedPair && activeTab !== "calculator") {
      setActiveTab("calculator");
    }
  }, [selectedPair]);

  const getCurrentTabLabel = () => {
    const tab = availableTabs.find(t => t.value === activeTab);
    return tab?.label || availableTabs[0]?.label;
  };

  const totals = calculateTotals();

  // If no pair selected, show simpler layout without sidebar/header
  if (!selectedPair) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Forex Trading Tools
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your financial goals and track expenses
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full mb-6 justify-between text-left font-normal h-12">
                  <span>{getCurrentTabLabel()}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle>Select Tool</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-2">
                  {availableTabs.map((tab) => (
                    <DrawerClose key={tab.value} asChild>
                      <Button 
                        variant={activeTab === tab.value ? "default" : "ghost"} 
                        className="w-full justify-start h-14 text-lg"
                        onClick={() => setActiveTab(tab.value)}
                      >
                        {tab.label}
                      </Button>
                    </DrawerClose>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>

            <TabsContent value="lifeline" className="mt-6">
              <Lifeline />
            </TabsContent>

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

            <TabsContent value="canada" className="mt-6">
              <CanadaFundCalculator />
            </TabsContent>

            <TabsContent value="converter" className="mt-6">
              <CurrencyConverter />
            </TabsContent>

            <TabsContent value="salary" className="mt-6">
              <SalaryCalculator />
            </TabsContent>

            <TabsContent value="dynamic-calc" className="mt-6">
              <DynamicCalculator />
            </TabsContent>

            <TabsContent value="time-convert" className="mt-6">
              <TimeConversion />
            </TabsContent>

            <TabsContent value="pair" className="mt-6">
              <PairSelector selectedPair={selectedPair} onSelectPair={handleSelectPair} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
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
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 glass-subtle rounded-xl hover:bg-muted/30 transition-all duration-300">
                      <span className="font-semibold">Dynamic Calculator</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <DynamicCalculator pair={selectedPair} />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Collapsible Totals Summary */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 glass-subtle rounded-xl hover:bg-muted/30 transition-all duration-300">
                      <span className="font-semibold">Totals Summary</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <TotalsSummary totals={totals} />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Collapsible Time Conversion */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 glass-subtle rounded-xl hover:bg-muted/30 transition-all duration-300">
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
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Forex Trading Tools
              </h1>
              <p className="text-muted-foreground mt-1">
                Calculate trades for {selectedPair}
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

        {/* Tabs for Calculator - Only Forex Pip Calculator when pair is selected */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" className="w-full mb-6 justify-between text-left font-normal h-12">
                <span>{getCurrentTabLabel()}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>Select Tool</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2">
                {availableTabs.map((tab) => (
                  <DrawerClose key={tab.value} asChild>
                    <Button 
                      variant={activeTab === tab.value ? "default" : "ghost"} 
                      className="w-full justify-start h-14 text-lg"
                      onClick={() => setActiveTab(tab.value)}
                    >
                      {tab.label}
                    </Button>
                  </DrawerClose>
                ))}
              </div>
            </DrawerContent>
          </Drawer>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <CalculatorForm pair={selectedPair} onCalculate={handleCalculate} />
            <TradeHistory trades={trades} />
          </TabsContent>

          {/* Currency Converter Tab */}
          <TabsContent value="converter" className="mt-6">
            <CurrencyConverter />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

const EXPENSE_STORAGE_KEY = "expense-calculator-data";
const EXPENSE_HISTORY_KEY = "expense-calculator-history";

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  color: string;
  subExpenses: { id: string; name: string; amount: number }[];
  allowSubExpenses: boolean;
}

interface ExpenseData {
  salary: number;
  expenses: ExpenseItem[];
}

interface ExpenseHistoryEntry {
  id: string;
  date: string;
  timestamp: number;
  salary: number;
  expenses: ExpenseItem[];
  totalExpenses: number;
  remaining: number;
}

const SalaryCalculator = () => {
  const { toast } = useToast();
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
  
  // History states
  const [history, setHistory] = useState<ExpenseHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [viewingEntry, setViewingEntry] = useState<ExpenseHistoryEntry | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(EXPENSE_STORAGE_KEY);
    if (saved) {
      try {
        const data: ExpenseData = JSON.parse(saved);
        setSalary(data.salary || 0);
        setExpenses(data.expenses || []);
      } catch (e) {
        console.error("Failed to parse expense data:", e);
      }
    }
    
    // Load history
    const savedHistory = localStorage.getItem(EXPENSE_HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse expense history:", e);
      }
    }
  }, []);

  // Save to localStorage whenever salary or expenses change
  useEffect(() => {
    const data: ExpenseData = { salary, expenses };
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(data));
  }, [salary, expenses]);

  // Clear all data
  const clearAllData = () => {
    setSalary(0);
    setExpenses([]);
    localStorage.removeItem(EXPENSE_STORAGE_KEY);
    toast({
      title: "Data cleared",
      description: "All expenses have been removed",
    });
  };

  // Save to history
  const saveToHistory = () => {
    if (salary === 0 && expenses.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Add some expenses first",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const entry: ExpenseHistoryEntry = {
      id: crypto.randomUUID(),
      date: now.toLocaleDateString("en-GB", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      timestamp: now.getTime(),
      salary,
      expenses: JSON.parse(JSON.stringify(expenses)),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      remaining: Math.max(0, salary - expenses.reduce((sum, e) => sum + e.amount, 0)),
    };

    const newHistory = [entry, ...history];
    setHistory(newHistory);
    localStorage.setItem(EXPENSE_HISTORY_KEY, JSON.stringify(newHistory));

    toast({
      title: "Saved to history",
      description: `Expense report for ${entry.date}`,
    });
  };

  // Delete from history
  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem(EXPENSE_HISTORY_KEY, JSON.stringify(newHistory));
    if (viewingEntry?.id === id) {
      setViewingEntry(null);
    }
    toast({
      title: "Deleted",
      description: "History entry removed",
    });
  };

  // Load history entry
  const loadFromHistory = (entry: ExpenseHistoryEntry) => {
    setSalary(entry.salary);
    setExpenses(JSON.parse(JSON.stringify(entry.expenses)));
    setViewingEntry(null);
    setShowHistory(false);
    toast({
      title: "Loaded",
      description: `Expense report from ${entry.date}`,
    });
  };

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

  // Update single expense amount (only for non-sub-expense expenses)
  const updateExpenseAmount = (expenseId: string, newAmount: number) => {
    setExpenses((prev) => prev.map(e => {
      if (e.id === expenseId && !e.allowSubExpenses) {
        return { ...e, amount: newAmount };
      }
      return e;
    }));
  };

  // Update sub-expense amount
  const updateSubExpenseAmount = (expenseId: string, subId: string, newAmount: number) => {
    setExpenses((prev) => prev.map(e => {
      if (e.id === expenseId) {
        const updatedSubExpenses = e.subExpenses.map(s => 
          s.id === subId ? { ...s, amount: newAmount } : s
        );
        const newTotal = updatedSubExpenses.reduce((sum, s) => sum + s.amount, 0);
        return { ...e, subExpenses: updatedSubExpenses, amount: newTotal };
      }
      return e;
    }));
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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

    // Colors
    const primaryColor: [number, number, number] = [20, 184, 166]; // Teal
    const darkColor: [number, number, number] = [30, 41, 59]; // Slate-800
    const grayColor: [number, number, number] = [100, 116, 139]; // Slate-500
    const lightBg: [number, number, number] = [241, 245, 249]; // Slate-100
    const successColor: [number, number, number] = [34, 197, 94]; // Green-500
    const warningColor: [number, number, number] = [234, 179, 8]; // Yellow-500

    let y = 0;

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSE REPORT", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${dateStr} at ${timeStr}`, pageWidth / 2, 35, { align: "center" });

    y = 60;

    // Summary Cards Section
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Overview", 20, y);
    y += 12;

    // Draw summary cards
    const cardWidth = (pageWidth - 50) / 3;
    const cardHeight = 35;
    const cardY = y;

    // Card 1: Total Salary
    doc.setFillColor(...lightBg);
    doc.roundedRect(20, cardY, cardWidth, cardHeight, 3, 3, "F");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("TOTAL BUDGET", 20 + cardWidth / 2, cardY + 12, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(`$${salary.toLocaleString()}`, 20 + cardWidth / 2, cardY + 26, { align: "center" });

    // Card 2: Total Expenses
    doc.setFillColor(...lightBg);
    doc.roundedRect(25 + cardWidth, cardY, cardWidth, cardHeight, 3, 3, "F");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL EXPENSES", 25 + cardWidth + cardWidth / 2, cardY + 12, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(...warningColor);
    doc.setFont("helvetica", "bold");
    const expensePercent = salary > 0 ? Math.round((totalUsed / salary) * 100) : 0;
    doc.text(`$${totalUsed.toLocaleString()} (${expensePercent}%)`, 25 + cardWidth + cardWidth / 2, cardY + 26, { align: "center" });

    // Card 3: Remaining
    doc.setFillColor(...lightBg);
    doc.roundedRect(30 + cardWidth * 2, cardY, cardWidth, cardHeight, 3, 3, "F");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "normal");
    doc.text("REMAINING BALANCE", 30 + cardWidth * 2 + cardWidth / 2, cardY + 12, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(...successColor);
    doc.setFont("helvetica", "bold");
    const remainingPercent = salary > 0 ? Math.round((remaining / salary) * 100) : 0;
    doc.text(`$${remaining.toLocaleString()} (${remainingPercent}%)`, 30 + cardWidth * 2 + cardWidth / 2, cardY + 26, { align: "center" });

    y = cardY + cardHeight + 20;

    // Divider
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    // Expenses Breakdown Section
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses Breakdown", 20, y);
    y += 12;

    // Table Header
    doc.setFillColor(...primaryColor);
    doc.rect(20, y, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Category", 25, y + 7);
    doc.text("Amount", pageWidth - 70, y + 7, { align: "right" });
    doc.text("Share", pageWidth - 25, y + 7, { align: "right" });
    y += 14;

    // Table Rows
    let rowIndex = 0;
    expenses.forEach((expense) => {
      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.rect(20, y - 4, pageWidth - 40, expense.allowSubExpenses && expense.subExpenses.length > 0 ? 8 + expense.subExpenses.length * 6 : 8, "F");
      }

      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(expense.name, 25, y + 2);
      doc.setFont("helvetica", "normal");
      doc.text(`$${expense.amount.toLocaleString()}`, pageWidth - 70, y + 2, { align: "right" });
      doc.setTextColor(...primaryColor);
      doc.text(`${Math.round(pct(expense.amount))}%`, pageWidth - 25, y + 2, { align: "right" });
      y += 8;

      // Sub-expenses
      if (expense.allowSubExpenses && expense.subExpenses.length > 0) {
        doc.setTextColor(...grayColor);
        doc.setFontSize(9);
        expense.subExpenses.forEach((sub) => {
          doc.text(`  └ ${sub.name}`, 30, y + 1);
          doc.text(`$${sub.amount.toLocaleString()}`, pageWidth - 70, y + 1, { align: "right" });
          y += 6;
        });
      }
      y += 2;
      rowIndex++;

      // Check for page overflow
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
    });

    // Footer
    y = pageHeight - 20;
    doc.setDrawColor(...lightBg);
    doc.setLineWidth(0.3);
    doc.line(20, y - 10, pageWidth - 20, y - 10);
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Generated by Expense Calculator • Pip Pals", pageWidth / 2, y, { align: "center" });

    // Save the PDF
    const fileName = `expense-report-${now.toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: "PDF Exported",
      description: `Report saved as ${fileName}`,
    });
  };

  let offset = 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <CardTitle className="text-xl">Expense Calculator</CardTitle>
          
          {/* Action Buttons - Professional Design */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Actions */}
            <Button 
              onClick={() => setAdding((v) => !v)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
            
            <Button 
              variant="outline" 
              onClick={saveToHistory}
              className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              size="sm"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              className={`gap-2 ${showHistory 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
              size="sm"
            >
              <Clock className="h-4 w-4" />
              History
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {history.length}
                </Badge>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={exportToPDF}
              className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              size="sm"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearAllData}
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* History Panel */}
        {showHistory && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expense History
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No history yet. Click the save button to add entries.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry) => (
                  <div 
                    key={entry.id} 
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                      viewingEntry?.id === entry.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => setViewingEntry(viewingEntry?.id === entry.id ? null : entry)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{entry.date}</div>
                      <div className="text-xs text-muted-foreground">
                        Budget: {entry.salary.toLocaleString()} | Expenses: {entry.totalExpenses.toLocaleString()} | Balance: {entry.remaining.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 gap-1.5 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); loadFromHistory(entry); }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Load
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 w-7 p-0 border-red-300 text-red-500 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); deleteFromHistory(entry.id); }}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {viewingEntry && (
              <div className="border-t pt-3 mt-3 space-y-2">
                <h4 className="font-medium text-sm">Preview: {viewingEntry.date}</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-background p-2 rounded text-center">
                    <div className="text-muted-foreground text-xs">Budget</div>
                    <div className="font-semibold">{viewingEntry.salary.toLocaleString()}</div>
                  </div>
                  <div className="bg-background p-2 rounded text-center">
                    <div className="text-muted-foreground text-xs">Expenses</div>
                    <div className="font-semibold">{viewingEntry.totalExpenses.toLocaleString()}</div>
                  </div>
                  <div className="bg-background p-2 rounded text-center">
                    <div className="text-muted-foreground text-xs">Balance</div>
                    <div className="font-semibold">{viewingEntry.remaining.toLocaleString()}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {viewingEntry.expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm bg-background p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${e.color}`} />
                        <span>{e.name}</span>
                      </div>
                      <span className="font-medium">{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">{Math.round(pct(e.amount))}%</div>
                  {e.allowSubExpenses ? (
                    <div className="font-semibold">{e.amount.toLocaleString()}</div>
                  ) : (
                    <Input
                      type="number"
                      value={e.amount || ""}
                      onChange={(ev) => updateExpenseAmount(e.id, parseFloat(ev.target.value) || 0)}
                      className="w-24 h-8 text-right font-semibold"
                    />
                  )}
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
                        <Input
                          type="number"
                          value={sub.amount || ""}
                          onChange={(ev) => updateSubExpenseAmount(e.id, sub.id, parseFloat(ev.target.value) || 0)}
                          className="w-20 h-7 text-right text-sm"
                        />
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
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <Input
                        className="h-9 text-sm flex-1 min-w-0"
                        value={newSubName}
                        onChange={(ev) => setNewSubName(ev.target.value)}
                        placeholder="Item name"
                      />
                      <div className="flex gap-2">
                        <Input
                          className="h-9 text-sm flex-1 sm:w-28"
                          type="number"
                          value={newSubAmount}
                          onChange={(ev) => setNewSubAmount(ev.target.value)}
                          placeholder="Amount"
                        />
                        <Button size="sm" className="h-9" onClick={() => addSubExpense(e.id)}>Add</Button>
                        <Button size="sm" className="h-9" variant="ghost" onClick={() => setAddingSubFor(null)}>Cancel</Button>
                      </div>
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
