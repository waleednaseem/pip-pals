import { TradeEntry, TradingPair } from "@/types/calculator";

const STORAGE_KEYS = {
  TRADES: "forex_calculator_trades",
  SELECTED_PAIR: "forex_calculator_pair",
};

export const saveTradeToStorage = (trade: TradeEntry): void => {
  const trades = getTradesFromStorage();
  trades.push(trade);
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
};

export const getTradesFromStorage = (): TradeEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TRADES);
  return stored ? JSON.parse(stored) : [];
};

export const clearTradesFromStorage = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TRADES);
};

export const saveSelectedPair = (pair: TradingPair): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_PAIR, pair);
};

export const getSelectedPair = (): TradingPair | null => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_PAIR) as TradingPair | null;
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
  ]);

  // Calculate totals
  const totalPipsSigned = trades.reduce((sum, trade) => sum + trade.pips, 0);
  const totalPipsAbsolute = trades.reduce((sum, trade) => sum + Math.abs(trade.pips), 0);
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit.amount, 0);
  const currency = trades[0]?.profit.currency || "USD";

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
    "",
    `TOTALS,,,,,${totalPipsSigned.toFixed(2)} (Signed),,,,`,
    `,,,,,,${totalPipsAbsolute.toFixed(2)} (Absolute),,,${totalProfit.toFixed(2)},${currency}`,
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
