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
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
                  <DynamicCalculator pair={selectedPair} />
                  <TotalsSummary totals={totals} />
                  <TimeConversion />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Forex Pip Calculator</h1>
              <p className="text-muted-foreground mt-1">
                Calculate pips and profits for your trades
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

        {/* Main Content - Full Width when sidebar is closed */}
        <div className="space-y-6">
          <CalculatorForm pair={selectedPair} onCalculate={handleCalculate} />
          <TradeHistory trades={trades} />
        </div>
      </div>
    </div>
  );
};

export default Index;
