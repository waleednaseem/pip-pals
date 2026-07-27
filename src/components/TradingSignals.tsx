import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, AlertTriangle, ExternalLink, Flame, RefreshCw, ShieldAlert } from "lucide-react";
import { TradingViewChart, TradingViewTechnicalAnalysis } from "@/components/TradingViewWidgets";
import { CalendarEvent, NewsItem } from "@/types/marketFeeds";
import { fetchEconomicCalendar, fetchMarketNews } from "@/utils/marketFeeds";
import {
  SIGNAL_PAIRS,
  filterCalendarForPair,
  filterNewsForPair,
  getTodaysHighImpactEvents,
  isHotNews,
} from "@/utils/tradingSignals";
import { cn } from "@/lib/utils";

const timeAgo = (dateStr: string): string => {
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return "";
  const diffMin = Math.round((Date.now() - date) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
};

export default function TradingSignals() {
  const [pairCode, setPairCode] = useState(SIGNAL_PAIRS[0].code);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const pair = useMemo(() => SIGNAL_PAIRS.find((p) => p.code === pairCode)!, [pairCode]);

  const loadData = async (force = false) => {
    setLoading(true);
    const [newsRes, calRes] = await Promise.all([
      fetchMarketNews(force),
      fetchEconomicCalendar(force),
    ]);
    setAllNews(newsRes.items);
    setAllEvents(calRes.items);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pairNews = useMemo(() => filterNewsForPair(allNews, pair), [allNews, pair]);
  const pairEvents = useMemo(() => filterCalendarForPair(allEvents, pair), [allEvents, pair]);
  const riskEvents = useMemo(() => getTodaysHighImpactEvents(pairEvents), [pairEvents]);
  const highImpactCount = riskEvents.filter((e) => e.impact === "High").length;
  const hotNewsToday = useMemo(() => pairNews.filter(isHotNews), [pairNews]);

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trading Signals
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={pairCode} onValueChange={setPairCode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_PAIRS.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Free real-time chart &amp; technical Buy/Sell signal (via TradingView), plus{" "}
            {pair.label} news and today's risk events — for informational purposes, not financial advice.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border min-h-[620px]">
            <div className="px-3 py-2 text-sm font-medium border-b bg-muted/30">
              {pair.label} — Live Chart
            </div>
            <TradingViewChart symbol={pair.tvSymbol} height={620} />
          </div>

          <div className="rounded-lg overflow-hidden border min-h-[520px] flex flex-col">
            <div className="px-3 py-2 text-sm font-medium border-b bg-muted/30">
              Buy / Sell Signal — {pair.label}
            </div>
            <TradingViewTechnicalAnalysis symbol={pair.tvSymbol} height={500} />
          </div>

          {/* Risk briefing */}
          <div
            className={cn(
              "rounded-lg border p-4 space-y-3",
              highImpactCount > 0 ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"
            )}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <ShieldAlert className={cn("h-4 w-4", highImpactCount > 0 ? "text-red-500" : "text-emerald-500")} />
                Today's Risk Briefing — {pair.label}
              </div>
              <Badge variant="outline" className={highImpactCount > 0 ? "border-red-500/40 text-red-500" : "border-emerald-500/40 text-emerald-500"}>
                {riskEvents.length === 0
                  ? "Calm day — no major events"
                  : `${riskEvents.length} notable event${riskEvents.length > 1 ? "s" : ""} (${highImpactCount} high-impact)`}
              </Badge>
            </div>

            {riskEvents.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {riskEvents.map((e) => (
                  <div key={e.id} className="text-xs flex items-center gap-2 bg-background/50 rounded-md px-2 py-1.5 border">
                    <Badge variant={e.impact === "High" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                      {e.impact}
                    </Badge>
                    <span className="text-muted-foreground shrink-0">{e.country}</span>
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-muted-foreground shrink-0">
                      {new Date(e.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hotNewsToday.length > 0 && (
              <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-amber-500">
                <Flame className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Breaking/political headline may drive volatility today: "{hotNewsToday[0].title}" ({hotNewsToday[0].source})
                </span>
              </div>
            )}
          </div>

          {/* Filtered news */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Latest {pair.label} News
            </div>
            {loading && pairNews.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading news…</div>
            ) : pairNews.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No {pair.label}-specific news right now. Check the Market Updates tab for general headlines.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {pairNews.map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{item.source}</Badge>
                        {isHotNews(item) && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 gap-1">
                            <Flame className="h-2.5 w-2.5" /> Breaking
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.pubDate)}</span>
                    </div>
                    <div className="text-sm font-medium flex items-start gap-1.5">
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Source: {item.source}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
