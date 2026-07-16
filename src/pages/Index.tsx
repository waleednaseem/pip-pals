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
import { GroupExpenses } from "@/components/GroupExpenses";
import { Notifications } from "@/components/Notifications";
import { runRecurringEngine, getNotifications } from "@/utils/family";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Trash, Download, History, Clock, X, Save, FileText, FileDown, RotateCcw, PlusCircle, Bell, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const Index = () => {
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  
  const { toast } = useToast();

  useEffect(() => {
    const savedPair = getSelectedPair();
    if (savedPair) {
      setSelectedPair(savedPair);
      setTrades(getTradesFromStorage());
    }
    // Lazy recurring engine + notification refresh on app open
    runRecurringEngine();
    setUnreadNotif(getNotifications().filter(n => n.status === "unread").length);
    const onFocus = () => setUnreadNotif(getNotifications().filter(n => n.status === "unread").length);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    setUnreadNotif(getNotifications().filter(n => n.status === "unread").length);
  }, [activeTab]);

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

  // All tabs in one unified menu
  const availableTabs = [
    ...(selectedPair ? [{ value: "calculator", label: "Forex Pip Calculator" }] : []),
    { value: "notifications", label: "Notifications" },
    { value: "canada", label: "Financial Plan" },
    { value: "converter", label: "Currency Converter" },
    { value: "dynamic-calc", label: "Dynamic Calculator" },
    { value: "salary", label: "Expense Calculator" },
    { value: "time-convert", label: "Time Conversion" },
    { value: "lifeline", label: "Setup Your Lifeline" },
    { value: "group-expenses", label: "Group Expenses (Friends)" },
    { value: "tax", label: "Tax History" },
    ...(selectedPair ? [{ value: "totals", label: "Totals Summary" }] : []),
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

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Daily Planning
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedPair ? `Calculate trades for ${selectedPair}` : "Plan your day, track expenses, manage finances"}
            </p>
          </div>
          {selectedPair && (
            <ActionButtons
              onClearHistory={handleClearHistory}
              onExportCSV={handleExportCSV}
              onChangePair={handleChangePair}
              hasHistory={trades.length > 0}
            />
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" className="w-full mb-6 justify-between text-left font-normal h-12 relative">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  {getCurrentTabLabel()}
                  {unreadNotif > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5">{unreadNotif}</Badge>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>Select Tool</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2 overflow-y-auto">
                {availableTabs.map((tab) => (
                  <DrawerClose key={tab.value} asChild>
                    <Button 
                      variant={activeTab === tab.value ? "default" : "ghost"} 
                      className="w-full justify-start h-14 text-lg"
                      onClick={() => setActiveTab(tab.value)}
                    >
                      <span className="flex items-center gap-2">
                        {tab.value === "notifications" && <Bell className="h-4 w-4" />}
                        {tab.label}
                      </span>
                      {tab.value === "notifications" && unreadNotif > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white">{unreadNotif}</Badge>
                      )}
                    </Button>
                  </DrawerClose>
                ))}
              </div>
            </DrawerContent>
          </Drawer>

          <TabsContent value="calculator" className="space-y-6 mt-6">
            {selectedPair && <CalculatorForm pair={selectedPair} onCalculate={handleCalculate} />}
            <TradeHistory trades={trades} />
          </TabsContent>

          <TabsContent value="converter" className="mt-6">
            <CurrencyConverter />
          </TabsContent>

          <TabsContent value="dynamic-calc" className="mt-6">
            <DynamicCalculator pair={selectedPair} />
          </TabsContent>

          <TabsContent value="time-convert" className="mt-6">
            <TimeConversion />
          </TabsContent>

          <TabsContent value="lifeline" className="mt-6">
            <Lifeline />
          </TabsContent>

          <TabsContent value="group-expenses" className="mt-6">
            <GroupExpenses />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Notifications onNavigate={(t) => {
              if (t.type === "wife" || t.type === "child") setActiveTab("lifeline");
              else if (t.type === "loan") setActiveTab("lifeline");
              else if (t.type === "household") setActiveTab("lifeline");
            }} />
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

          <TabsContent value="salary" className="mt-6">
            <SalaryCalculator />
          </TabsContent>

          <TabsContent value="totals" className="mt-6">
            <TotalsSummary totals={totals} />
          </TabsContent>

          <TabsContent value="pair" className="mt-6">
            <PairSelector selectedPair={selectedPair} onSelectPair={handleSelectPair} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const EXPENSE_STORAGE_KEY = "expense-calculator-data";
const EXPENSE_HISTORY_KEY = "expense-calculator-history";

interface SubExpense {
  id: string;
  name: string;
  amount: number;
  paid?: boolean;
  hidden?: boolean;
  subExpenses: SubExpense[];
}

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  color: string;
  paid?: boolean;
  hidden?: boolean;
  subExpenses: SubExpense[];
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
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newAmount, setNewAmount] = useState<string>("");
  
  // Sub-expense states (works for any nesting level via parent path id)
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
      totalExpenses: totalUsed,
      remaining: Math.max(0, salary - totalUsed),
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

  const totalUsed = expenses.reduce((sum, e) => sum + (e.hidden ? 0 : e.amount), 0);
  const remaining = Math.max(0, salary - totalUsed);
  const pct = (amount: number, hidden?: boolean) => (salary > 0 && !hidden ? (amount / salary) * 100 : 0);

  // Paid/Unpaid breakdown — only counts plus (>0) leaf items.
  // For nodes with sub-expenses, recurse into children (parent paid flag is ignored).
  // Negative items (refunds/credits) are excluded from both buckets.
  const sumPaidUnpaidSub = (s: SubExpense): { paid: number; unpaid: number } => {
    if (s.hidden) return { paid: 0, unpaid: 0 };
    if (s.subExpenses.length > 0) {
      return s.subExpenses.reduce(
        (acc, c) => {
          const r = sumPaidUnpaidSub(c);
          return { paid: acc.paid + r.paid, unpaid: acc.unpaid + r.unpaid };
        },
        { paid: 0, unpaid: 0 },
      );
    }
    if (s.amount > 0) {
      return s.paid ? { paid: s.amount, unpaid: 0 } : { paid: 0, unpaid: s.amount };
    }
    return { paid: 0, unpaid: 0 };
  };

  const { paidTotal, unpaidTotal } = expenses.reduce(
    (acc, e) => {
      if (e.hidden) return acc;
      if (e.allowSubExpenses && e.subExpenses.length > 0) {
        const r = e.subExpenses.reduce(
          (a, c) => {
            const x = sumPaidUnpaidSub(c);
            return { paid: a.paid + x.paid, unpaid: a.unpaid + x.unpaid };
          },
          { paid: 0, unpaid: 0 },
        );
        return { paidTotal: acc.paidTotal + r.paid, unpaidTotal: acc.unpaidTotal + r.unpaid };
      }
      if (e.amount > 0) {
        return e.paid
          ? { paidTotal: acc.paidTotal + e.amount, unpaidTotal: acc.unpaidTotal }
          : { paidTotal: acc.paidTotal, unpaidTotal: acc.unpaidTotal + e.amount };
      }
      return acc;
    },
    { paidTotal: 0, unpaidTotal: 0 },
  );

  const trackedTotal = paidTotal + unpaidTotal;
  const paidPct = trackedTotal > 0 ? (paidTotal / trackedTotal) * 100 : 0;

  // Recompute totals bottom-up: a node with sub-expenses takes the sum of its subs
  const recomputeSub = (s: SubExpense): SubExpense => {
    if (s.subExpenses && s.subExpenses.length > 0) {
      const subs = s.subExpenses.map(recomputeSub);
      const total = subs.reduce((sum, x) => sum + (x.hidden ? 0 : x.amount), 0);
      return { ...s, subExpenses: subs, amount: total };
    }
    return s;
  };

  const recomputeExpense = (e: ExpenseItem): ExpenseItem => {
    if (e.allowSubExpenses && e.subExpenses.length > 0) {
      const subs = e.subExpenses.map(recomputeSub);
      const total = subs.reduce((sum, x) => sum + (x.hidden ? 0 : x.amount), 0);
      return { ...e, subExpenses: subs, amount: total };
    }
    return e;
  };

  // Recursively transform a sub node by id (or any of its descendants)
  const mapSubTree = (
    nodes: SubExpense[],
    targetId: string,
    transform: (n: SubExpense) => SubExpense | null,
  ): SubExpense[] => {
    const result: SubExpense[] = [];
    for (const n of nodes) {
      if (n.id === targetId) {
        const t = transform(n);
        if (t !== null) result.push(t);
      } else {
        result.push({ ...n, subExpenses: mapSubTree(n.subExpenses, targetId, transform) });
      }
    }
    return result;
  };

  const updateNodeById = (
    targetId: string,
    transform: (n: SubExpense) => SubExpense | null,
    transformExpense?: (e: ExpenseItem) => ExpenseItem | null,
  ) => {
    setExpenses((prev) => {
      const out: ExpenseItem[] = [];
      for (const e of prev) {
        if (e.id === targetId && transformExpense) {
          const t = transformExpense(e);
          if (t !== null) out.push(recomputeExpense(t));
        } else {
          const updated = { ...e, subExpenses: mapSubTree(e.subExpenses, targetId, transform) };
          out.push(recomputeExpense(updated));
        }
      }
      return out;
    });
  };

  const addExpense = () => {
    const amountNum = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amountNum)) return;
    
    const allowSubExpenses = amountNum === 0;
    const color = colors[expenses.length % colors.length];
    
    setExpenses((prev) => [
      ...prev,
      { 
        id: crypto.randomUUID(), 
        name: newName.trim(), 
        amount: amountNum, 
        color,
        paid: false,
        hidden: false,
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

  // Add a sub-expense under any node (top-level expense OR nested sub) by id
  const addSubExpense = (parentId: string) => {
    const amountNum = parseFloat(newSubAmount);
    if (!newSubName.trim() || isNaN(amountNum)) return;

    const newSub: SubExpense = {
      id: crypto.randomUUID(),
      name: newSubName.trim(),
      amount: amountNum,
      paid: false,
      hidden: false,
      subExpenses: [],
    };

    updateNodeById(
      parentId,
      // For nested sub: append as child
      (n) => ({ ...n, subExpenses: [...n.subExpenses, newSub] }),
      // For top-level expense: append and ensure allowSubExpenses
      (e) => ({ ...e, allowSubExpenses: true, subExpenses: [...e.subExpenses, newSub] }),
    );

    setNewSubName("");
    setNewSubAmount("");
    setAddingSubFor(null);
  };

  // Remove any node by id (sub at any depth)
  const removeNode = (id: string) => {
    updateNodeById(id, () => null, () => null);
  };

  // Update amount on any leaf node
  const updateNodeAmount = (id: string, newAmount: number) => {
    updateNodeById(
      id,
      (n) => (n.subExpenses.length === 0 ? { ...n, amount: newAmount } : n),
      (e) => (!e.allowSubExpenses ? { ...e, amount: newAmount } : e),
    );
  };

  // Toggle paid status on any node
  const togglePaid = (id: string) => {
    updateNodeById(
      id,
      (n) => ({ ...n, paid: !n.paid }),
      (e) => ({ ...e, paid: !e.paid }),
    );
  };

  // Toggle hidden (ghost) status on any node
  const toggleHidden = (id: string) => {
    updateNodeById(
      id,
      (n) => ({ ...n, hidden: !n.hidden }),
      (e) => ({ ...e, hidden: !e.hidden }),
    );
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
    const dangerColor: [number, number, number] = [239, 68, 68]; // Red-500
    const subtleBg: [number, number, number] = [248, 250, 252]; // Slate-50

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

    // Draw summary cards (2x2 grid)
    const cardWidth = (pageWidth - 50) / 2;
    const cardHeight = 28;
    let cardY = y;

    const drawCard = (
      x: number,
      cy: number,
      label: string,
      value: string,
      valueColor: [number, number, number],
    ) => {
      doc.setFillColor(...lightBg);
      doc.roundedRect(x, cy, cardWidth, cardHeight, 3, 3, "F");
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + cardWidth / 2, cy + 10, { align: "center" });
      doc.setFontSize(13);
      doc.setTextColor(...valueColor);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + cardWidth / 2, cy + 22, { align: "center" });
    };

    const expensePercent = salary > 0 ? Math.round((totalUsed / salary) * 100) : 0;
    const remainingPercent = salary > 0 ? Math.round((remaining / salary) * 100) : 0;
    const paidPctRound = Math.round(paidPct);

    drawCard(20, cardY, "TOTAL BUDGET", `$${salary.toLocaleString()}`, darkColor);
    drawCard(30 + cardWidth, cardY, "TOTAL EXPENSES", `$${totalUsed.toLocaleString()} (${expensePercent}%)`, warningColor);
    cardY += cardHeight + 5;
    drawCard(20, cardY, "REMAINING BALANCE", `$${remaining.toLocaleString()} (${remainingPercent}%)`, remaining >= 0 ? successColor : dangerColor);
    drawCard(30 + cardWidth, cardY, `PAID / UNPAID (${paidPctRound}% paid)`, `$${paidTotal.toLocaleString()} / $${unpaidTotal.toLocaleString()}`, successColor);

    y = cardY + cardHeight + 15;

    // Divider
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    // Expenses Breakdown Section
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses Breakdown", 20, y);
    y += 10;

    // Table Header
    doc.setFillColor(...primaryColor);
    doc.rect(20, y, pageWidth - 40, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Item", 25, y + 6);
    doc.text("Status", pageWidth - 75, y + 6, { align: "right" });
    doc.text("Amount", pageWidth - 42, y + 6, { align: "right" });
    doc.text("Share", pageWidth - 23, y + 6, { align: "right" });
    y += 12;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
    };

    // Recursive renderer for sub-expenses (any depth)
    const renderSub = (sub: SubExpense, depth: number) => {
      ensureSpace(7);
      const hasChildren = sub.subExpenses.length > 0;
      const isLeafPositive = !hasChildren && sub.amount > 0;
      const indentX = 25 + depth * 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);

      // Tree connector + name
      const prefix = depth > 0 ? "└ " : "";
      const nameMaxWidth = pageWidth - 80 - depth * 6;
      const nameLines = doc.splitTextToSize(`${prefix}${sub.name || "(unnamed)"}`, nameMaxWidth);
      doc.text(nameLines, indentX, y);

      // Status
      if (isLeafPositive) {
        if (sub.paid) {
          doc.setTextColor(...successColor);
          doc.setFont("helvetica", "bold");
          doc.text("PAID", pageWidth - 75, y, { align: "right" });
        } else {
          doc.setTextColor(...warningColor);
          doc.setFont("helvetica", "bold");
          doc.text("UNPAID", pageWidth - 75, y, { align: "right" });
        }
      } else if (hasChildren) {
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "italic");
        doc.text("group", pageWidth - 75, y, { align: "right" });
      }

      // Amount
      doc.setFont("helvetica", "normal");
      const amtColor: [number, number, number] = sub.amount < 0 ? dangerColor : darkColor;
      doc.setTextColor(...amtColor);
      const amtStr = sub.amount < 0 ? `-$${Math.abs(sub.amount).toLocaleString()}` : `$${sub.amount.toLocaleString()}`;
      doc.text(amtStr, pageWidth - 42, y, { align: "right" });

      // Share (relative to total budget)
      doc.setTextColor(...primaryColor);
      doc.text(`${Math.round(pct(sub.amount))}%`, pageWidth - 23, y, { align: "right" });

      y += Math.max(6, nameLines.length * 5);

      if (hasChildren) {
        sub.subExpenses.forEach((c) => renderSub(c, depth + 1));
      }
    };

    // Top-level expense rows
    expenses.forEach((expense, idx) => {
      ensureSpace(10);
      const hasChildren = expense.allowSubExpenses && expense.subExpenses.length > 0;
      const isLeafPositive = !hasChildren && expense.amount > 0;

      // Row background (alternating)
      if (idx % 2 === 0) {
        doc.setFillColor(...subtleBg);
        doc.rect(20, y - 5, pageWidth - 40, 9, "F");
      }

      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(expense.name || "(unnamed)", pageWidth - 90);
      doc.text(nameLines, 25, y);

      // Status badge
      if (isLeafPositive) {
        if (expense.paid) {
          doc.setTextColor(...successColor);
          doc.text("PAID", pageWidth - 75, y, { align: "right" });
        } else {
          doc.setTextColor(...warningColor);
          doc.text("UNPAID", pageWidth - 75, y, { align: "right" });
        }
      } else if (hasChildren) {
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "italic");
        doc.text("group", pageWidth - 75, y, { align: "right" });
        doc.setFont("helvetica", "bold");
      }

      // Amount
      const amtColor: [number, number, number] = expense.amount < 0 ? dangerColor : darkColor;
      doc.setTextColor(...amtColor);
      const amtStr = expense.amount < 0 ? `-$${Math.abs(expense.amount).toLocaleString()}` : `$${expense.amount.toLocaleString()}`;
      doc.text(amtStr, pageWidth - 42, y, { align: "right" });

      // Share
      doc.setTextColor(...primaryColor);
      doc.text(`${Math.round(pct(expense.amount))}%`, pageWidth - 23, y, { align: "right" });

      y += Math.max(7, nameLines.length * 5);

      // Sub-expenses (recursive)
      if (hasChildren) {
        expense.subExpenses.forEach((sub) => renderSub(sub, 1));
      }
      y += 3;
    });

    // Totals summary band
    ensureSpace(40);
    y += 4;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFillColor(...lightBg);
    doc.roundedRect(20, y, pageWidth - 40, 28, 3, 3, "F");
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 25, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(`Total Expenses: $${totalUsed.toLocaleString()}`, 25, y + 16);
    doc.setTextColor(...successColor);
    doc.text(`Paid: $${paidTotal.toLocaleString()}`, 25, y + 23);
    doc.setTextColor(...warningColor);
    doc.text(`Unpaid: $${unpaidTotal.toLocaleString()}`, 70, y + 23);
    const remColor = remaining >= 0 ? successColor : dangerColor;
    doc.setTextColor(...remColor);
    doc.setFont("helvetica", "bold");
    doc.text(`Remaining: $${remaining.toLocaleString()}`, pageWidth - 25, y + 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(`${paidPctRound}% paid of tracked`, pageWidth - 25, y + 23, { align: "right" });
    y += 32;

    // Footer
    y = pageHeight - 20;
    doc.setDrawColor(...lightBg);
    doc.setLineWidth(0.3);
    doc.line(20, y - 10, pageWidth - 20, y - 10);
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Generated by Expense Calculator • Daily Planning", pageWidth / 2, y, { align: "center" });

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
    <>
      <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <CardTitle className="text-xl">Expense Calculator</CardTitle>
          
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
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={salary ? salary : ""}
                onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                placeholder="Enter your salary"
                className="flex-1 max-w-[200px]"
              />
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  onClick={saveToHistory}
                  className="h-9 w-9 p-0 border-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  size="sm"
                  title="Save"
                  aria-label="Save"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`h-9 px-2 border-0 ${showHistory
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                  }`}
                  size="sm"
                  title="History"
                  aria-label="History"
                >
                  <Clock className="h-4 w-4" />
                  {history.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {history.length}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={exportToPDF}
                  className="h-9 w-9 p-0 border-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="sm"
                  title="Export PDF"
                  aria-label="Export PDF"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={clearAllData}
                  className="h-9 w-9 p-0 border-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="sm"
                  title="Clear All"
                  aria-label="Clear All"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
              {expenses.filter(e => !e.hidden).map((e) => {
                const width = Math.max(0, Math.min(100 - offset, pct(e.amount, e.hidden)));
                const segment = (
                  <div
                    key={e.id}
                    className={`${e.color} absolute h-full ${e.hidden ? "opacity-40 grayscale" : ""}`}
                    style={{ left: `${offset}%`, width: `${width}%` }}
                  />
                );
                offset += width;
                return segment;
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {expenses.filter(e => !e.hidden).map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${e.color}`} />
                  <Badge variant="outline">
                    {e.name} · {e.amount.toLocaleString()} ({Math.round(pct(e.amount, e.hidden))}%)
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
            {totalUsed > salary && (
              <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1">
                <span className="text-sm font-medium text-red-500">Over Expense</span>
                <span className="font-semibold text-red-500">
                  -{(totalUsed - salary).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Paid / Unpaid Summary */}
        {trackedTotal > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Payment Status
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(paidPct)}% paid
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="absolute h-full bg-emerald-500 transition-all"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Paid</div>
                <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                  {paidTotal.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">Unpaid</div>
                <div className="font-semibold text-sm text-amber-700 dark:text-amber-300">
                  {unpaidTotal.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md bg-muted/40 border border-border p-2 text-center">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Tracked</div>
                <div className="font-semibold text-sm">
                  {trackedTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

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
          {expenses.map((e) => {
            const hasSubs = e.allowSubExpenses;
            const isPlus = !hasSubs && e.amount > 0;
            const canAddSub = hasSubs; // only when added with amount 0
            return (
            <div
              key={e.id}
              className={`rounded-md border p-3 space-y-3 transition-colors ${
                e.hidden ? "opacity-40 grayscale border-dashed border-border/30" : ""
              } ${
                isPlus ? "cursor-pointer hover:bg-muted/40" : ""
              } ${e.paid && isPlus ? "bg-emerald-500/5 border-emerald-500/30" : ""}`}
              onClick={(ev) => {
                if (!isPlus) return;
                // ignore clicks on inputs/buttons
                const target = ev.target as HTMLElement;
                if (target.closest("input,button,a")) return;
                togglePaid(e.id);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    title={e.hidden ? "Include in calculations" : "Hide from calculations"}
                    onClick={(ev) => { ev.stopPropagation(); toggleHidden(e.id); }}
                  >
                    {e.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <span className={`h-3 w-3 rounded-full ${e.color} shrink-0 mt-1`} />
                  <div className={`font-medium text-sm break-words min-w-0 flex-1 ${e.paid ? "line-through text-muted-foreground" : ""}`}>
                    {e.name}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs text-muted-foreground">{Math.round(pct(e.amount, e.hidden))}%</div>
                  {hasSubs ? (
                    <div className="font-semibold text-sm">{e.amount.toLocaleString()}</div>
                  ) : (
                    <Input
                      type="number"
                      value={e.amount === 0 ? "" : e.amount}
                      onChange={(ev) => updateNodeAmount(e.id, parseFloat(ev.target.value) || 0)}
                      onClick={(ev) => ev.stopPropagation()}
                      className="w-24 h-8 text-right font-semibold"
                    />
                  )}
                  <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); removeExpense(e.id); }}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

                {(canAddSub || e.subExpenses.length > 0) && (
                  <div className="pl-6 space-y-2" onClick={(ev) => ev.stopPropagation()}>
                    {e.subExpenses.map((sub) => (
                      <SubExpenseRow
                        key={sub.id}
                        node={sub}
                        depth={1}
                        addingSubFor={addingSubFor}
                        setAddingSubFor={setAddingSubFor}
                        newSubName={newSubName}
                        setNewSubName={setNewSubName}
                        newSubAmount={newSubAmount}
                        setNewSubAmount={setNewSubAmount}
                        onAddSub={addSubExpense}
                        onRemove={removeNode}
                        onUpdateAmount={updateNodeAmount}
                        onTogglePaid={togglePaid}
                        onToggleHidden={toggleHidden}
                      />
                    ))}

                    {canAddSub && (
                      addingSubFor === e.id ? (
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
                              placeholder="Amount (- ok)"
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
                          <PlusCircle className="h-3.5 w-3.5 mr-1" />
                          Add sub-expense
                        </Button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Button
      onClick={() => setAdding((v) => !v)}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0 p-0 z-50"
      aria-label="Add Expense"
    >
      <Plus className="h-6 w-6" />
    </Button>
  </>
  );
};

interface SubExpenseRowProps {
  node: SubExpense;
  depth: number;
  addingSubFor: string | null;
  setAddingSubFor: (id: string | null) => void;
  newSubName: string;
  setNewSubName: (v: string) => void;
  newSubAmount: string;
  setNewSubAmount: (v: string) => void;
  onAddSub: (parentId: string) => void;
  onRemove: (id: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onTogglePaid: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

const SubExpenseRow = ({
  node,
  depth,
  addingSubFor,
  setAddingSubFor,
  newSubName,
  setNewSubName,
  newSubAmount,
  setNewSubAmount,
  onAddSub,
  onRemove,
  onUpdateAmount,
  onTogglePaid,
  onToggleHidden,
}: SubExpenseRowProps) => {
  const hasChildren = node.subExpenses.length > 0;
  const isPlus = !hasChildren && node.amount > 0;

  // Sub can have nested children only if its own amount is 0 (acts as a group)
  const canHaveChildren = node.amount === 0 || hasChildren;

  return (
    <div className="space-y-2">
      <div
        className={`flex items-start justify-between text-sm p-2 rounded gap-2 transition-colors ${
          node.hidden ? "opacity-40 grayscale border-dashed border border-border/30" : ""
        } ${
          isPlus ? "cursor-pointer hover:bg-muted/50 bg-muted/30" : "bg-muted/30"
        } ${node.paid && isPlus ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : ""}`}
        onClick={(ev) => {
          if (!isPlus) return;
          const target = ev.target as HTMLElement;
          if (target.closest("input,button,a")) return;
          onTogglePaid(node.id);
        }}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground"
            title={node.hidden ? "Include in calculations" : "Hide from calculations"}
            onClick={(ev) => { ev.stopPropagation(); onToggleHidden(node.id); }}
          >
            {node.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <span className={`text-sm break-words min-w-0 flex-1 ${node.paid ? "line-through text-muted-foreground" : ""}`}>
            {node.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasChildren ? (
            <span className="font-medium text-sm w-20 text-right">{node.amount.toLocaleString()}</span>
          ) : (
            <Input
              type="number"
              value={node.amount === 0 ? "" : node.amount}
              onChange={(ev) => onUpdateAmount(node.id, parseFloat(ev.target.value) || 0)}
              onClick={(ev) => ev.stopPropagation()}
              className="w-20 h-7 text-right text-sm"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(ev) => { ev.stopPropagation(); onRemove(node.id); }}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {hasChildren && (
        <div className="pl-4 space-y-2 border-l border-border/50 ml-2">
          {node.subExpenses.map((child) => (
            <SubExpenseRow
              key={child.id}
              node={child}
              depth={depth + 1}
              addingSubFor={addingSubFor}
              setAddingSubFor={setAddingSubFor}
              newSubName={newSubName}
              setNewSubName={setNewSubName}
              newSubAmount={newSubAmount}
              setNewSubAmount={setNewSubAmount}
              onAddSub={onAddSub}
              onRemove={onRemove}
              onUpdateAmount={onUpdateAmount}
              onTogglePaid={onTogglePaid}
              onToggleHidden={onToggleHidden}
            />
          ))}
        </div>
      )}

      {canHaveChildren && (
        <div className="pl-4">
          {addingSubFor === node.id ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                className="h-8 text-sm flex-1 min-w-0"
                value={newSubName}
                onChange={(ev) => setNewSubName(ev.target.value)}
                placeholder="Item name"
              />
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm flex-1 sm:w-24"
                  type="number"
                  value={newSubAmount}
                  onChange={(ev) => setNewSubAmount(ev.target.value)}
                  placeholder="Amount (- ok)"
                />
                <Button size="sm" className="h-8" onClick={() => onAddSub(node.id)}>Add</Button>
                <Button size="sm" className="h-8" variant="ghost" onClick={() => setAddingSubFor(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() => {
                setAddingSubFor(node.id);
                setNewSubName("");
                setNewSubAmount("");
              }}
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Add sub-expense
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
