import {
  AiEnrichmentEntry,
  BusinessIdea,
  IdeaFeedResult,
} from "@/types/businessIdeas";

// All sources below are free, publicly available RSS/Atom feeds that do not require an API key.
const IDEA_SOURCES: { name: string; url: string }[] = [
  { name: "r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/.rss" },
  { name: "r/SideProject", url: "https://www.reddit.com/r/SideProject/.rss" },
  { name: "r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/.rss" },
  { name: "Show HN", url: "https://hnrss.org/show" },
  { name: "Indie Hackers", url: "https://www.indiehackers.com/rss.xml" },
];

export const IDEA_SOURCE_NAMES = IDEA_SOURCES.map((s) => s.name);

export const LANGUAGE_OPTIONS = ["English", "Roman Urdu", "Urdu/Arabic Script", "French", "Spanish"] as const;

export const COUNTRY_OPTIONS = [
  "Global",
  "United States",
  "Canada",
  "United Kingdom",
  "Pakistan",
  "India",
  "UAE",
  "Saudi Arabia",
  "Australia",
  "Germany",
  "France",
  "Bangladesh",
  "Nigeria",
  "South Africa",
  "Brazil",
  "Mexico",
  "Philippines",
  "Indonesia",
  "Singapore",
  "Malaysia",
  "Turkey",
  "Japan",
] as const;

const CACHE_KEY_RAW = "business_ideas_raw_v1";
const CACHE_TTL_RAW = 20 * 60 * 1000; // 20 min

const AI_CACHE_KEY = "business_ideas_ai_cache_v1";
const AI_CACHE_MAX_ENTRIES = 800;

const OPENAI_KEY_STORAGE = "business_ideas_openai_key";
const OPENAI_MODEL = "gpt-4o-mini";
const AI_BATCH_SIZE = 12;

// ---------------- Fetch plumbing (proxy fallback, same approach as marketFeeds.ts) ----------------

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

const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const fetchTextWithFallback = async (url: string, timeoutMs = 9000): Promise<string> => {
  let lastError: unknown;
  for (const strategy of PROXY_STRATEGIES) {
    try {
      const res = await fetchWithTimeout(strategy.buildUrl(url), timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      if (strategy.extract) text = strategy.extract(text);
      if (!text || text.trim().length === 0) throw new Error("Empty response");
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

// Lightweight offline guess so a language filter is usable even without an AI key.
// AI enrichment (when available) overrides this with a more accurate value.
const ROMAN_URDU_WORDS = [
  " hay", " hain", " kar", " karna", " nahi", " kyun", " kya", " acha", " theek",
  " mein", " tum", " aap", " bhai", " yaar", " paisa", " paisay", " chahiye", " wala",
];
const FRENCH_WORDS = [" le ", " la ", " les ", " et ", " des ", " une ", " pour ", " avec ", " est ", " dans ", " qui ", " vous "];
const SPANISH_WORDS = [" el ", " los ", " las ", " y ", " de ", " para ", " con ", " es ", " en ", " que ", " usted "];

const countMatches = (text: string, words: string[]): number =>
  words.reduce((count, w) => (text.includes(w) ? count + 1 : count), 0);

export const detectLanguage = (text: string): string => {
  if (/[\u0600-\u06FF]/.test(text)) return "Urdu/Arabic Script";
  const padded = ` ${text.toLowerCase()} `;
  const romanUrduScore = countMatches(padded, ROMAN_URDU_WORDS);
  const frenchScore = countMatches(padded, FRENCH_WORDS);
  const spanishScore = countMatches(padded, SPANISH_WORDS);
  if (romanUrduScore >= 2) return "Roman Urdu";
  if (frenchScore >= 3) return "French";
  if (spanishScore >= 3) return "Spanish";
  return "English";
};

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

// ---------------- RSS/Atom parsing ----------------

const parseFeedXml = (xmlText: string, sourceName: string): BusinessIdea[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML parse error");

  const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 20);
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
      el.querySelector("content")?.textContent ||
      "";
    const id = `${sourceName}-${idx}-${link || title}`;
    const cleanTitle = stripHtml(title);
    const cleanDescription = stripHtml(description).slice(0, 500);
    return {
      id,
      source: sourceName,
      title: cleanTitle,
      link,
      pubDate,
      description: cleanDescription,
      category: "Uncategorized",
      originCountry: "Unknown",
      suitableCountries: ["Unknown"],
      costEstimate: null,
      language: detectLanguage(`${cleanTitle} ${cleanDescription}`),
      aiTagged: false,
    } satisfies BusinessIdea;
  });
};

const fetchSingleSource = async (name: string, url: string): Promise<BusinessIdea[]> => {
  const xmlText = await fetchTextWithFallback(url);
  return parseFeedXml(xmlText, name);
};

// ---------------- Public: fetch raw ideas ----------------

export const fetchBusinessIdeas = async (forceRefresh = false): Promise<IdeaFeedResult> => {
  if (!forceRefresh) {
    const cached = getCached<BusinessIdea[]>(CACHE_KEY_RAW, CACHE_TTL_RAW);
    if (cached) {
      return { items: applyAiCache(cached.data), errors: [], fetchedAt: cached.fetchedAt, stale: false };
    }
  }

  const results = await Promise.allSettled(
    IDEA_SOURCES.map((s) => fetchSingleSource(s.name, s.url))
  );

  const items: BusinessIdea[] = [];
  const errors: string[] = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      errors.push(IDEA_SOURCES[idx].name);
    }
  });

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  if (items.length > 0) {
    const fetchedAt = setCache(CACHE_KEY_RAW, items);
    return { items: applyAiCache(items), errors, fetchedAt, stale: false };
  }

  const stale = getStaleCache<BusinessIdea[]>(CACHE_KEY_RAW);
  if (stale) {
    return {
      items: applyAiCache(stale.data),
      errors: [...errors, "(showing cached ideas)"],
      fetchedAt: stale.fetchedAt,
      stale: true,
    };
  }
  return { items: [], errors, fetchedAt: Date.now(), stale: true };
};

// ---------------- AI enrichment (OpenAI) ----------------

export const getOpenAiKey = (): string => localStorage.getItem(OPENAI_KEY_STORAGE) || "";

export const setOpenAiKey = (key: string): void => {
  if (key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  else localStorage.removeItem(OPENAI_KEY_STORAGE);
};

function getAiCache(): Record<string, AiEnrichmentEntry> {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AiEnrichmentEntry>) : {};
  } catch {
    return {};
  }
}

function saveAiCache(cache: Record<string, AiEnrichmentEntry>): void {
  try {
    const entries = Object.entries(cache);
    const trimmed =
      entries.length > AI_CACHE_MAX_ENTRIES ? entries.slice(entries.length - AI_CACHE_MAX_ENTRIES) : entries;
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // ignore storage quota errors
  }
}

const mergeEntry = (idea: BusinessIdea, entry: AiEnrichmentEntry): BusinessIdea => ({
  ...idea,
  category: entry.category || idea.category,
  originCountry: entry.originCountry || idea.originCountry,
  suitableCountries: entry.suitableCountries?.length ? entry.suitableCountries : idea.suitableCountries,
  costEstimate: entry.costEstimate,
  language: entry.language || idea.language,
  aiTagged: true,
});

/** Applies any already-cached AI tags onto freshly fetched raw items (no API calls). */
export const applyAiCache = (items: BusinessIdea[]): BusinessIdea[] => {
  const cache = getAiCache();
  return items.map((idea) => (cache[idea.id] ? mergeEntry(idea, cache[idea.id]) : idea));
};

interface OpenAiBatchResult {
  id: string;
  isBusinessIdea: boolean;
  originCountry: string;
  suitableCountries: string[];
  costEstimate: { minUsd: number; maxUsd: number; label: string } | null;
  category: string;
  language: string;
}

const buildPrompt = (batch: BusinessIdea[]): string =>
  JSON.stringify(
    batch.map((i) => ({ id: i.id, title: i.title, description: i.description.slice(0, 400) }))
  );

const callOpenAiBatch = async (batch: BusinessIdea[], apiKey: string): Promise<OpenAiBatchResult[]> => {
  const systemPrompt = `You are a business analyst. For each post given, decide if it describes or discusses a viable business/startup idea. Respond ONLY with JSON of this exact shape:
{"results": [{"id": string, "isBusinessIdea": boolean, "originCountry": string, "suitableCountries": string[], "costEstimate": {"minUsd": number, "maxUsd": number, "label": string} | null, "category": string, "language": string}]}
Rules:
- originCountry: the country the post/author appears to be from. Use "Global" if not determinable.
- suitableCountries: 1-4 countries where this idea would work best commercially. Use ["Global"] if broadly applicable anywhere.
- costEstimate: a realistic rough USD startup cost range to get this idea off the ground. Use null only if isBusinessIdea is false.
- category: a short business category label (e.g. "E-commerce", "SaaS", "Local Service", "Content/Media", "Marketplace").
- language: the language the post is written in (e.g. "English", "Roman Urdu", "Urdu/Arabic Script", "French", "Spanish").
- Use full country names (e.g. "Canada", "United States", "United Kingdom", "Pakistan", "India", "UAE").
Return one result per input id, in any order, with no extra commentary.`;

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", 30000, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildPrompt(batch) },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid OpenAI API key");
    if (res.status === 429) throw new Error("OpenAI rate limit reached");
    throw new Error(`OpenAI HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const parsed = JSON.parse(content) as { results: OpenAiBatchResult[] };
  if (!Array.isArray(parsed.results)) throw new Error("Unexpected OpenAI response shape");
  return parsed.results;
};

export interface EnrichProgress {
  done: number;
  total: number;
}

/**
 * Enriches ideas that aren't already AI-cached, in small batches, to control token usage.
 * Ideas the model marks as not a real business idea are filtered out of the returned list.
 */
export const enrichIdeasWithAI = async (
  items: BusinessIdea[],
  apiKey: string,
  onProgress?: (p: EnrichProgress) => void
): Promise<{ items: BusinessIdea[]; errors: string[] }> => {
  const cache = getAiCache();
  const pending = items.filter((i) => !cache[i.id]);
  const errors: string[] = [];

  if (pending.length === 0) {
    return { items: applyAiCache(items), errors };
  }

  const batches: BusinessIdea[][] = [];
  for (let i = 0; i < pending.length; i += AI_BATCH_SIZE) {
    batches.push(pending.slice(i, i + AI_BATCH_SIZE));
  }

  let done = 0;
  for (const batch of batches) {
    try {
      const results = await callOpenAiBatch(batch, apiKey);
      for (const r of results) {
        cache[r.id] = {
          isBusinessIdea: r.isBusinessIdea,
          originCountry: r.originCountry || "Global",
          suitableCountries: r.suitableCountries?.length ? r.suitableCountries : ["Global"],
          costEstimate: r.costEstimate,
          category: r.category || "Uncategorized",
          language: r.language || "English",
        };
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "AI tagging failed for a batch");
    }
    done += batch.length;
    onProgress?.({ done, total: pending.length });
  }

  saveAiCache(cache);

  const enriched = applyAiCache(items).filter((idea) => {
    const entry = cache[idea.id];
    // Keep items that haven't been AI-processed yet (e.g. a batch failed) so nothing silently disappears.
    return !entry || entry.isBusinessIdea;
  });

  return { items: enriched, errors };
};

// ---------------- Filters ----------------

export const filterByCountry = (ideas: BusinessIdea[], country: string): BusinessIdea[] => {
  if (!country || country === "All") return ideas;
  return ideas.filter(
    (idea) =>
      idea.suitableCountries.includes(country) ||
      idea.suitableCountries.includes("Global") ||
      idea.originCountry === country
  );
};

export const filterByBudget = (ideas: BusinessIdea[], maxBudgetUsd: number | null): BusinessIdea[] => {
  if (maxBudgetUsd == null) return ideas;
  return ideas.filter((idea) => !idea.costEstimate || idea.costEstimate.minUsd <= maxBudgetUsd);
};

export const filterByLanguage = (ideas: BusinessIdea[], language: string): BusinessIdea[] => {
  if (!language || language === "All") return ideas;
  return ideas.filter((idea) => idea.language === language);
};
