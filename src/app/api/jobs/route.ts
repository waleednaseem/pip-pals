import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const status = new URL(req.url).searchParams.get("status");
    const filter = status ? { status } : {};
    const jobs = await db
      .collection(COL.pdfJobs)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return json({
      ok: true,
      count: jobs.length,
      jobs: jobs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
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
    if (!body.slug) return json({ ok: false, error: "slug required" }, 400);
    const doc = {
      slug: body.slug,
      title: body.title || body.slug,
      status: body.status || "queued",
      files: body.files || [],
      note: body.note || null,
      source: body.source || "app",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection(COL.pdfJobs).insertOne(doc);
    const day = new Date().toISOString().slice(0, 10);
    await db.collection(COL.usageDaily).updateOne(
      { day, slug: body.slug },
      { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    return json({ ok: true, id: String(result.insertedId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
