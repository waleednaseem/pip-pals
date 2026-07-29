import { TradingPair } from "@/types/calculator";
import { TRADING_PAIRS } from "@/utils/pairConfig";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

interface PairSelectorProps {
  selectedPair: TradingPair | null;
  onSelectPair: (pair: TradingPair) => void;
  disabled?: boolean;
}

const PairSelector = ({ selectedPair, onSelectPair, disabled }: PairSelectorProps) => {
  if (selectedPair) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 py-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{background: "linear-gradient(135deg, hsl(199 100% 50% / 0.15) 0%, hsl(270 80% 65% / 0.15) 100%)", border: "1px solid hsl(199 100% 50% / 0.25)"}}>
        <TrendingUp className="h-8 w-8 text-[hsl(199_100%_55%)]" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold gradient-text-mixed mb-2">Select Trading Pair</h2>
        <p className="text-[hsl(215_20%_50%)] text-sm">
          Choose the currency pair or instrument you want to calculate pips and profits for
        </p>
      </div>
      <Select onValueChange={(value) => onSelectPair(value as TradingPair)} disabled={disabled}>
        <SelectTrigger className="w-[280px] h-12 font-semibold">
          <SelectValue placeholder="Choose a pair..." />
        </SelectTrigger>
        <SelectContent>
          {TRADING_PAIRS.map((pair) => (
            <SelectItem key={pair} value={pair} className="py-2.5 font-mono-num">
              {pair}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PairSelector;
