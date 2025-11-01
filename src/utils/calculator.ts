import { v4 as uuidv4 } from "uuid";
import {
  TradeEntry,
  Direction,
  CalculatorInputs,
  TradingPair,
} from "@/types/calculator";
import { buildDurationDetails } from "@/utils/time";

export const calculateTrade = (
  inputs: CalculatorInputs,
  pair: TradingPair
): TradeEntry => {
  const { priceA, priceB, lot, accountCurrency, contractSize, pipSize } = inputs;

  // Determine direction
  const direction: Direction = priceB > priceA ? "BUY" : "SELL";

  // Calculate pips (always absolute)
  const priceDiff = Math.abs(priceB - priceA);
  const pips = parseFloat((priceDiff / pipSize!).toFixed(2));

  // Calculate pip value per pip
  // For XAUUSD and most instruments where USD is quote currency:
  // Pip value = pip_size * lot * contract_size
  const pipValuePerPip = pipSize! * lot * contractSize!;
  const pipValuePerPipRounded = parseFloat(pipValuePerPip.toFixed(2));

  // Calculate profit with correct sign
  // For BUY: profit if exit > entry, loss if exit < entry
  // For SELL: profit if entry > exit, loss if entry < exit
  let profitAmount: number;
  
  if (direction === "BUY") {
    // BUY: profit when price goes up
    const priceDiffSigned = priceB - priceA;
    profitAmount = (priceDiffSigned / pipSize!) * pipValuePerPip;
  } else {
    // SELL: profit when price goes down
    const priceDiffSigned = priceA - priceB;
    profitAmount = (priceDiffSigned / pipSize!) * pipValuePerPip;
  }

  const durationDetails = inputs.duration
    ? buildDurationDetails(inputs.duration.value, inputs.duration.unit)
    : undefined;

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
    duration: durationDetails
      ? {
          ...durationDetails,
        }
      : undefined,
  };
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

export const formatCurrency = (amount: number, currency: string): string => {
  return `${amount >= 0 ? "+" : ""}${formatNumber(amount, 2)} ${currency}`;
};
