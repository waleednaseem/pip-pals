import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Scale,
  RotateCcw,
  Wallet,
  Layers,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  DEFAULT_PROFIT_PCT,
  MIN_LOT,
  REF_MICRO_DEPOSIT,
  REF_STANDARD_DEPOSIT,
  depositFromLot,
  lotsFromDeposit,
  profitFromDeposit,
  recommendAccount,
  type LotFitAccount,
} from "@/utils/lotFit";

type Mode = "deposit" | "lot";

const DEPOSIT_CHIPS = [100, 500, 1000, 5000, 10000];

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const lotLabel = (exact: number, rounded: number) => {
  if (exact <= 0) return "—";
  const r = rounded.toFixed(2);
  const e = exact < 0.01 ? exact.toFixed(4) : exact.toFixed(2);
  return e === r ? r : `${r}  (${e} exact)`;
};

const LotFitCalculator = () => {
  const [mode, setMode] = useState<Mode>("deposit");
  const [deposit, setDeposit] = useState("100");
  const [lot, setLot] = useState("0.01");
  const [lotAccount, setLotAccount] = useState<LotFitAccount>("micro");
  const [profitPct, setProfitPct] = useState(String(DEFAULT_PROFIT_PCT));

  const pct = parseFloat(profitPct);
  const profitPctSafe = isNaN(pct) || pct < 0 ? DEFAULT_PROFIT_PCT : pct;

  const depositNum = parseFloat(deposit);
  const lotNum = parseFloat(lot);

  const fromDeposit = useMemo(() => {
    if (isNaN(depositNum) || depositNum <= 0) return null;
    const lots = lotsFromDeposit(depositNum);
    const account = recommendAccount(depositNum);
    return {
      ...lots,
      account,
      profit: profitFromDeposit(depositNum, profitPctSafe),
    };
  }, [depositNum, profitPctSafe]);

  const fromLot = useMemo(() => {
    if (isNaN(lotNum) || lotNum <= 0) return null;
    const needed = depositFromLot(lotNum, lotAccount);
    return {
      needed,
      profit: profitFromDeposit(needed, profitPctSafe),
      belowMin: lotNum < MIN_LOT,
    };
  }, [lotNum, lotAccount, profitPctSafe]);

  const handleReset = () => {
    setMode("deposit");
    setDeposit("100");
    setLot("0.01");
    setLotAccount("micro");
    setProfitPct(String(DEFAULT_PROFIT_PCT));
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card w-full border-0">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl glass-button flex items-center justify-center">
                <Scale className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">LotFit</h3>
                <p className="text-[11px] text-muted-foreground">
                  Match deposit to min lot — Standard vs XM Micro
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

          <p className="text-xs text-muted-foreground leading-relaxed">
            Standard min lot is <span className="text-foreground font-medium">0.01</span> and that
            size fits <span className="text-foreground font-medium">$10,000</span>. XM Micro is 100×
            smaller, so <span className="text-foreground font-medium">0.01 micro</span> fits the same
            feel on <span className="text-foreground font-medium">$100</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 border border-[hsl(199_100%_50%/0.2)] bg-[hsl(199_100%_50%/0.06)]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Standard</p>
              <p className="text-lg font-semibold font-mono-num">0.01 lot</p>
              <p className="text-sm text-muted-foreground mt-1">needs {usd(REF_STANDARD_DEPOSIT)}</p>
              <p className="text-[11px] text-[hsl(158_64%_52%)] mt-2">10% = {usd(REF_STANDARD_DEPOSIT * 0.1)}</p>
            </div>
            <div className="rounded-2xl p-4 border border-[hsl(270_80%_65%/0.25)] bg-[hsl(270_80%_65%/0.08)]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">XM Micro</p>
              <p className="text-lg font-semibold font-mono-num">0.01 lot</p>
              <p className="text-sm text-muted-foreground mt-1">fits {usd(REF_MICRO_DEPOSIT)}</p>
              <p className="text-[11px] text-[hsl(158_64%_52%)] mt-2">10% = {usd(REF_MICRO_DEPOSIT * 0.1)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass-input">
            <button
              onClick={() => setMode("deposit")}
              className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all ${
                mode === "deposit"
                  ? "glass-button text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              I have deposit
            </button>
            <button
              onClick={() => setMode("lot")}
              className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all ${
                mode === "lot"
                  ? "glass-button text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              I want this lot
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Target profit %
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={profitPct}
              onChange={(e) => setProfitPct(e.target.value)}
              className="glass-input h-11 border-0 font-mono-num text-base"
            />
          </div>

          {mode === "deposit" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Your deposit (USD)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g. 100"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="glass-input h-12 border-0 font-mono-num text-lg"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEPOSIT_CHIPS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setDeposit(String(n))}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      depositNum === n
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {usd(n)}
                  </button>
                ))}
              </div>

              {fromDeposit && (
                <div className="space-y-3 pt-1">
                  <div
                    className={`rounded-2xl p-4 flex items-start gap-3 border ${
                      fromDeposit.account === "standard"
                        ? "border-[hsl(199_100%_50%/0.25)] bg-[hsl(199_100%_50%/0.08)]"
                        : "border-[hsl(270_80%_65%/0.3)] bg-[hsl(270_80%_65%/0.1)]"
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[hsl(158_64%_52%)]" />
                    <div>
                      <p className="text-sm font-semibold">
                        Use {fromDeposit.account === "standard" ? "Standard" : "XM Micro"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {fromDeposit.account === "standard"
                          ? "Deposit is $10,000 or more — 0.01 Standard lot can sit comfortably."
                          : "Below $10,000, Standard cannot go under 0.01 lot. XM Micro keeps the same risk feel."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl glass-input p-4 space-y-2 border-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Standard lot</p>
                      <p className="font-mono-num text-xl font-semibold">
                        {lotLabel(fromDeposit.standardExact, fromDeposit.standardRounded)}
                      </p>
                      {fromDeposit.standardBelowMin && (
                        <p className="text-[11px] text-[hsl(38_92%_60%)] flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          Below broker min 0.01 — do not use Standard at this deposit.
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl glass-input p-4 space-y-2 border-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">XM Micro lot</p>
                      <p className="font-mono-num text-xl font-semibold">
                        {lotLabel(fromDeposit.microExact, fromDeposit.microRounded)}
                      </p>
                      {fromDeposit.microRounded < MIN_LOT && fromDeposit.microExact > 0 && (
                        <p className="text-[11px] text-[hsl(38_92%_60%)] flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          Below 0.01 micro — add deposit toward {usd(REF_MICRO_DEPOSIT)}.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl glass-input h-16 flex items-center justify-between px-4 border-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {profitPctSafe}% profit on this deposit
                      </p>
                      <p className="font-mono-num text-xl font-semibold text-[hsl(158_64%_52%)]">
                        {usd(fromDeposit.profit)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">USD</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "lot" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass-input">
                <button
                  onClick={() => setLotAccount("micro")}
                  className={`h-9 rounded-xl text-xs font-medium transition-all ${
                    lotAccount === "micro"
                      ? "glass-button text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  XM Micro
                </button>
                <button
                  onClick={() => setLotAccount("standard")}
                  className={`h-9 rounded-xl text-xs font-medium transition-all ${
                    lotAccount === "standard"
                      ? "glass-button text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Standard
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Lot size
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.01"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className="glass-input h-12 border-0 font-mono-num text-lg"
                />
              </div>

              {fromLot && (
                <div className="space-y-3">
                  {fromLot.belowMin && (
                    <p className="text-[11px] text-[hsl(38_92%_60%)] flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      Broker minimum lot is 0.01.
                    </p>
                  )}
                  <div className="rounded-2xl p-4 border border-[hsl(199_100%_50%/0.2)] bg-[hsl(199_100%_50%/0.06)]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Comfortable deposit for {lotNum.toFixed(2)} {lotAccount === "micro" ? "micro" : "standard"}
                    </p>
                    <p className="font-mono-num text-2xl font-semibold mt-1">{usd(fromLot.needed)}</p>
                    <p className="text-xs text-[hsl(158_64%_52%)] mt-2">
                      {profitPctSafe}% target = {usd(fromLot.profit)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LotFitCalculator;
