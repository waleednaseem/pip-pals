import { Totals } from "@/types/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, Target, Coins } from "lucide-react";
import { formatNumber, formatCurrency } from "@/utils/calculator";

interface TotalsSummaryProps {
  totals: Totals;
}

const TotalsSummary = ({ totals }: TotalsSummaryProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Totals Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="h-4 w-4" />
              Total Trades
            </div>
            <div className="text-3xl font-bold font-mono-num">
              {totals.totalTrades}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Pips (Signed)
            </div>
            <div
              className={`text-3xl font-bold font-mono-num ${
                totals.totalPipsSigned >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {totals.totalPipsSigned >= 0 ? "+" : ""}
              {formatNumber(totals.totalPipsSigned, 2)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Pips (Absolute)
            </div>
            <div className="text-3xl font-bold font-mono-num text-primary">
              {formatNumber(totals.totalPipsAbsolute, 2)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Coins className="h-4 w-4" />
              Total Profit/Loss
            </div>
            <div
              className={`text-4xl font-bold font-mono-num ${
                totals.totalProfit.amount >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {formatCurrency(totals.totalProfit.amount, totals.totalProfit.currency)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalsSummary;
