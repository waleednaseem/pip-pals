import { v4 as uuidv4 } from "uuid";
import { TradeEntry, Direction, CalculatorInputs, TradingPair } from "@/types/calculator";

export const calculateTrade = (
  inputs: CalculatorInputs,
  pair: TradingPair
): TradeEntry => {
  const { priceA, priceB, lot, accountCurrency, contractSize, pipSize } = inputs;

  // Determine direction
  const direction: Direction = priceB > priceA ? "BUY" : "SELL";

  // Calculate pips
  const priceDiff = Math.abs(priceB - priceA);
  const pips = parseFloat((priceDiff / pipSize!).toFixed(2));

  // Calculate pip value per pip
  const pipValuePerPip = (pipSize! / priceA) * (lot * contractSize!);
  const pipValuePerPipRounded = parseFloat(pipValuePerPip.toFixed(2));

  // Calculate profit (signed based on direction)
  let profitAmount = pips * pipValuePerPip;
  if (direction === "SELL") {
    profitAmount = priceA > priceB ? profitAmount : -profitAmount;
  } else {
    profitAmount = priceB > priceA ? profitAmount : -profitAmount;
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    pair,
    entry: priceA,
    exit: priceB,
    direction,
    lot,
    contractSize: contractSize!,
    pipSize: pipSize!,
    pips,
    pipValuePerPip: {
      amount: pipValuePerPipRounded,
      currency: accountCurrency,
    },
    profit: {
      amount: parseFloat(profitAmount.toFixed(2)),
      currency: accountCurrency,
    },
  };
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${amount >= 0 ? "+" : ""}${formatNumber(amount, 2)} ${currency}`;
};
