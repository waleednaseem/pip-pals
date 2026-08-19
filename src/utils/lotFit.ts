export const REF_STANDARD_DEPOSIT = 10000;
export const REF_LOT = 0.01;
export const MICRO_CONTRACT_RATIO = 100;
export const REF_MICRO_DEPOSIT = REF_STANDARD_DEPOSIT / MICRO_CONTRACT_RATIO;
export const MIN_LOT = 0.01;
export const DEFAULT_PROFIT_PCT = 10;

export type LotFitAccount = "standard" | "micro";

export const roundLot = (lot: number): number => {
  if (!isFinite(lot) || lot <= 0) return 0;
  return Math.round(lot * 100) / 100;
};

export const profitFromDeposit = (deposit: number, profitPct: number): number => {
  if (!isFinite(deposit) || deposit <= 0) return 0;
  const pct = isFinite(profitPct) ? profitPct : DEFAULT_PROFIT_PCT;
  return deposit * (pct / 100);
};

export const lotsFromDeposit = (deposit: number) => {
  if (!isFinite(deposit) || deposit <= 0) {
    return {
      standardExact: 0,
      microExact: 0,
      standardRounded: 0,
      microRounded: 0,
      standardBelowMin: true,
    };
  }

  const standardExact = REF_LOT * (deposit / REF_STANDARD_DEPOSIT);
  const microExact = REF_LOT * (deposit / REF_MICRO_DEPOSIT);

  return {
    standardExact,
    microExact,
    standardRounded: roundLot(standardExact),
    microRounded: roundLot(microExact),
    standardBelowMin: standardExact < MIN_LOT,
  };
};

export const recommendAccount = (deposit: number): LotFitAccount =>
  deposit >= REF_STANDARD_DEPOSIT ? "standard" : "micro";

export const depositFromLot = (lot: number, account: LotFitAccount): number => {
  if (!isFinite(lot) || lot <= 0) return 0;
  const base = account === "standard" ? REF_STANDARD_DEPOSIT : REF_MICRO_DEPOSIT;
  return (lot / REF_LOT) * base;
};
