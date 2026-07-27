import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Newspaper,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Coins,
} from "lucide-react";
import { CalendarEvent, NewsItem } from "@/types/marketFeeds";
import { fetchEconomicCalendar, fetchMarketNews, NEWS_SOURCE_NAMES } from "@/utils/marketFeeds";
import { cn } from "@/lib/utils";

const CURRENCY_FILTERS = ["USD", "EUR", "GBP", "JPY", "AUD", "CHF"] as const;

const impactStyles: Record<string, string> = {
  High: "bg-red-500/15 text-red-500 border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Low: "bg-muted text-muted-foreground border-border",
  Holiday: "bg-sky-500/15 text-sky-500 border-sky-500/30",
};

const timeAgo = (dateStr: string): string => {
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return "";
  const diffMin = Math.round((Date.now() - date) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
};

const formatEventTime = (dateStr: string): { day: string; time: string; isPast: boolean } => {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    isPast: d.getTime() < Date.now(),
  };
};

export default function MarketUpdates() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarErrors, setCalendarErrors] = useState<string[]>([]);
  const [calendarUpdatedAt, setCalendarUpdatedAt] = useState<number | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsErrors, setNewsErrors] = useState<string[]>([]);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<number | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);

  const [currencyFilter, setCurrencyFilter] = useState<string[]>(["USD", "EUR"]);
  const [sourceFilter, setSourceFilter] = useState<string>("All");

  const loadCalendar = async (force = false) => {
    setLoadingCalendar(true);
    const res = await fetchEconomicCalendar(force);
    setCalendarEvents(res.items);
    setCalendarErrors(res.errors);
    setCalendarUpdatedAt(res.fetchedAt);
    setLoadingCalendar(false);
  };

  const loadNews = async (force = false) => {
    setLoadingNews(true);
    const res = await fetchMarketNews(force);
    setNews(res.items);
    setNewsErrors(res.errors);
    setNewsUpdatedAt(res.fetchedAt);
    setLoadingNews(false);
  };

  useEffect(() => {
    loadCalendar();
    loadNews();
  }, []);

  const handleRefreshAll = () => {
    loadCalendar(true);
    loadNews(true);
  };

  const toggleCurrency = (code: string) => {
    setCurrencyFilter((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const filteredEvents = useMemo(() => {
    if (currencyFilter.length === 0) return calendarEvents;
    return calendarEvents.filter((e) => currencyFilter.includes(e.country));
  }, [calendarEvents, currencyFilter]);

  const filteredNews = useMemo(() => {
    if (sourceFilter === "All") return news;
    return news.filter((n) => n.source === sourceFilter);
  }, [news, sourceFilter]);

  const isXauRelevant = (country: string) => country === "USD";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Market Updates
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={loadingCalendar || loadingNews}>
            <RefreshCw className={cn("h-4 w-4 mr-2", (loadingCalendar || loadingNews) && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Free news &amp; economic calendar for XAU, USD, EUR and more — sourced from Forex Factory, BBC, CNN, Bloomberg &amp; FXStreet.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Economic Calendar
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
          </TabsList>

          {/* Economic Calendar */}
          <TabsContent value="calendar" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap gap-2">
                {CURRENCY_FILTERS.map((code) => (
                  <Badge
                    key={code}
                    variant="outline"
                    className={cn(
                      "cursor-pointer select-none transition-colors",
                      currencyFilter.includes(code)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground"
                    )}
                    onClick={() => toggleCurrency(code)}
                  >
                    {code === "USD" && <Coins className="h-3 w-3 mr-1 inline" />}
                    {code}
                  </Badge>
                ))}
              </div>
              {calendarUpdatedAt && (
                <span className="text-xs text-muted-foreground">
                  Updated {timeAgo(new Date(calendarUpdatedAt).toISOString())}
                </span>
              )}
            </div>

            {calendarErrors.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Couldn't refresh: {calendarErrors.join(", ")}</span>
              </div>
            )}

            {loadingCalendar && calendarEvents.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Loading calendar…</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No events found for the selected currencies this week.
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredEvents.map((event) => {
                  const { day, time, isPast } = formatEventTime(event.date);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-opacity",
                        isPast ? "opacity-50" : "bg-muted/20"
                      )}
                    >
                      <div className="w-20 shrink-0 text-xs text-muted-foreground leading-tight">
                        <div>{day}</div>
                        <div className="font-medium text-foreground">{time}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 w-14 justify-center">
                        {event.country}
                      </Badge>
                      <Badge className={cn("shrink-0 border", impactStyles[event.impact])} variant="outline">
                        {event.impact}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {event.title}
                          {isXauRelevant(event.country) && (
                            <span title="Affects XAU/USD (Gold)">
                              <Coins className="h-3 w-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Forecast: {event.forecast} · Previous: {event.previous}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* News */}
          <TabsContent value="news" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap gap-2">
                {["All", ...NEWS_SOURCE_NAMES].map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className={cn(
                      "cursor-pointer select-none transition-colors",
                      sourceFilter === name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setSourceFilter(name)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
              {newsUpdatedAt && (
                <span className="text-xs text-muted-foreground">
                  Updated {timeAgo(new Date(newsUpdatedAt).toISOString())}
                </span>
              )}
            </div>

            {newsErrors.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Unavailable right now: {newsErrors.join(", ")}</span>
              </div>
            )}

            {loadingNews && news.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Loading news…</div>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No news available right now. Try refreshing in a moment.
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredNews.map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{item.source}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.pubDate)}</span>
                    </div>
                    <div className="text-sm font-medium flex items-start gap-1.5">
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
