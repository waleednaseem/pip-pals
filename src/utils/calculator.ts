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

/**
 * Calculate profit from pips and lot size
 * @param pips - Number of pips (absolute value)
 * @param lotSize - Lot size
 * @param pipSize - Pip size for the pair
 * @param contractSize - Contract size for the pair
 * @param entryPrice - Entry price (optional, for direction inference)
 * @param exitPrice - Exit price (optional, for direction inference)
 * @returns Profit amount (positive for profit, negative for loss)
 */
export const calculateProfitFromPipsAndLot = (
  pips: number,
  lotSize: number,
  pipSize: number,
  contractSize: number,
  entryPrice?: number,
  exitPrice?: number,
  lotMultiplier: number = 1
): number => {
  const pipValuePerPip = pipSize * lotSize * contractSize * lotMultiplier;
  const absoluteProfit = pips * pipValuePerPip;
  
  // If we have entry and exit prices, determine sign based on direction
  if (entryPrice !== undefined && exitPrice !== undefined && entryPrice !== exitPrice) {
    const direction: Direction = exitPrice > entryPrice ? "BUY" : "SELL";
    if (direction === "BUY") {
      return exitPrice >= entryPrice ? absoluteProfit : -absoluteProfit;
    } else {
      return entryPrice >= exitPrice ? absoluteProfit : -absoluteProfit;
    }
  }
  
  // Without direction, return absolute profit (positive)
  // User can manually adjust the sign if needed
  return absoluteProfit;
};

/**
 * Calculate lot size from pips and profit
 * @param pips - Number of pips (absolute value)
 * @param profit - Profit amount (can be negative for loss)
 * @param pipSize - Pip size for the pair
 * @param contractSize - Contract size for the pair
 * @returns Lot size
 */
export const calculateLotSizeFromPipsAndProfit = (
  pips: number,
  profit: number,
  pipSize: number,
  contractSize: number
): number => {
  if (pips === 0) return 0;
  const absoluteProfit = Math.abs(profit);
  const lotSize = absoluteProfit / (pips * pipSize * contractSize);
  return parseFloat(lotSize.toFixed(4));
};

/**
 * Calculate pips from lot size and profit
 * @param lotSize - Lot size
 * @param profit - Profit amount (can be negative for loss)
 * @param pipSize - Pip size for the pair
 * @param contractSize - Contract size for the pair
 * @returns Number of pips (absolute value)
 */
export const calculatePipsFromLotAndProfit = (
  lotSize: number,
  profit: number,
  pipSize: number,
  contractSize: number,
  lotMultiplier: number = 1
): number => {
  if (lotSize === 0) return 0;
  const absoluteProfit = Math.abs(profit);
  const pipValuePerPip = pipSize * lotSize * contractSize * lotMultiplier;
  if (pipValuePerPip === 0) return 0;
  const pips = absoluteProfit / pipValuePerPip;
  return parseFloat(pips.toFixed(2));
};