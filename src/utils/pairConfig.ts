import { TradingPair, PairConfig } from "@/types/calculator";

export const PAIR_CONFIGS: Record<TradingPair, PairConfig> = {
  EURUSD: { pipSize: 0.0001, contractSize: 100000 },
  GBPUSD: { pipSize: 0.0001, contractSize: 100000 },
  USDJPY: { pipSize: 0.01, contractSize: 100000 },
  XAUUSD: { pipSize: 0.01, contractSize: 100 },
  AUDUSD: { pipSize: 0.0001, contractSize: 100000 },
  USDCHF: { pipSize: 0.0001, contractSize: 100000 },
  EURJPY: { pipSize: 0.01, contractSize: 100000 },
};

export const getPairConfig = (pair: TradingPair): PairConfig => {
  return PAIR_CONFIGS[pair] ?? { pipSize: 0.0001, contractSize: 100000 };
};

export const TRADING_PAIRS: TradingPair[] = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAUUSD",
  "AUDUSD",
  "USDCHF",
  "EURJPY",
];
