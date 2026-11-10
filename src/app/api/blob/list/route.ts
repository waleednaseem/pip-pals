import { currentUser, json } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const user = await currentUser(db, req);
    if (!user) return json({ ok: false, error: "Not signed in." }, 401);

    const docs = await db
      .collection("uploads")
      .find({ userId: String(user._id) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return json({
      ok: true,
      count: docs.length,
      uploads: docs.map(({ _id, ...rest }) => ({
        id: String(_id),
        ...rest,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
