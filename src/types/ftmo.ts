export type FtmoChallenge = "2-step" | "1-step";
export type FtmoPhase = "challenge" | "verification" | "funded";
export type FtmoAccountStyle = "standard" | "swing";
export type FtmoAccountSize = 10000 | 25000 | 50000 | 100000 | 200000;
export type FtmoMaxLossType = "static" | "eod-trailing";

export interface FtmoRuleSet {
  phase1TargetPct: number;
  phase2TargetPct: number;
  dailyLossPct: number;
  maxLossPct: number;
  maxLossType: FtmoMaxLossType;
  minTradingDays: number;
  bestDayPct: number | null;
  rewardPct: number;
  scaledRewardPct: number;
  feeRefund: boolean;
  swingAvailable: boolean;
}

export interface FtmoSizePlan {
  size: FtmoAccountSize;
  challenge: FtmoChallenge;
  phase: FtmoPhase;
  style: FtmoAccountStyle;
  initial: number;
  profitTargetPct: number;
  profitTarget: number;
  passBalance: number;
  dailyLossPct: number;
  dailyLoss: number;
  day1DailyFloor: number;
  maxLossPct: number;
  maxLoss: number;
  day1MaxFloor: number;
  maxLossType: FtmoMaxLossType;
  minTradingDays: number;
  bestDayPct: number | null;
  cleanPassBestDayMax: number | null;
  rewardPct: number;
  scaledRewardPct: number;
  feeEur: number;
  feeRefund: boolean;
  leverage: string;
  timeLimit: string;
}

export interface FtmoDeskInput {
  size: FtmoAccountSize;
  challenge: FtmoChallenge;
  phase: FtmoPhase;
  style: FtmoAccountStyle;
  equity: number;
  closedBalance: number;
  todayStartBalance: number;
  highestEodBalance: number;
  bestDayProfit: number;
  positiveDaysProfit: number;
  tradesPerDay: number;
}

export interface FtmoDeskResult {
  plan: FtmoSizePlan;
  dailyFloor: number;
  maxFloor: number;
  dailyRoom: number;
  maxRoom: number;
  remainingToTarget: number;
  profitSoFar: number;
  targetProgressPct: number;
  dailyUsed: number;
  dailyUsedPct: number;
  maxUsed: number;
  maxUsedPct: number;
  dailyBreached: boolean;
  maxBreached: boolean;
  riskPerTradeSafe: number;
  riskPerTradeBalanced: number;
  riskPerTradeSplit: number;
  bestDaySharePct: number | null;
  bestDayNeededPositive: number | null;
  bestDayExtraProfit: number | null;
  bestDayOk: boolean | null;
  rewardOnTarget: number;
}

export interface FtmoScaleStep {
  month: number;
  size: number;
}
