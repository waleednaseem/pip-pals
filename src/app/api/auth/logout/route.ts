import { json, readAuthToken, sessionCookieValue, wantsSecureCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const token = await readAuthToken(req);
    if (token) await db.collection("sessions").deleteOne({ token });
    return json({ ok: true }, 200, {
      "Set-Cookie": sessionCookieValue("", wantsSecureCookie(req)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
