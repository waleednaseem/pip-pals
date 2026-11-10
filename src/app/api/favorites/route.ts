import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection(COL.favorites).find({}).sort({ updatedAt: -1 }).toArray();
    return json({ ok: true, favorites: docs.map((doc) => doc.toolId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));
    if (!body.toolId) return json({ ok: false, error: "toolId required" }, 400);
    const col = db.collection(COL.favorites);
    if (body.action === "remove") {
      await col.deleteOne({ toolId: body.toolId });
    } else {
      await col.updateOne(
        { toolId: body.toolId },
        { $set: { toolId: body.toolId, updatedAt: new Date() } },
        { upsert: true }
      );
    }
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
