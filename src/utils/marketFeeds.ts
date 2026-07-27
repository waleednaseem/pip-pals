import { CalendarEvent, CalendarImpact, FeedFetchResult, NewsItem } from "@/types/marketFeeds";

// All sources below are free, publicly available feeds that do not require an API key.
const FF_CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const NEWS_SOURCES: { name: string; url: string }[] = [
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "CNN Business", url: "http://rss.cnn.com/rss/money_latest.rss" },
  { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss" },
  { name: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
];

const CACHE_KEY_CALENDAR = "market_feeds_calendar_v1";
const CACHE_KEY_NEWS = "market_feeds_news_v1";
// Forex Factory's export file is only refreshed hourly on their end and
// aggressively rate-limits repeated requests, so we cache generously.
const CACHE_TTL_CALENDAR = 55 * 60 * 1000; // 55 min
const CACHE_TTL_NEWS = 10 * 60 * 1000; // 10 min

// Free CORS proxies tried in order. Direct fetch is attempted first since some
// feeds may add permissive CORS headers in the future. Each strategy may also
// wrap the payload (e.g. a reader service), so an optional `extract` unwraps
// it back to the original content.
interface ProxyStrategy {
  name: string;
  buildUrl: (url: string) => string;
  extract?: (raw: string) => string;
}

const PROXY_STRATEGIES: ProxyStrategy[] = [
  { name: "direct", buildUrl: (url) => url },
  { name: "allorigins", buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "corsproxy.io", buildUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
  {
    name: "jina.ai-reader",
    buildUrl: (url) => `https://r.jina.ai/${url}`,
    extract: (raw) => {
      const marker = "Markdown Content:";
      const idx = raw.indexOf(marker);
      return idx >= 0 ? raw.slice(idx + marker.length).trim() : raw;
    },
  },
  { name: "codetabs", buildUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
];

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const fetchTextWithFallback = async (
  url: string,
  opts?: { timeoutMs?: number; validate?: (text: string) => boolean }
): Promise<string> => {
  const timeoutMs = opts?.timeoutMs ?? 9000;
  const validate = opts?.validate ?? (() => true);
  let lastError: unknown;
  for (const strategy of PROXY_STRATEGIES) {
    try {
      const res = await fetchWithTimeout(strategy.buildUrl(url), timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      if (strategy.extract) text = strategy.extract(text);
      if (!text || text.trim().length === 0) throw new Error("Empty response");
      if (!validate(text)) throw new Error(`Unexpected content from ${strategy.name}`);
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All sources failed");
};

function getCached<T>(key: string, ttl: number): { data: T; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; fetchedAt: number };
    if (Date.now() - parsed.fetchedAt > ttl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getStaleCache<T>(key: string): { data: T; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; fetchedAt: number };
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): number {
  const fetchedAt = Date.now();
  try {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt }));
  } catch {
    // ignore storage quota errors
  }
  return fetchedAt;
}

const stripHtml = (html: string): string =>
  html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// ---------------- Economic Calendar (Forex Factory weekly export) ----------------

interface RawFFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

const normalizeImpact = (impact: string): CalendarImpact => {
  const lower = impact.toLowerCase();
  if (lower.includes("high")) return "High";
  if (lower.includes("medium")) return "Medium";
  if (lower.includes("holiday")) return "Holiday";
  return "Low";
};

export const fetchEconomicCalendar = async (
  forceRefresh = false
): Promise<FeedFetchResult<CalendarEvent>> => {
  if (!forceRefresh) {
    const cached = getCached<CalendarEvent[]>(CACHE_KEY_CALENDAR, CACHE_TTL_CALENDAR);
    if (cached) {
      return { items: cached.data, errors: [], fetchedAt: cached.fetchedAt, stale: false };
    }
  }

  try {
    const text = await fetchTextWithFallback(FF_CALENDAR_URL, {
      validate: (t) => t.trim().startsWith("["),
    });
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error("Calendar source returned a non-JSON response (likely rate-limited)");
    }
    if (!Array.isArray(raw)) {
      throw new Error("Calendar source returned an unexpected response");
    }
    const events: CalendarEvent[] = (raw as RawFFEvent[]).map((e, idx) => ({
      id: `${e.country}-${e.date}-${idx}`,
      title: e.title,
      country: e.country,
      date: e.date,
      impact: normalizeImpact(e.impact),
      forecast: e.forecast || "-",
      previous: e.previous || "-",
    }));
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const fetchedAt = setCache(CACHE_KEY_CALENDAR, events);
    return { items: events, errors: [], fetchedAt, stale: false };
  } catch {
    const stale = getStaleCache<CalendarEvent[]>(CACHE_KEY_CALENDAR);
    if (stale) {
      return { items: stale.data, errors: ["Economic Calendar (showing cached)"], fetchedAt: stale.fetchedAt, stale: true };
    }
    return { items: [], errors: ["Economic Calendar"], fetchedAt: Date.now(), stale: true };
  }
};

// ---------------- News (RSS feeds from BBC, CNN, Bloomberg, FXStreet) ----------------

interface Rss2JsonItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

const fetchViaRss2Json = async (feedUrl: string, sourceName: string): Promise<NewsItem[]> => {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const res = await fetchWithTimeout(apiUrl, 9000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok" || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("rss2json returned no items");
  }
  return (data.items as Rss2JsonItem[]).slice(0, 12).map((it, idx) => ({
    id: `${sourceName}-${idx}-${it.link ?? it.title ?? idx}`,
    source: sourceName,
    title: stripHtml(it.title ?? "Untitled"),
    link: it.link ?? "",
    pubDate: it.pubDate ?? "",
    description: stripHtml(it.description ?? "").slice(0, 200),
  }));
};

const parseRssXml = (xmlText: string, sourceName: string): NewsItem[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML parse error");

  const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 12);
  if (items.length === 0) throw new Error("No items in feed");

  return items.map((el, idx) => {
    const title = el.querySelector("title")?.textContent ?? "Untitled";
    const linkEl = el.querySelector("link");
    const link = linkEl?.getAttribute("href") || linkEl?.textContent || "";
    const pubDate =
      el.querySelector("pubDate")?.textContent ||
      el.querySelector("published")?.textContent ||
      el.querySelector("updated")?.textContent ||
      "";
    const description =
      el.querySelector("description")?.textContent ||
      el.querySelector("summary")?.textContent ||
      "";
    return {
      id: `${sourceName}-${idx}-${link || title}`,
      source: sourceName,
      title: stripHtml(title),
      link,
      pubDate,
      description: stripHtml(description).slice(0, 200),
    };
  });
};

const fetchSingleFeed = async (name: string, url: string): Promise<NewsItem[]> => {
  try {
    return await fetchViaRss2Json(url, name);
  } catch {
    const xmlText = await fetchTextWithFallback(url);
    return parseRssXml(xmlText, name);
  }
};

export const fetchMarketNews = async (
  forceRefresh = false
): Promise<FeedFetchResult<NewsItem>> => {
  if (!forceRefresh) {
    const cached = getCached<NewsItem[]>(CACHE_KEY_NEWS, CACHE_TTL_NEWS);
    if (cached) {
      return { items: cached.data, errors: [], fetchedAt: cached.fetchedAt, stale: false };
    }
  }

  const results = await Promise.allSettled(
    NEWS_SOURCES.map((s) => fetchSingleFeed(s.name, s.url))
  );

  const items: NewsItem[] = [];
  const errors: string[] = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      errors.push(NEWS_SOURCES[idx].name);
    }
  });

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  if (items.length > 0) {
    const fetchedAt = setCache(CACHE_KEY_NEWS, items);
    return { items, errors, fetchedAt, stale: false };
  }

  const stale = getStaleCache<NewsItem[]>(CACHE_KEY_NEWS);
  if (stale) {
    return { items: stale.data, errors: [...errors, "(showing cached news)"], fetchedAt: stale.fetchedAt, stale: true };
  }
  return { items: [], errors, fetchedAt: Date.now(), stale: true };
};

export const NEWS_SOURCE_NAMES = NEWS_SOURCES.map((s) => s.name);
