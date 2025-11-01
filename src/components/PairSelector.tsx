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
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold">Forex Calculator</h1>
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Select Trading Pair</h2>
        <p className="text-muted-foreground mb-6">
          Choose the currency pair or instrument you want to calculate pips and profits for
        </p>
      </div>
      <Select onValueChange={(value) => onSelectPair(value as TradingPair)} disabled={disabled}>
        <SelectTrigger className="w-[280px] h-14 text-lg">
          <SelectValue placeholder="Choose a pair..." />
        </SelectTrigger>
        <SelectContent>
          {TRADING_PAIRS.map((pair) => (
            <SelectItem key={pair} value={pair} className="text-lg py-3">
              {pair}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PairSelector;
