import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  RotateCcw,
  ShieldAlert,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { FtmoAccountSize, FtmoAccountStyle, FtmoChallenge, FtmoPhase } from "@/types/ftmo";
import {
  FTMO_SIZES,
  allSizePlans,
  buildFtmoPlan,
  calcFtmoDesk,
  formatEur,
  formatSize,
  formatUsd,
  scalingPath,
} from "@/utils/ftmo";

const STORAGE_KEY = "ftmo-calculator";

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
};

const saved = typeof window === "undefined" ? null : loadState();

const FtmoCalculator = () => {
  const [challenge, setChallenge] = useState<FtmoChallenge>(
    saved?.challenge === "1-step" ? "1-step" : "2-step",
  );
  const [size, setSize] = useState<FtmoAccountSize>(
    FTMO_SIZES.includes(Number(saved?.size) as FtmoAccountSize)
      ? (Number(saved?.size) as FtmoAccountSize)
      : 100000,
  );
  const [style, setStyle] = useState<FtmoAccountStyle>(
    saved?.style === "swing" ? "swing" : "standard",
  );
  const [phase, setPhase] = useState<FtmoPhase>(
    saved?.phase === "verification" || saved?.phase === "funded" ? saved.phase : "challenge",
  );
  const [equity, setEquity] = useState(saved?.equity ?? "");
  const [closedBalance, setClosedBalance] = useState(saved?.closedBalance ?? "");
  const [todayStart, setTodayStart] = useState(saved?.todayStart ?? "");
  const [highestEod, setHighestEod] = useState(saved?.highestEod ?? "");
  const [bestDay, setBestDay] = useState(saved?.bestDay ?? "");
  const [positiveDays, setPositiveDays] = useState(saved?.positiveDays ?? "");
  const [tradesPerDay, setTradesPerDay] = useState(saved?.tradesPerDay ?? "3");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        challenge,
        size: String(size),
        style,
        phase,
        equity,
        closedBalance,
        todayStart,
        highestEod,
        bestDay,
        positiveDays,
        tradesPerDay,
      }),
    );
  }, [challenge, size, style, phase, equity, closedBalance, todayStart, highestEod, bestDay, positiveDays, tradesPerDay]);

  const num = (v: string, fallback: number) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const plan = useMemo(
    () => buildFtmoPlan(size, challenge, challenge === "1-step" && phase === "verification" ? "challenge" : phase, style),
    [size, challenge, phase, style],
  );

  const desk = useMemo(() => {
    const initial = plan.initial;
    return calcFtmoDesk({
      size,
      challenge,
      phase: plan.phase,
      style: plan.style,
      equity: num(equity, initial),
      closedBalance: num(closedBalance, num(equity, initial)),
      todayStartBalance: num(todayStart, initial),
      highestEodBalance: num(highestEod, initial),
      bestDayProfit: num(bestDay, 0),
      positiveDaysProfit: num(positiveDays, 0),
      tradesPerDay: num(tradesPerDay, 3),
    });
  }, [size, challenge, plan, style, equity, closedBalance, todayStart, highestEod, bestDay, positiveDays, tradesPerDay]);

  const table = useMemo(
    () => allSizePlans(challenge, plan.phase, plan.style),
    [challenge, plan.phase, plan.style],
  );
  const scales = useMemo(() => scalingPath(size), [size]);

  const handleReset = () => {
    setChallenge("2-step");
    setSize(100000);
    setStyle("standard");
    setPhase("challenge");
    setEquity("");
    setClosedBalance("");
    setTodayStart("");
    setHighestEod("");
    setBestDay("");
    setPositiveDays("");
    setTradesPerDay("3");
    localStorage.removeItem(STORAGE_KEY);
  };

  const Stat = ({
    label,
    value,
    hint,
    tone = "default",
  }: {
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "good" | "warn" | "bad";
  }) => (
    <div className="rounded-2xl glass-input p-3.5 border-0 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`font-mono-num text-lg font-semibold ${
          tone === "good"
            ? "text-[hsl(158_64%_52%)]"
            : tone === "warn"
              ? "text-[hsl(38_92%_60%)]"
              : tone === "bad"
                ? "text-[hsl(0_84%_60%)]"
                : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="glass-card w-full border-0">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl glass-button flex items-center justify-center">
                <Landmark className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">FTMO Challenge</h3>
                <p className="text-[11px] text-muted-foreground">
                  Official % rules converted to dollars for $10k–$200k
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass-input">
            {(["2-step", "1-step"] as FtmoChallenge[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setChallenge(c);
                  if (c === "1-step") {
                    setStyle("standard");
                    if (phase === "verification") setPhase("challenge");
                  }
                }}
                className={`h-9 rounded-xl text-xs font-medium transition-all ${
                  challenge === c
                    ? "glass-button text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "2-step" ? "2-Step" : "1-Step"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Account size</Label>
            <div className="flex flex-wrap gap-1.5">
              {FTMO_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                    size === s
                      ? "border-[hsl(199_100%_50%/0.45)] bg-[hsl(199_100%_50%/0.12)] text-[hsl(199_100%_55%)]"
                      : "border-[hsl(220_32%_18%)] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {formatSize(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {challenge === "2-step" && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl glass-input">
                {(["standard", "swing"] as FtmoAccountStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStyle(st)}
                    className={`h-8 rounded-xl text-[11px] font-medium capitalize transition-all ${
                      style === st
                        ? "glass-button text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
            <div className={`grid ${challenge === "2-step" ? "grid-cols-3" : "grid-cols-2"} gap-1 p-1 rounded-2xl glass-input ${challenge === "1-step" ? "col-span-2" : ""}`}>
              {(challenge === "2-step"
                ? (["challenge", "verification", "funded"] as FtmoPhase[])
                : (["challenge", "funded"] as FtmoPhase[])
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`h-8 rounded-xl text-[11px] font-medium capitalize transition-all ${
                    phase === p
                      ? "glass-button text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "challenge" ? "Phase 1" : p === "verification" ? "Phase 2" : "Funded"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Stat
              label="Profit target"
              value={plan.profitTarget > 0 ? formatUsd(plan.profitTarget) : "None"}
              hint={plan.profitTarget > 0 ? `${plan.profitTargetPct}% · pass at ${formatUsd(plan.passBalance)}` : "No target on FTMO Account"}
              tone="good"
            />
            <Stat
              label={`Daily loss ${plan.dailyLossPct}%`}
              value={formatUsd(plan.dailyLoss)}
              hint={`Day-1 floor ${formatUsd(plan.day1DailyFloor)}`}
              tone="warn"
            />
            <Stat
              label={`Max loss ${plan.maxLossPct}%`}
              value={formatUsd(plan.maxLoss)}
              hint={`${plan.maxLossType === "static" ? "Static" : "EOD trailing"} · floor ${formatUsd(plan.day1MaxFloor)}`}
              tone="bad"
            />
            <Stat label="Fee" value={formatEur(plan.feeEur)} hint={plan.feeRefund ? "100% refund with first reward" : "Not refunded"} />
            <Stat label="Reward split" value={`${plan.rewardPct}%`} hint={plan.rewardPct !== plan.scaledRewardPct ? `Up to ${plan.scaledRewardPct}% after scaling` : "From day one"} />
            <Stat
              label="Other rules"
              value={plan.minTradingDays ? `${plan.minTradingDays} min days` : "No min days"}
              hint={`${plan.leverage} · ${plan.timeLimit}${plan.bestDayPct ? ` · Best day ≤ ${plan.bestDayPct}%` : ""}`}
            />
          </div>

          {challenge === "2-step" && phase === "challenge" && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              After this you still need Verification: {formatUsd(size * 0.05)} more (5%) on the same {formatSize(size)} size, same 5% daily / 10% static max.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card w-full border-0">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[hsl(199_100%_55%)]" />
            <h3 className="text-sm font-semibold">Live risk desk</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Empty fields use starting balance {formatUsd(plan.initial)}. Daily floor = today&apos;s 00:00 CE(S)T balance minus {plan.dailyLossPct}% of initial.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Equity now" value={equity} onChange={setEquity} placeholder={String(plan.initial)} />
            <Field label="Closed balance" value={closedBalance} onChange={setClosedBalance} placeholder="Same as equity" />
            <Field label="Today start (00:00)" value={todayStart} onChange={setTodayStart} placeholder={String(plan.initial)} />
            {plan.maxLossType === "eod-trailing" && (
              <Field label="Highest midnight balance" value={highestEod} onChange={setHighestEod} placeholder={String(plan.initial)} />
            )}
            {plan.bestDayPct != null && (
              <>
                <Field label="Best day profit" value={bestDay} onChange={setBestDay} placeholder="0" />
                <Field label="Positive days profit" value={positiveDays} onChange={setPositiveDays} placeholder="0" />
              </>
            )}
            <Field label="Trades / day" value={tradesPerDay} onChange={setTradesPerDay} placeholder="3" />
          </div>

          {(desk.dailyBreached || desk.maxBreached) && (
            <div className="rounded-2xl p-3 border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] flex gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-[hsl(0_84%_60%)] shrink-0" />
              <p>
                {desk.maxBreached ? "Maximum loss floor breached." : "Daily loss floor breached."} Equity is below the hard limit.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat label="Daily floor" value={formatUsd(desk.dailyFloor)} hint={`Room ${formatUsd(desk.dailyRoom)}`} tone={desk.dailyBreached ? "bad" : "warn"} />
            <Stat label="Max-loss floor" value={formatUsd(desk.maxFloor)} hint={`Room ${formatUsd(desk.maxRoom)}`} tone={desk.maxBreached ? "bad" : "default"} />
            <Stat
              label={plan.profitTarget > 0 ? "Left to pass" : "Closed P/L"}
              value={plan.profitTarget > 0 ? formatUsd(Math.max(0, desk.remainingToTarget)) : formatUsd(desk.profitSoFar)}
              hint={plan.profitTarget > 0 ? `Now ${formatUsd(desk.profitSoFar)} / ${formatUsd(plan.profitTarget)}` : "No target on funded"}
              tone="good"
            />
            <Stat
              label="Risk / trade"
              value={formatUsd(desk.riskPerTradeSplit)}
              hint={`Safe ${formatUsd(desk.riskPerTradeSafe)} · 1/3 daily ${formatUsd(desk.riskPerTradeBalanced)}`}
            />
            <Stat
              label={plan.phase === "funded" ? "Your cut of P/L" : "If you hit target"}
              value={formatUsd(
                plan.phase === "funded"
                  ? Math.max(0, desk.profitSoFar) * (plan.rewardPct / 100)
                  : desk.rewardOnTarget,
              )}
              hint={`${plan.rewardPct}% of ${plan.phase === "funded" ? "closed P/L" : "profit target"}`}
              tone="good"
            />
          </div>

          {plan.profitTarget > 0 && (
            <Bar label="Profit target" pct={desk.targetProgressPct} />
          )}
          <Bar label="Daily loss used" pct={desk.dailyUsedPct} warn />
          <Bar label="Max loss used" pct={desk.maxUsedPct} warn />

          {plan.bestDayPct != null && (
            <div className={`rounded-2xl p-4 border ${desk.bestDayOk ? "border-[hsl(158_64%_52%/0.3)] bg-[hsl(158_64%_52%/0.08)]" : "border-[hsl(38_92%_60%/0.35)] bg-[hsl(38_92%_60%/0.08)]"}`}>
              <div className="flex items-start gap-2">
                {desk.bestDayOk ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-[hsl(158_64%_52%)]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-[hsl(38_92%_60%)]" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Best Day rule (50% of positive days)</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Best day is {desk.bestDaySharePct ?? 0}% of positive-day profit.
                    {desk.bestDayOk
                      ? " This is within the 50% cap."
                      : ` Need at least ${formatUsd(desk.bestDayNeededPositive ?? 0)} total positive-day profit (extra ${formatUsd(desk.bestDayExtraProfit ?? 0)}).`}
                    {plan.cleanPassBestDayMax != null && (
                      <> A clean pass (no losing days) keeps any single day ≤ {formatUsd(plan.cleanPassBestDayMax)}.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card w-full border-0">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[hsl(158_64%_52%)]" />
            <h3 className="text-sm font-semibold">Scaling path (+25% / 4 months, cap $2M)</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Needs 10% net profit in 4 months, 2 rewards processed, and a positive balance at scale-up.
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scales.map((step) => (
              <div key={`${step.month}-${step.size}`} className="min-w-[92px] rounded-xl glass-input p-2.5 text-center border-0">
                <p className="text-[10px] text-muted-foreground">{step.month === 0 ? "Start" : `M${step.month}`}</p>
                <p className="font-mono-num text-sm font-semibold">{formatSize(step.size)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card w-full border-0">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[hsl(199_100%_55%)]" />
            <h3 className="text-sm font-semibold">
              All sizes · {challenge === "2-step" ? "2-Step" : "1-Step"} · {plan.phase === "funded" ? "Funded" : plan.phase === "verification" ? "Verification" : "Challenge"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-[hsl(220_32%_18%)]">
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Pass at</th>
                  <th className="py-2 pr-3">Daily</th>
                  <th className="py-2 pr-3">Max loss</th>
                  <th className="py-2 pr-3">Day-1 floors</th>
                  <th className="py-2">Fee</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr
                    key={row.size}
                    className={`border-b border-[hsl(220_32%_14%)] ${row.size === size ? "text-[hsl(199_100%_55%)]" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">{formatSize(row.size)}</td>
                    <td className="py-2.5 pr-3 font-mono-num">{row.profitTarget > 0 ? formatUsd(row.profitTarget) : "—"}</td>
                    <td className="py-2.5 pr-3 font-mono-num">{row.profitTarget > 0 ? formatUsd(row.passBalance) : "—"}</td>
                    <td className="py-2.5 pr-3 font-mono-num">{formatUsd(row.dailyLoss)}</td>
                    <td className="py-2.5 pr-3 font-mono-num">{formatUsd(row.maxLoss)}</td>
                    <td className="py-2.5 pr-3 font-mono-num text-[11px]">
                      {formatUsd(row.day1DailyFloor)} / {formatUsd(row.day1MaxFloor)}
                    </td>
                    <td className="py-2.5 font-mono-num">{formatEur(row.feeEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Daily loss amount is always {plan.dailyLossPct}% of the initial balance, subtracted from that day&apos;s midnight balance — not from current equity. 2-Step max loss is static at 90% of initial. 1-Step max loss trails the highest midnight balance. Standard funded accounts restrict news and weekend holding; Swing (2-Step only) does not, at 1:30 leverage. Fees are listed EUR prices and change with promotions — confirm on FTMO.com. Simulated trading only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Input
      type="number"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="glass-input h-11 border-0 font-mono-num"
    />
  </div>
);

const Bar = ({ label, pct, warn }: { label: string; pct: number; warn?: boolean }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={pct >= 100 ? "text-[hsl(0_84%_60%)]" : warn && pct >= 70 ? "text-[hsl(38_92%_60%)]" : ""}>
        {Math.min(pct, 999).toFixed(1)}%
      </span>
    </div>
    <Progress value={Math.min(100, Math.max(0, pct))} className="h-2" />
  </div>
);

export default FtmoCalculator;
