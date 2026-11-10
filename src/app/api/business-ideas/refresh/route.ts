import { json } from "@/lib/server/auth";
import { fetchAllIdeaFeeds } from "@/lib/server/businessIdeasFeed";
import { COL, getDb } from "@/lib/server/mongo";
import type { BusinessIdea } from "@/types/businessIdeas";

export const runtime = "nodejs";
export const maxDuration = 60;

function asIdea(doc: Record<string, unknown>): BusinessIdea {
  return {
    id: String(doc.id || doc.dedupeKey || ""),
    source: String(doc.source || ""),
    title: String(doc.title || ""),
    link: String(doc.link || ""),
    pubDate: String(doc.pubDate || ""),
    description: String(doc.description || ""),
    category: String(doc.category || "Uncategorized"),
    originCountry: String(doc.originCountry || "Unknown"),
    suitableCountries: Array.isArray(doc.suitableCountries)
      ? doc.suitableCountries.map(String)
      : ["Unknown"],
    costEstimate:
      doc.costEstimate && typeof doc.costEstimate === "object"
        ? (doc.costEstimate as BusinessIdea["costEstimate"])
        : null,
    language: String(doc.language || "English"),
    aiTagged: Boolean(doc.aiTagged),
  };
}

async function upsertIdeas(items: BusinessIdea[]) {
  const db = await getDb();
  const col = db.collection(COL.businessIdeas);
  const now = new Date();
  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const dedupeKey = String(item.id || "").trim();
    if (!dedupeKey) continue;

    const existing = await col.findOne({ dedupeKey });
    if (!existing) {
      await col.insertOne({
        id: dedupeKey,
        dedupeKey,
        source: item.source,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.description,
        category: item.category || "Uncategorized",
        originCountry: item.originCountry || "Unknown",
        suitableCountries: item.suitableCountries?.length
          ? item.suitableCountries
          : ["Unknown"],
        costEstimate: item.costEstimate ?? null,
        language: item.language || "English",
        aiTagged: Boolean(item.aiTagged),
        isBusinessIdea: true,
        createdAt: now,
        updatedAt: now,
        lastFetchedAt: now,
      });
      inserted += 1;
      continue;
    }

    const patch: Record<string, unknown> = {
      title: item.title,
      link: item.link,
      source: item.source,
      description: item.description,
      pubDate: item.pubDate || existing.pubDate,
      updatedAt: now,
      lastFetchedAt: now,
    };
    if (!existing.aiTagged) {
      patch.language = item.language || existing.language;
    }
    await col.updateOne({ dedupeKey }, { $set: patch });
    updated += 1;
  }

  const docs = await col
    .find({ isBusinessIdea: { $ne: false } })
    .sort({ pubDate: -1, updatedAt: -1 })
    .limit(500)
    .toArray();

  return {
    inserted,
    updated,
    items: docs.map((doc) => asIdea(doc as Record<string, unknown>)),
  };
}

export async function POST() {
  try {
    const feed = await fetchAllIdeaFeeds();
    if (!feed.items.length) {
      const db = await getDb();
      const docs = await db
        .collection(COL.businessIdeas)
        .find({ isBusinessIdea: { $ne: false } })
        .sort({ pubDate: -1, updatedAt: -1 })
        .limit(500)
        .toArray();
      return json({
        ok: true,
        inserted: 0,
        updated: 0,
        count: docs.length,
        items: docs.map((doc) => asIdea(doc as Record<string, unknown>)),
        errors: feed.errors.length ? feed.errors : [],
        fetchedAt: Date.now(),
        stale: docs.length > 0,
      });
    }

    const saved = await upsertIdeas(feed.items);
    return json({
      ok: true,
      inserted: saved.inserted,
      updated: saved.updated,
      count: saved.items.length,
      items: saved.items,
      errors: feed.errors,
      fetchedAt: Date.now(),
      stale: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
