import type { BusinessIdea } from "@/types/businessIdeas";

export const IDEA_SOURCES: { name: string; url: string; reddit?: boolean }[] = [
  { name: "r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/.rss", reddit: true },
  { name: "r/SideProject", url: "https://www.reddit.com/r/SideProject/.rss", reddit: true },
  { name: "r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/.rss", reddit: true },
  { name: "Show HN", url: "https://hnrss.org/show" },
  { name: "Product Hunt", url: "https://www.producthunt.com/feed" },
];

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function makeIdeaId(source: string, link: string, title: string): string {
  const key = `${source.trim().toLowerCase()}::${(link || title).trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `idea_${(hash >>> 0).toString(16)}_${key.slice(0, 80).replace(/[^a-z0-9]+/gi, "_")}`;
}

function stripHtml(html: string): string {
  return html
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
}

function tagText(block: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  ).exec(block);
  if (cdata?.[1]) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return plain?.[1]?.trim() || "";
}

function linkFromBlock(block: string): string {
  const hrefRel =
    /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i.exec(block) ||
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']alternate["']/i.exec(block);
  if (hrefRel?.[1]) return hrefRel[1].trim();
  const href = /<link[^>]+href=["']([^"']+)["']/i.exec(block);
  if (href?.[1]) return href[1].trim();
  return tagText(block, "link");
}

function detectLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return "Urdu/Arabic Script";
  return "English";
}

function parseFeedXml(xmlText: string, sourceName: string): BusinessIdea[] {
  if (/<!DOCTYPE html|/i.test(xmlText.slice(0, 200)) && !/<rss|<feed/i.test(xmlText.slice(0, 500))) {
    throw new Error("HTML challenge page");
  }

  const chunks = xmlText.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  if (!chunks.length) throw new Error("No items in feed");

  return chunks.slice(0, 20).map((block) => {
    const title = tagText(block, "title") || "Untitled";
    const link = linkFromBlock(block);
    const pubDate =
      tagText(block, "pubDate") ||
      tagText(block, "published") ||
      tagText(block, "updated") ||
      "";
    const description =
      tagText(block, "description") ||
      tagText(block, "summary") ||
      tagText(block, "content") ||
      "";
    const cleanTitle = stripHtml(title);
    const cleanDescription = stripHtml(description).slice(0, 500);
    return {
      id: makeIdeaId(sourceName, link, cleanTitle),
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
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchFeedText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (res.status === 429) throw new Error("HTTP 429");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trim()) throw new Error("Empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOneSource(source: {
  name: string;
  url: string;
  reddit?: boolean;
}): Promise<BusinessIdea[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const xml = await fetchFeedText(source.url);
      return parseFeedXml(xml, source.name);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("429") && attempt === 0) {
        await sleep(source.reddit ? 4500 : 1500);
        continue;
      }
      break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Fetch failed");
}

export async function fetchAllIdeaFeeds(): Promise<{
  items: BusinessIdea[];
  errors: string[];
}> {
  const items: BusinessIdea[] = [];
  const errors: string[] = [];

  // Sequential: Reddit rate-limits parallel RSS requests hard.
  for (let i = 0; i < IDEA_SOURCES.length; i += 1) {
    const source = IDEA_SOURCES[i];
    try {
      const parsed = await fetchOneSource(source);
      items.push(...parsed);
    } catch {
      errors.push(source.name);
    }
    if (i < IDEA_SOURCES.length - 1) {
      await sleep(source.reddit ? 2500 : 400);
    }
  }

  const byId = new Map<string, BusinessIdea>();
  for (const item of items) byId.set(item.id, item);

  const unique = [...byId.values()].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return { items: unique, errors };
}
