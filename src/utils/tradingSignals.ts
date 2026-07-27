import { CalendarEvent, NewsItem } from "@/types/marketFeeds";

export interface SignalPair {
  code: string;
  label: string;
  tvSymbol: string; // TradingView symbol code
  currencies: string[]; // currency codes relevant to this pair (calendar filter)
}

export const SIGNAL_PAIRS: SignalPair[] = [
  { code: "XAUUSD", label: "XAU/USD (Gold)", tvSymbol: "OANDA:XAUUSD", currencies: ["USD", "XAU"] },
  { code: "EURUSD", label: "EUR/USD", tvSymbol: "FX:EURUSD", currencies: ["EUR", "USD"] },
  { code: "GBPUSD", label: "GBP/USD", tvSymbol: "FX:GBPUSD", currencies: ["GBP", "USD"] },
  { code: "USDJPY", label: "USD/JPY", tvSymbol: "FX:USDJPY", currencies: ["USD", "JPY"] },
  { code: "GBPJPY", label: "GBP/JPY", tvSymbol: "FX:GBPJPY", currencies: ["GBP", "JPY"] },
  { code: "AUDUSD", label: "AUD/USD", tvSymbol: "FX:AUDUSD", currencies: ["AUD", "USD"] },
  { code: "USDCHF", label: "USD/CHF", tvSymbol: "FX:USDCHF", currencies: ["USD", "CHF"] },
  { code: "EURJPY", label: "EUR/JPY", tvSymbol: "FX:EURJPY", currencies: ["EUR", "JPY"] },
];

// Keywords used to match free-text news against a currency/asset.
const CURRENCY_KEYWORDS: Record<string, string[]> = {
  USD: ["usd", "dollar", "fed", "federal reserve", "powell", "fomc", "nonfarm", "u.s. economy", "us economy", "treasury"],
  EUR: ["eur", "euro", "ecb", "eurozone", "lagarde", "european central bank"],
  GBP: ["gbp", "pound", "sterling", "boe", "bank of england"],
  JPY: ["jpy", "yen", "boj", "bank of japan"],
  AUD: ["aud", "aussie", "rba", "australian dollar"],
  CHF: ["chf", "franc", "snb", "swiss national bank", "swiss franc"],
  XAU: ["gold", "xau", "bullion", "precious metal", "safe haven"],
};

// Keywords that flag a headline as potentially market-moving / breaking news.
export const HOT_KEYWORDS = [
  "trump", "president", "white house", "war", "tariff", "emergency",
  "crisis", "intervention", "sanction", "strike", "ceasefire", "election",
  "rate hike", "rate cut", "invasion", "conflict", "attack", "shutdown",
  "recession", "inflation surge", "military",
];

export const getKeywordsForPair = (pair: SignalPair): string[] => {
  const set = new Set<string>();
  pair.currencies.forEach((c) => (CURRENCY_KEYWORDS[c] || []).forEach((k) => set.add(k)));
  return Array.from(set);
};

const matchesKeywords = (text: string, keywords: string[]): boolean => {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
};

export const isHotNews = (item: NewsItem): boolean =>
  matchesKeywords(`${item.title} ${item.description}`, HOT_KEYWORDS);

export const filterNewsForPair = (news: NewsItem[], pair: SignalPair): NewsItem[] => {
  const keywords = getKeywordsForPair(pair);
  const filtered = news.filter((n) => matchesKeywords(`${n.title} ${n.description}`, keywords));
  // Surface breaking/political news first, then keep original recency order.
  return [...filtered].sort((a, b) => {
    const hotA = isHotNews(a) ? 1 : 0;
    const hotB = isHotNews(b) ? 1 : 0;
    return hotB - hotA;
  });
};

export const filterCalendarForPair = (events: CalendarEvent[], pair: SignalPair): CalendarEvent[] =>
  events.filter((e) => pair.currencies.includes(e.country));

export const getTodaysHighImpactEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  return events.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= startOfDay && t < endOfDay && (e.impact === "High" || e.impact === "Medium");
  });
};
