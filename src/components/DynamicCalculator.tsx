import { useState, useEffect, useRef, useCallback } from "react";
import { TradingPair } from "@/types/calculator";
import { getPairConfig, TRADING_PAIRS } from "@/utils/pairConfig";
import {
  calculateProfitFromPipsAndLot,
  calculateLotSizeFromPipsAndProfit,
  calculatePipsFromLotAndProfit,
} from "@/utils/calculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, X } from "lucide-react";

interface DynamicCalculatorProps {
  pair?: TradingPair;
  entryPrice?: number;
  exitPrice?: number;
}

const DynamicCalculator = ({ pair, entryPrice, exitPrice }: DynamicCalculatorProps) => {
  const [activePair, setActivePair] = useState<TradingPair>(pair || "XAUUSD");

  useEffect(() => {
    if (pair) setActivePair(pair);
  }, [pair]);

  const config = getPairConfig(activePair);
  const [pips, setPips] = useState("");
  const [lot, setLot] = useState("1");
  const [profitUSD, setProfitUSD] = useState("");

  const isCalculating = useRef(false);
  const calculationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performCalculation = useCallback(() => {
    if (isCalculating.current) return;

    const pipsNum = pips.trim() === "" ? null : parseFloat(pips);
    const lotNum = lot.trim() === "" ? null : parseFloat(lot);
    const profitNum = profitUSD.trim() === "" ? null : parseFloat(profitUSD);

    const hasValidPips = pipsNum !== null && !isNaN(pipsNum) && pipsNum >= 0;
    const hasValidLot = lotNum !== null && !isNaN(lotNum) && lotNum > 0;
    const hasValidProfit = profitNum !== null && !isNaN(profitNum);

    const validCount = [hasValidPips, hasValidLot, hasValidProfit].filter(Boolean).length;

    if (validCount !== 2) return;

    isCalculating.current = true;

    try {
      if (hasValidPips && hasValidLot && !hasValidProfit) {
        const calculatedProfit = calculateProfitFromPipsAndLot(
          pipsNum!,
          lotNum!,
          config.pipSize,
          config.contractSize,
          entryPrice,
          exitPrice
        );
        setProfitUSD(calculatedProfit.toFixed(2));
      } else if (hasValidPips && hasValidProfit && !hasValidLot) {
        const calculatedLot = calculateLotSizeFromPipsAndProfit(
          pipsNum!,
          profitNum!,
          config.pipSize,
          config.contractSize
        );
        if (calculatedLot > 0 && !isNaN(calculatedLot) && isFinite(calculatedLot)) {
          setLot(calculatedLot.toFixed(4));
        }
      } else if (hasValidLot && hasValidProfit && !hasValidPips) {
        const calculatedPips = calculatePipsFromLotAndProfit(
          lotNum!,
          profitNum!,
          config.pipSize,
          config.contractSize
        );
        if (calculatedPips >= 0 && !isNaN(calculatedPips) && isFinite(calculatedPips)) {
          setPips(calculatedPips.toFixed(2));
        }
      }
    } catch (error) {
      // Silently handle errors
    }

    setTimeout(() => {
      isCalculating.current = false;
    }, 50);
  }, [pips, lot, profitUSD, entryPrice, exitPrice, config.pipSize, config.contractSize]);

  useEffect(() => {
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
    }

    calculationTimeout.current = setTimeout(() => {
      performCalculation();
    }, 300);

    return () => {
      if (calculationTimeout.current) {
        clearTimeout(calculationTimeout.current);
      }
    };
  }, [performCalculation]);

  const handlePipsChange = (value: string) => {
    setPips(value);
  };

  const handleLotChange = (value: string) => {
    setLot(value);
  };

  const handleProfitChange = (value: string) => {
    setProfitUSD(value);
  };

  const handlePipsBlur = () => {
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
      calculationTimeout.current = null;
    }
    performCalculation();
  };

  const handleLotBlur = () => {
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
      calculationTimeout.current = null;
    }
    performCalculation();
  };

  const handleProfitBlur = () => {
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
      calculationTimeout.current = null;
    }
    performCalculation();
  };

  const handleClear = () => {
    setPips("");
    setLot("1");
    setProfitUSD("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Dynamic Calculator
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter any 2 fields, 3rd calculates automatically
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sidebar-pips">Pips</Label>
              <Input
                id="sidebar-pips"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 50"
                value={pips}
                onChange={(e) => handlePipsChange(e.target.value)}
                onBlur={handlePipsBlur}
                className="font-mono-num"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebar-lot">Lot Size</Label>
              <Input
                id="sidebar-lot"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 0.01, 0.1, 1"
                value={lot}
                onChange={(e) => handleLotChange(e.target.value)}
                onBlur={handleLotBlur}
                className="font-mono-num"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebar-profitUSD">Profit (USD)</Label>
              <Input
                id="sidebar-profitUSD"
                type="number"
                step="0.01"
                placeholder="e.g., 100.50 or -100.50"
                value={profitUSD}
                onChange={(e) => handleProfitChange(e.target.value)}
                onBlur={handleProfitBlur}
                className="font-mono-num"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicCalculator;

