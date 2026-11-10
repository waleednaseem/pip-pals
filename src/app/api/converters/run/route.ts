import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const runs = await db
      .collection(COL.converterRuns)
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
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
    if (!body.slug) return json({ ok: false, error: "slug required" }, 400);
    const result = await db.collection(COL.converterRuns).insertOne({
      slug: body.slug,
      title: body.title || null,
      input: body.input ?? null,
      output: body.output ?? null,
      createdAt: new Date(),
    });
    return json({ ok: true, id: String(result.insertedId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
