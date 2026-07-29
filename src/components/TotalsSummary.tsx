import { useEffect, useRef, useState } from "react";
import { Totals } from "@/types/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, Target, Coins } from "lucide-react";
import { formatNumber, formatCurrency } from "@/utils/calculator";
import { motion } from "framer-motion";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface TotalsSummaryProps {
  totals: Totals;
}

function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

const TotalsSummary = ({ totals }: TotalsSummaryProps) => {
  const tradesCount = useCountUp(totals.totalTrades, 600);
  const pipsSigned = useCountUp(Math.abs(totals.totalPipsSigned), 700);
  const pipsAbs = useCountUp(totals.totalPipsAbsolute, 700);
  const profit = useCountUp(Math.abs(totals.totalProfit.amount), 800);

  return (
    <Card className="w-full card-accent-top">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(199_100%_50%/0.12)] border border-[hsl(199_100%_50%/0.2)]">
            <PieChart className="h-4 w-4 text-[hsl(199_100%_55%)]" />
          </div>
          <CardTitle className="text-sm">Totals Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          initial="hidden" animate="visible" variants={staggerContainer}
        >
          {[
            {
              icon: <Target className="h-4 w-4" />,
              label: "Total Trades",
              value: Math.round(tradesCount).toString(),
              color: "cyan",
            },
            {
              icon: <TrendingUp className="h-4 w-4" />,
              label: "Pips (Signed)",
              value: `${totals.totalPipsSigned >= 0 ? "+" : "-"}${formatNumber(pipsSigned, 2)}`,
              color: totals.totalPipsSigned >= 0 ? "green" : "red",
            },
            {
              icon: <TrendingUp className="h-4 w-4" />,
              label: "Pips (Absolute)",
              value: formatNumber(pipsAbs, 2),
              color: "cyan",
            },
          ].map(({ icon, label, value, color }) => (
            <motion.div
              key={label}
              variants={fadeInUp}
              className="rounded-xl p-4"
              style={{ background: "hsl(220 40% 11%)", border: "1px solid hsl(220 32% 18%)" }}
            >
              <div className={`flex items-center gap-1.5 text-xs mb-2 ${
                color === "cyan" ? "text-[hsl(199_100%_50%)]" :
                color === "green" ? "text-[hsl(158_64%_52%)]" :
                "text-[hsl(0_84%_60%)]"
              }`}>
                {icon}
                <span className="label-premium">{label}</span>
              </div>
              <div className={`text-2xl font-bold font-mono-num tabular-nums ${
                color === "cyan" ? "text-[hsl(199_100%_55%)]" :
                color === "green" ? "text-[hsl(158_64%_52%)]" :
                "text-[hsl(0_84%_60%)]"
              }`}>{value}</div>
            </motion.div>
          ))}

          <motion.div
            variants={fadeInUp}
            className="sm:col-span-2 rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, hsl(199 100% 50% / 0.08) 0%, hsl(270 80% 65% / 0.08) 100%)",
              border: `1px solid ${totals.totalProfit.amount >= 0 ? "hsl(158 64% 52% / 0.3)" : "hsl(0 84% 60% / 0.3)"}`,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs mb-2 text-[hsl(215_20%_55%)]">
              <Coins className="h-4 w-4" />
              <span className="label-premium">Total Profit / Loss</span>
            </div>
            <div className={`text-3xl font-bold font-mono-num tabular-nums ${
              totals.totalProfit.amount >= 0 ? "text-[hsl(158_64%_52%)]" : "text-[hsl(0_84%_60%)]"
            }`}>
              {totals.totalProfit.amount < 0 ? "-" : ""}
              {formatCurrency(profit, totals.totalProfit.currency)}
            </div>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default TotalsSummary;
