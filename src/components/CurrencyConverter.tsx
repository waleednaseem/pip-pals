import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Currency = "CAD" | "USD" | "AED" | "PKR" | "INR";

interface ExchangeRates {
  [key: string]: number;
}

const CURRENCIES = [
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
];

const formatCurrency = (value: number, currency: string) => {
  if (!isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function CurrencyConverter() {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
  const [toCurrency, setToCurrency] = useState<Currency>("CAD");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      const data = await response.json();
      
      if (data.rates) {
        setExchangeRates(data.rates);
        setLastUpdated(new Date());
        toast({
          title: "Exchange rates updated",
          description: "Latest rates fetched successfully",
        });
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch exchange rates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const convertedAmount = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return 0;
    
    // Convert to USD first, then to target currency
    const inUSD = amountNum / exchangeRates[fromCurrency];
    return inUSD * exchangeRates[toCurrency];
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const allConversions = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    if (!exchangeRates[fromCurrency]) return [];
    
    const inUSD = amountNum / exchangeRates[fromCurrency];
    
    return CURRENCIES.filter(c => c.code !== fromCurrency).map(currency => ({
      ...currency,
      value: inUSD * (exchangeRates[currency.code] || 0),
    }));
  }, [amount, fromCurrency, exchangeRates]);

  return (
    <div className="space-y-6">
      {/* Main Converter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Currency Converter
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExchangeRates}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Rates
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* From Currency */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono text-lg"
              />
              <Select value={fromCurrency} onValueChange={(v) => setFromCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapCurrencies}
              className="rounded-full"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-2xl font-bold font-mono">
                  {formatCurrency(convertedAmount, toCurrency)}
                </div>
              </div>
              <Select value={toCurrency} onValueChange={(v) => setToCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exchange Rate Info */}
          {exchangeRates[fromCurrency] && exchangeRates[toCurrency] && (
            <div className="p-3 rounded-lg bg-muted/40 text-center">
              <p className="text-sm text-muted-foreground">
                1 {fromCurrency} = {(exchangeRates[toCurrency] / exchangeRates[fromCurrency]).toFixed(4)} {toCurrency}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>All Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allConversions.map((currency) => (
              <div key={currency.code} className="p-4 rounded-lg bg-muted/40 border border-border">
                <div className="text-2xl mb-1">{currency.flag}</div>
                <div className="text-sm text-muted-foreground mb-1">{currency.name}</div>
                <div className="text-lg font-bold font-mono">
                  {formatCurrency(currency.value, currency.code)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
