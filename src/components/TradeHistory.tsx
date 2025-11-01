import { TradeEntry } from "@/types/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatNumber, formatCurrency } from "@/utils/calculator";

interface TradeHistoryProps {
  trades: TradeEntry[];
}

const TradeHistory = ({ trades }: TradeHistoryProps) => {
  if (trades.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Trade History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No trades yet. Add your first calculation above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Trade History ({trades.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {trades.slice().reverse().map((trade) => (
              <div
                key={trade.id}
                className="p-4 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{trade.pair}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          trade.direction === "BUY"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xl font-bold font-mono-num flex items-center gap-1 ${
                        trade.profit.amount >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {trade.profit.amount >= 0 ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      {formatCurrency(trade.profit.amount, trade.profit.currency)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Entry</div>
                    <div className="font-mono-num font-semibold">
                      {formatNumber(trade.entry, 5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Exit</div>
                    <div className="font-mono-num font-semibold">
                      {formatNumber(trade.exit, 5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Pips</div>
                    <div className="font-mono-num font-semibold text-primary">
                      {formatNumber(trade.pips, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Lot</div>
                    <div className="font-mono-num font-semibold">
                      {formatNumber(trade.lot, 2)}
                    </div>
                  </div>

                  {trade.duration && (
                    <div className="col-span-2 md:col-span-4">
                      <div className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Duration
                      </div>
                      <div className="font-mono-num font-semibold">
                        {trade.duration.formatted}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({trade.duration.value} {trade.duration.unit})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
