import { currentUser, json, publicUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const user = await currentUser(db, req);
    if (!user) return json({ ok: false, error: "Not signed in." }, 401);
    return json({
      ok: true,
      user: publicUser(user as { email: string; username: string }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
