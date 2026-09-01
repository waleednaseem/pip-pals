import type {
  FtmoAccountSize,
  FtmoAccountStyle,
  FtmoChallenge,
  FtmoDeskInput,
  FtmoDeskResult,
  FtmoPhase,
  FtmoRuleSet,
  FtmoScaleStep,
  FtmoSizePlan,
} from "@/types/ftmo";

export const FTMO_SIZES: FtmoAccountSize[] = [10000, 25000, 50000, 100000, 200000];
export const FTMO_SCALE_CAP = 2_000_000;

export const FTMO_RULES: Record<FtmoChallenge, FtmoRuleSet> = {
  "2-step": {
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyLossPct: 5,
    maxLossPct: 10,
    maxLossType: "static",
    minTradingDays: 4,
    bestDayPct: null,
    rewardPct: 80,
    scaledRewardPct: 90,
    feeRefund: true,
    swingAvailable: true,
  },
  "1-step": {
    phase1TargetPct: 10,
    phase2TargetPct: 0,
    dailyLossPct: 3,
    maxLossPct: 10,
    maxLossType: "eod-trailing",
    minTradingDays: 0,
    bestDayPct: 50,
    rewardPct: 90,
    scaledRewardPct: 90,
    feeRefund: false,
    swingAvailable: false,
  },
};

/** Listed EUR fees. Promos change — confirm on FTMO.com before paying. */
export const FTMO_FEES_EUR: Record<FtmoChallenge, Record<FtmoAccountSize, number>> = {
  "2-step": { 10000: 89, 25000: 250, 50000: 345, 100000: 540, 200000: 1080 },
  "1-step": { 10000: 79, 25000: 199, 50000: 319, 100000: 499, 200000: 999 },
};

const money = (n: number) => Math.round(n * 100) / 100;

export const pctOf = (size: number, pct: number) => money(size * (pct / 100));

export const targetPctForPhase = (challenge: FtmoChallenge, phase: FtmoPhase): number => {
  const rules = FTMO_RULES[challenge];
  if (phase === "funded") return 0;
  if (challenge === "1-step") return rules.phase1TargetPct;
  return phase === "verification" ? rules.phase2TargetPct : rules.phase1TargetPct;
};

export const minDaysForPhase = (challenge: FtmoChallenge, phase: FtmoPhase): number => {
  if (phase === "funded" || challenge === "1-step") return 0;
  return FTMO_RULES[challenge].minTradingDays;
};

export const leverageForStyle = (style: FtmoAccountStyle): string =>
  style === "swing" ? "1:30 FX" : "1:100 FX";

export const buildFtmoPlan = (
  size: FtmoAccountSize,
  challenge: FtmoChallenge,
  phase: FtmoPhase = "challenge",
  style: FtmoAccountStyle = "standard",
): FtmoSizePlan => {
  const rules = FTMO_RULES[challenge];
  const resolvedStyle: FtmoAccountStyle = rules.swingAvailable ? style : "standard";
  const profitTargetPct = targetPctForPhase(challenge, phase);
  const profitTarget = pctOf(size, profitTargetPct);
  const dailyLoss = pctOf(size, rules.dailyLossPct);
  const maxLoss = pctOf(size, rules.maxLossPct);
  const cleanPassBestDayMax =
    rules.bestDayPct != null && profitTarget > 0
      ? money(profitTarget * (rules.bestDayPct / 100))
      : null;

  return {
    size,
    challenge,
    phase,
    style: resolvedStyle,
    initial: size,
    profitTargetPct,
    profitTarget,
    passBalance: money(size + profitTarget),
    dailyLossPct: rules.dailyLossPct,
    dailyLoss,
    day1DailyFloor: money(size - dailyLoss),
    maxLossPct: rules.maxLossPct,
    maxLoss,
    day1MaxFloor: money(size - maxLoss),
    maxLossType: rules.maxLossType,
    minTradingDays: minDaysForPhase(challenge, phase),
    bestDayPct: rules.bestDayPct,
    cleanPassBestDayMax,
    rewardPct: rules.rewardPct,
    scaledRewardPct: rules.scaledRewardPct,
    feeEur: FTMO_FEES_EUR[challenge][size],
    feeRefund: rules.feeRefund,
    leverage: leverageForStyle(resolvedStyle),
    timeLimit: "Unlimited",
  };
};

export const allSizePlans = (challenge: FtmoChallenge, phase: FtmoPhase, style: FtmoAccountStyle) =>
  FTMO_SIZES.map((size) => buildFtmoPlan(size, challenge, phase, style));

export const calcDailyFloor = (todayStartBalance: number, dailyLoss: number) =>
  money(todayStartBalance - dailyLoss);

export const calcMaxFloor = (
  initial: number,
  maxLoss: number,
  type: FtmoSizePlan["maxLossType"],
  highestEodBalance: number,
) => {
  if (type === "static") return money(initial - maxLoss);
  const peak = Math.max(initial, highestEodBalance);
  return money(peak - maxLoss);
};

export const calcBestDayStatus = (
  bestDayPct: number | null,
  bestDayProfit: number,
  positiveDaysProfit: number,
) => {
  if (bestDayPct == null) {
    return { sharePct: null, neededPositive: null, extraProfit: null, ok: null as boolean | null };
  }
  const best = Math.max(0, bestDayProfit);
  const positive = Math.max(0, positiveDaysProfit);
  const neededPositive = money(best / (bestDayPct / 100));
  const extraProfit = money(Math.max(0, neededPositive - positive));
  const sharePct = positive > 0 ? money((best / positive) * 100) : best > 0 ? 100 : 0;
  const ok = best === 0 || sharePct <= bestDayPct + 1e-9;
  return { sharePct, neededPositive, extraProfit, ok };
};

export const calcFtmoDesk = (input: FtmoDeskInput): FtmoDeskResult => {
  const plan = buildFtmoPlan(input.size, input.challenge, input.phase, input.style);
  const equity = Number.isFinite(input.equity) ? input.equity : plan.initial;
  const closedBalance = Number.isFinite(input.closedBalance) ? input.closedBalance : equity;
  const todayStart = Number.isFinite(input.todayStartBalance) ? input.todayStartBalance : plan.initial;
  const highestEod = Number.isFinite(input.highestEodBalance) ? input.highestEodBalance : plan.initial;
  const trades = Math.max(1, Math.floor(input.tradesPerDay) || 1);

  const dailyFloor = calcDailyFloor(todayStart, plan.dailyLoss);
  const maxFloor = calcMaxFloor(plan.initial, plan.maxLoss, plan.maxLossType, highestEod);
  const dailyRoom = money(equity - dailyFloor);
  const maxRoom = money(equity - maxFloor);
  const profitSoFar = money(closedBalance - plan.initial);
  const remainingToTarget = plan.profitTarget > 0 ? money(plan.passBalance - closedBalance) : 0;
  const targetProgressPct =
    plan.profitTarget > 0 ? money(Math.max(0, Math.min(100, (profitSoFar / plan.profitTarget) * 100))) : 0;

  const dailyUsed = money(Math.max(0, todayStart - equity));
  const dailyUsedPct = plan.dailyLoss > 0 ? money(Math.min(999, (dailyUsed / plan.dailyLoss) * 100)) : 0;
  const peakRef = plan.maxLossType === "static" ? plan.initial : Math.max(plan.initial, highestEod);
  const maxUsed = money(Math.max(0, peakRef - equity));
  const maxUsedPct = plan.maxLoss > 0 ? money(Math.min(999, (maxUsed / plan.maxLoss) * 100)) : 0;

  const best = calcBestDayStatus(plan.bestDayPct, input.bestDayProfit, input.positiveDaysProfit);
  const bufferDaily = plan.dailyLoss * 0.8;

  return {
    plan,
    dailyFloor,
    maxFloor,
    dailyRoom,
    maxRoom,
    remainingToTarget,
    profitSoFar,
    targetProgressPct,
    dailyUsed,
    dailyUsedPct,
    maxUsed,
    maxUsedPct,
    dailyBreached: equity < dailyFloor,
    maxBreached: equity < maxFloor,
    riskPerTradeSafe: money(plan.dailyLoss * 0.2),
    riskPerTradeBalanced: money(plan.dailyLoss / 3),
    riskPerTradeSplit: money(bufferDaily / trades),
    bestDaySharePct: best.sharePct,
    bestDayNeededPositive: best.neededPositive,
    bestDayExtraProfit: best.extraProfit,
    bestDayOk: best.ok,
    rewardOnTarget: money(plan.profitTarget * (plan.rewardPct / 100)),
  };
};

export const scalingPath = (start: number, cap = FTMO_SCALE_CAP, maxSteps = 16): FtmoScaleStep[] => {
  const steps: FtmoScaleStep[] = [{ month: 0, size: start }];
  let size = start;
  let month = 0;
  while (size < cap && steps.length < maxSteps) {
    month += 4;
    size = Math.min(money(size * 1.25), cap);
    steps.push({ month, size });
  }
  return steps;
};

export const formatUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const formatEur = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const formatSize = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)}k`;
  return formatUsd(n);
};
