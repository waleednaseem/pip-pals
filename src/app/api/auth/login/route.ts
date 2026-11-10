import { randomBytes } from "node:crypto";
import {
  json,
  passwordMatches,
  publicUser,
  sessionCookieValue,
  wantsSecureCookie,
} from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const login = String(body.login || body.email || body.username || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [{ email: login }, { username: login }],
    });
    if (!user || !passwordMatches(password, user.passwordHash)) {
      return json({ ok: false, error: "Email, username, or password is wrong." }, 401);
    }
    const token = randomBytes(32).toString("hex");
    await db.collection("sessions").insertOne({
      token,
      userId: user._id,
      createdAt: new Date(),
    });
    return json(
      { ok: true, token, user: publicUser(user as { email: string; username: string }) },
      200,
      { "Set-Cookie": sessionCookieValue(token, wantsSecureCookie(req)) }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
