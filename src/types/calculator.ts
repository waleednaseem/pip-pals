export type TradingPair = "EURUSD" | "GBPUSD" | "USDJPY" | "XAUUSD" | "AUDUSD" | "USDCHF" | "EURJPY";

export type Direction = "BUY" | "SELL";

export type Currency = "USD" | "EUR" | "GBP";

export interface PairConfig {
  pipSize: number;
  contractSize: number;
}

export interface TradeEntry {
  id: string;
  timestamp: string;
  pair: TradingPair;
  entry: number;
  exit: number;
  direction: Direction;
  lot: number;
  contractSize: number;
  pipSize: number;
  pips: number;
  pipValuePerPip: {
    amount: number;
    currency: string;
  };
  profit: {
    amount: number;
    currency: string;
  };
}

export interface Totals {
  totalTrades: number;
  totalPipsSigned: number;
  totalPipsAbsolute: number;
  totalProfit: {
    amount: number;
    currency: string;
  };
}

export interface CalculatorInputs {
  priceA: number;
  priceB: number;
  lot: number;
  accountCurrency: Currency;
  contractSize?: number;
  pipSize?: number;
}
