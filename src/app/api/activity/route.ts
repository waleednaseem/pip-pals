import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const runs = await db
      .collection(COL.toolRuns)
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return json({
      ok: true,
      count: runs.length,
      runs: runs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
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
    if (!body.slug && !body.toolId) {
      return json({ ok: false, error: "slug or toolId required" }, 400);
    }
    const doc = {
      family: body.family || "unknown",
      slug: body.slug || String(body.toolId).split(":").pop() || "",
      toolId: body.toolId || `${body.family}:${body.slug}`,
      title: body.title || null,
      source: body.source || "app",
      createdAt: new Date(),
    };
    const result = await db.collection(COL.toolRuns).insertOne(doc);
    return json({ ok: true, id: String(result.insertedId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
