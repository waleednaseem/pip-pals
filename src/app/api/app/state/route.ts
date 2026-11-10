import { ObjectId } from "mongodb";
import { currentUser, json } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const user = await currentUser(db, req);
    if (!user) return json({ ok: false, error: "Not signed in." }, 401);
    const userId = new ObjectId(String(user._id));
    const docs = await db.collection("app_state").find({ userId }).toArray();
    return json({
      ok: true,
      items: docs.map((doc) => ({
        key: doc.key,
        value: doc.value,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const user = await currentUser(db, req);
    if (!user) return json({ ok: false, error: "Not signed in." }, 401);
    const body = await req.json().catch(() => ({}));
    if (!body.key || typeof body.value !== "string") {
      return json({ ok: false, error: "key and value required" }, 400);
    }
    if (body.key.startsWith("pip-pals:studio") || body.key === "business_ideas_openai_key") {
      return json({ ok: false, error: "This key is not stored in the database." }, 400);
    }
    if (body.value.length > 12_000_000) {
      return json({ ok: false, error: "Value is too large." }, 413);
    }
    const userId = new ObjectId(String(user._id));
    await db.collection("app_state").updateOne(
      { userId, key: body.key },
      { $set: { userId, key: body.key, value: body.value, updatedAt: new Date() } },
      { upsert: true }
    );
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const user = await currentUser(db, req);
    if (!user) return json({ ok: false, error: "Not signed in." }, 401);
    const body = await req.json().catch(() => ({}));
    if (!body.key) return json({ ok: false, error: "key required" }, 400);
    const userId = new ObjectId(String(user._id));
    await db.collection("app_state").deleteOne({ userId, key: body.key });
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
