import { useState, useEffect, useMemo } from "react";
import { TradingPair } from "@/types/calculator";
import { getPairConfig, TRADING_PAIRS } from "@/utils/pairConfig";
import {
  calculateProfitFromPipsAndLot,
  calculatePipsFromLotAndProfit,
} from "@/utils/calculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RotateCcw, Target, DollarSign, TrendingUp, Lock, RefreshCw } from "lucide-react";

interface DynamicCalculatorProps {
  pair?: TradingPair;
  entryPrice?: number;
  exitPrice?: number;
}

type Mode = "profit" | "pips";
type AccountType = "standard" | "xm_global_micro";

const ACCOUNT_LOT_MULTIPLIER: Record<AccountType, number> = {
  standard: 1,
  xm_global_micro: 0.1,
};

const DynamicCalculator = ({ pair, entryPrice, exitPrice }: DynamicCalculatorProps) => {
  const [activePair, setActivePair] = useState<TradingPair>(pair || "XAUUSD");
  const [mode, setMode] = useState<Mode>("profit");
  const [accountType, setAccountType] = useState<AccountType>("standard");

  useEffect(() => {
    if (pair) setActivePair(pair);
  }, [pair]);

  const config = getPairConfig(activePair);
  const lotMultiplier = ACCOUNT_LOT_MULTIPLIER[accountType];

  // Mode A: Pips + Lot -> Profit (profit locked)
  const [pips, setPips] = useState("");
  const [lotA, setLotA] = useState("1");

  // Mode B: Lot + Profit -> Pips (pips locked)
  const [lotB, setLotB] = useState("1");
  const [profit, setProfit] = useState("");

  const calculatedProfit = useMemo(() => {
    const p = parseFloat(pips);
    const l = parseFloat(lotA);
    if (isNaN(p) || isNaN(l) || l <= 0) return null;
    return calculateProfitFromPipsAndLot(
      p,
      l,
      config.pipSize,
      config.contractSize,
      entryPrice,
      exitPrice,
      lotMultiplier
    );
  }, [pips, lotA, config, entryPrice, exitPrice, lotMultiplier]);

  const calculatedPips = useMemo(() => {
    const l = parseFloat(lotB);
    const pr = parseFloat(profit);
    if (isNaN(l) || isNaN(pr) || l <= 0) return null;
    return calculatePipsFromLotAndProfit(
      l,
      pr,
      config.pipSize,
      config.contractSize,
      lotMultiplier
    );
  }, [lotB, profit, config, lotMultiplier]);

  const handleReset = () => {
    if (mode === "profit") {
      setPips("");
      setLotA("1");
    } else {
      setLotB("1");
      setProfit("");
    }
  };

  const handleReenter = () => {
    setPips("");
    setLotA("1");
    setLotB("1");
    setProfit("");
  };

  return (
    <Card className="glass-card w-full border-0">
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl glass-button flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Dynamic Calculator</h3>
              <p className="text-[11px] text-muted-foreground">Auto-compute in real time</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Pair selector */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Trading Pair</Label>
          <Select value={activePair} onValueChange={(v) => setActivePair(v as TradingPair)}>
            <SelectTrigger className="glass-input h-10 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRADING_PAIRS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground/70 pl-1">
            Pip {config.pipSize} · Contract {config.contractSize.toLocaleString()}
          </p>
        </div>

        {/* Account type */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Account Type</Label>
          <Select
            value={accountType}
            onValueChange={(v) => setAccountType(v as AccountType)}
          >
            <SelectTrigger className="glass-input h-10 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="xm_global_micro">XM Global Micro</SelectItem>
            </SelectContent>
          </Select>
          {accountType === "xm_global_micro" && (
            <p className="text-[10px] text-muted-foreground/70 pl-1">
              Micro lot · P/L is 10× smaller than Standard
            </p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass-input">
          <button
            onClick={() => setMode("profit")}
            className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all ${
              mode === "profit"
                ? "glass-button text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Find Profit
          </button>
          <button
            onClick={() => setMode("pips")}
            className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all ${
              mode === "pips"
                ? "glass-button text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Find Pips
          </button>
        </div>

        {/* Mode A: Find Profit */}
        {mode === "profit" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Pips
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50"
                value={pips}
                onChange={(e) => setPips(e.target.value)}
                className="glass-input h-11 border-0 font-mono-num text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Lot Size
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 1"
                value={lotA}
                onChange={(e) => setLotA(e.target.value)}
                className="glass-input h-11 border-0 font-mono-num text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Profit (USD)
              </Label>
              <div className="glass-input h-14 rounded-lg flex items-center justify-between px-4 border-0">
                <span className={`font-mono-num text-xl font-semibold ${
                  calculatedProfit === null
                    ? "text-muted-foreground/50"
                    : calculatedProfit >= 0
                    ? "text-[hsl(var(--profit))]"
                    : "text-[hsl(var(--loss))]"
                }`}>
                  {calculatedProfit === null
                    ? "—"
                    : `${calculatedProfit >= 0 ? "+" : ""}${calculatedProfit.toFixed(2)}`}
                </span>
                <span className="text-xs text-muted-foreground">USD</span>
              </div>
            </div>
          </div>
        )}

        {/* Mode B: Find Pips */}
        {mode === "pips" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Lot Size
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 1"
                value={lotB}
                onChange={(e) => setLotB(e.target.value)}
                className="glass-input h-11 border-0 font-mono-num text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Profit (USD)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 100.50"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className="glass-input h-11 border-0 font-mono-num text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Pips
              </Label>
              <div className="glass-input h-14 rounded-lg flex items-center justify-between px-4 border-0">
                <span className={`font-mono-num text-xl font-semibold ${
                  calculatedPips === null ? "text-muted-foreground/50" : "text-primary"
                }`}>
                  {calculatedPips === null ? "—" : calculatedPips.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">pips</span>
              </div>
            </div>
          </div>
        )}

        {/* Re-enter button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReenter}
          className="w-full h-11 rounded-xl border-0 glass-button bg-muted/30 hover:bg-muted/50 text-foreground gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Re-enter Values
        </Button>
      </CardContent>
    </Card>
  );
};

export default DynamicCalculator;
