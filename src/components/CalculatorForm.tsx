import { useState } from "react";
import {
  TradingPair,
  Currency,
  CalculatorInputs,
  TimeUnit,
} from "@/types/calculator";
import { getPairConfig } from "@/utils/pairConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CalculatorFormProps {
  pair: TradingPair;
  onCalculate: (inputs: CalculatorInputs) => void;
}

const CalculatorForm = ({ pair, onCalculate }: CalculatorFormProps) => {
  const config = getPairConfig(pair);
  
  const [priceA, setPriceA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [lot, setLot] = useState("1");
  const [accountCurrency, setAccountCurrency] = useState<Currency>("USD");
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("Minutes");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const priceANum = parseFloat(priceA);
    const priceBNum = parseFloat(priceB);
    const lotNum = parseFloat(lot);
    const contractSizeNum = config.contractSize;
    const pipSizeNum = config.pipSize;
    const durationValueNum = parseFloat(timeValue);

    if (isNaN(priceANum) || isNaN(priceBNum)) {
      setError("Please enter valid numbers for Entry and Exit prices");
      return;
    }

    if (isNaN(lotNum) || lotNum <= 0) {
      setError("Lot must be greater than 0");
      return;
    }

    if (isNaN(durationValueNum) || durationValueNum <= 0) {
      setError("Please enter a valid time duration");
      return;
    }

    if (priceANum === priceBNum) {
      const confirmed = window.confirm(
        "No pip difference (prices equal). Add trade anyway?"
      );
      if (!confirmed) return;
    }

    onCalculate({
      priceA: priceANum,
      priceB: priceBNum,
      lot: lotNum,
      accountCurrency,
      contractSize: contractSizeNum,
      pipSize: pipSizeNum,
      duration: {
        value: durationValueNum,
        unit: timeUnit,
      },
    });

    // Reset price fields after successful calculation
    setPriceA("");
    setPriceB("");
    setTimeValue("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculate Trade
          </CardTitle>
          <div className="text-2xl font-bold text-primary">{pair}</div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceA">Entry Price (Price 1)</Label>
              <Input
                id="priceA"
                type="number"
                step="any"
                placeholder="e.g., 1.1000"
                value={priceA}
                onChange={(e) => setPriceA(e.target.value)}
                required
                className="font-mono-num"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceB">Exit Price (Price 2)</Label>
              <Input
                id="priceB"
                type="number"
                step="any"
                placeholder="e.g., 1.1050"
                value={priceB}
                onChange={(e) => setPriceB(e.target.value)}
                required
                className="font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot">Lot Size</Label>
              <Input
                id="lot"
                type="number"
                step="0.01"
                placeholder="e.g., 0.01, 0.1, 1"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                required
                className="font-mono-num"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Account Currency</Label>
              <Select value={accountCurrency} onValueChange={(v) => setAccountCurrency(v as Currency)}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeValue">Trade Duration</Label>
              <Input
                id="timeValue"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="e.g., 90"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                required
                className="font-mono-num"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeUnit">Unit</Label>
              <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as TimeUnit)}>
                <SelectTrigger id="timeUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minutes">Minutes</SelectItem>
                  <SelectItem value="Hours">Hours</SelectItem>
                  <SelectItem value="Days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-lg">
            Calculate & Add Trade
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CalculatorForm;
