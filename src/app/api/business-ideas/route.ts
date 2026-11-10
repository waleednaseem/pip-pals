import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";
import type { BusinessIdea } from "@/types/businessIdeas";

export const runtime = "nodejs";

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

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const limit = Math.min(
      Number(new URL(req.url).searchParams.get("limit") || 500) || 500,
      1000
    );
    const docs = await db
      .collection(COL.businessIdeas)
      .find({ isBusinessIdea: { $ne: false } })
      .sort({ pubDate: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    return json({
      ok: true,
      count: docs.length,
      items: docs.map((doc) => asIdea(doc as Record<string, unknown>)),
      fetchedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? (body.items as BusinessIdea[]) : [];
    if (!items.length) {
      return json({ ok: false, error: "items required" }, 400);
    }

    const col = db.collection(COL.businessIdeas);
    let inserted = 0;
    let updated = 0;
    const now = new Date();

    for (const item of items) {
      const dedupeKey = String(item.id || "").trim();
      if (!dedupeKey) continue;

      const existing = await col.findOne({ dedupeKey });
      const isBusinessIdea =
        typeof item.isBusinessIdea === "boolean" ? item.isBusinessIdea : true;

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
          isBusinessIdea,
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

      // Only overwrite enrichment when this payload is AI-tagged (or existing isn't).
      if (item.aiTagged) {
        patch.category = item.category;
        patch.originCountry = item.originCountry;
        patch.suitableCountries = item.suitableCountries;
        patch.costEstimate = item.costEstimate;
        patch.language = item.language;
        patch.aiTagged = true;
        patch.isBusinessIdea = isBusinessIdea;
      } else if (!existing.aiTagged) {
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

    return json({
      ok: true,
      inserted,
      updated,
      count: docs.length,
      items: docs.map((doc) => asIdea(doc as Record<string, unknown>)),
      fetchedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
