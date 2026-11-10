import { json } from "@/lib/server/auth";
import { COL, getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection(COL.esignRequests)
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return json({
      ok: true,
      requests: docs.map(({ _id, ...rest }) => ({
        id: rest.id || String(_id),
        ...rest,
      })),
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
    const id = body.id || `req_${Date.now()}`;
    const doc = {
      id,
      title: body.title || "Signature request",
      message: body.message || "",
      signers: body.signers || [],
      slots: body.slots || [],
      status: body.status || "pending",
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection(COL.esignRequests).updateOne({ id }, { $set: doc }, { upsert: true });
    return json({ ok: true, id, request: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
