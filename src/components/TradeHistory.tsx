import { TradeEntry } from "@/types/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatNumber, formatCurrency } from "@/utils/calculator";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

interface TradeHistoryProps {
  trades: TradeEntry[];
}

const TradeHistory = ({ trades }: TradeHistoryProps) => {
  if (trades.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(270_80%_65%/0.12)] border border-[hsl(270_80%_65%/0.2)]">
              <History className="h-4 w-4 text-[hsl(270_80%_72%)]" />
            </div>
            <CardTitle className="text-sm">Trade History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-[hsl(220_32%_14%)] flex items-center justify-center">
              <History className="h-5 w-5 text-[hsl(215_20%_45%)]" />
            </div>
            <p className="text-[hsl(215_20%_45%)] text-sm">No trades yet. Add your first calculation above.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reversed = trades.slice().reverse();

  return (
    <Card className="w-full card-accent-purple">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(270_80%_65%/0.12)] border border-[hsl(270_80%_65%/0.2)]">
              <History className="h-4 w-4 text-[hsl(270_80%_72%)]" />
            </div>
            <CardTitle className="text-sm">Trade History</CardTitle>
          </div>
          <span className="badge-purple">{trades.length} trades</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px] pr-2">
          <div className="space-y-2">
            {reversed.map((trade, i) => (
              <motion.div
                key={trade.id}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="p-4 rounded-xl border cursor-default transition-colors duration-200 hover:bg-[hsl(220_40%_12%)]"
                style={{
                  background: "hsl(220 40% 11%)",
                  borderColor: trade.profit.amount >= 0 ? "hsl(158 64% 52% / 0.15)" : "hsl(0 84% 60% / 0.15)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm font-mono-num text-[hsl(210_40%_92%)]">{trade.pair}</span>
                      <span className={trade.direction === "BUY" ? "badge-green" : "badge-red"}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="text-[10px] text-[hsl(215_20%_40%)]">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono-num flex items-center gap-1 ${
                      trade.profit.amount >= 0 ? "text-[hsl(158_64%_52%)]" : "text-[hsl(0_84%_60%)]"
                    }`}>
                      {trade.profit.amount >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(trade.profit.amount, trade.profit.currency)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Entry", value: formatNumber(trade.entry, 5) },
                    { label: "Exit", value: formatNumber(trade.exit, 5) },
                    { label: "Pips", value: formatNumber(trade.pips, 2), highlight: true },
                    { label: "Lot", value: formatNumber(trade.lot, 2) },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="rounded-lg p-2" style={{background: "hsl(220 40% 13%)"}}>
                      <div className="text-[10px] text-[hsl(215_20%_40%)] mb-0.5">{label}</div>
                      <div className={`font-mono-num font-semibold text-xs ${highlight ? "text-[hsl(199_100%_55%)]" : "text-[hsl(210_40%_85%)]"}`}>{value}</div>
                    </div>
                  ))}
                  {trade.duration && (
                    <div className="col-span-4 rounded-lg p-2 flex items-center gap-2" style={{background: "hsl(220 40% 13%)"}}>
                      <Clock className="h-3 w-3 text-[hsl(215_20%_40%)]" />
                      <span className="text-[10px] text-[hsl(215_20%_40%)]">Duration</span>
                      <span className="font-mono-num font-semibold text-xs text-[hsl(210_40%_85%)]">{trade.duration.formatted}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
