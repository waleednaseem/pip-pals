import { TradeEntry, TradingPair } from "@/types/calculator";
import { PAIR_CONFIGS } from "@/utils/pairConfig";

const STORAGE_KEYS = {
  TRADES: "forex_calculator_trades",
  SELECTED_PAIR: "forex_calculator_pair",
};

const VALID_PAIRS = new Set<string>(Object.keys(PAIR_CONFIGS));

const signedPips = (trade: TradeEntry): number => {
  if (trade.direction === "BUY") {
    return trade.exit > trade.entry ? trade.pips : trade.exit < trade.entry ? -trade.pips : 0;
  }
  return trade.entry > trade.exit ? trade.pips : trade.entry < trade.exit ? -trade.pips : 0;
};

export const saveTradeToStorage = (trade: TradeEntry): void => {
  const trades = getTradesFromStorage();
  trades.push(trade);
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
};

export const getTradesFromStorage = (): TradeEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRADES);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEYS.TRADES);
    return [];
  }
};

export const clearTradesFromStorage = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TRADES);
};

export const saveSelectedPair = (pair: TradingPair): void => {
  if (!VALID_PAIRS.has(pair)) return;
  localStorage.setItem(STORAGE_KEYS.SELECTED_PAIR, pair);
};

export const getSelectedPair = (): TradingPair | null => {
  const pair = localStorage.getItem(STORAGE_KEYS.SELECTED_PAIR);
  if (!pair || !VALID_PAIRS.has(pair)) {
    if (pair) localStorage.removeItem(STORAGE_KEYS.SELECTED_PAIR);
    return null;
  }
  return pair as TradingPair;
};

export const clearSelectedPair = (): void => {
  localStorage.removeItem(STORAGE_KEYS.SELECTED_PAIR);
};

export const exportTradesToCSV = (trades: TradeEntry[]): void => {
  if (trades.length === 0) return;

  const headers = [
    "Timestamp",
    "Pair",
    "Entry",
    "Exit",
    "Direction",
    "Lot",
    "Pips",
    "Pip Value",
    "Currency",
    "Profit",
    "Currency",
    "Duration Value",
    "Duration Unit",
    "Duration (Hours & Minutes)",
  ];

  const rows = trades.map((trade) => [
    new Date(trade.timestamp).toLocaleString(),
    trade.pair,
    trade.entry.toFixed(5),
    trade.exit.toFixed(5),
    trade.direction,
    trade.lot.toFixed(2),
    trade.pips.toFixed(2),
    trade.pipValuePerPip.amount.toFixed(2),
    trade.pipValuePerPip.currency,
    trade.profit.amount.toFixed(2),
    trade.profit.currency,
    trade.duration ? trade.duration.value.toString() : "",
    trade.duration ? trade.duration.unit : "",
    trade.duration ? trade.duration.formatted : "",
  ]);

  const totalPipsSigned = trades.reduce((sum, trade) => sum + signedPips(trade), 0);
  const totalPipsAbsolute = trades.reduce((sum, trade) => sum + Math.abs(trade.pips), 0);
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit.amount, 0);
  const currency = trades[0]?.profit.currency || "USD";

  const totalsRowSigned = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    `${totalPipsSigned.toFixed(2)} (Signed)`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];

  const totalsRowAbsolute = [
    "",
    "",
    "",
    "",
    "",
    "",
    `${totalPipsAbsolute.toFixed(2)} (Absolute)`,
    "",
    "",
    totalProfit.toFixed(2),
    currency,
    "",
    "",
    "",
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
    "",
    totalsRowSigned.join(","),
    totalsRowAbsolute.join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `forex_trades_${Date.now()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
