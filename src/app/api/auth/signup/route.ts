import { randomBytes } from "node:crypto";
import {
  hashPassword,
  json,
  publicUser,
  sessionCookieValue,
  wantsSecureCookie,
} from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Enter a valid email." }, 400);
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return json(
        { ok: false, error: "Username must be 3-24 letters, numbers, or underscores." },
        400
      );
    }
    if (password.length < 8) {
      return json({ ok: false, error: "Password must be at least 8 characters." }, 400);
    }

    const db = await getDb();
    try {
      const result = await db.collection("users").insertOne({
        email,
        username,
        passwordHash: hashPassword(password),
        createdAt: new Date(),
      });
      const token = randomBytes(32).toString("hex");
      await db.collection("sessions").insertOne({
        token,
        userId: result.insertedId,
        createdAt: new Date(),
      });
      return json(
        { ok: true, token, user: publicUser({ email, username }) },
        200,
        { "Set-Cookie": sessionCookieValue(token, wantsSecureCookie(req)) }
      );
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && (error as { code?: number }).code === 11000) {
        return json({ ok: false, error: "That email or username is already used." }, 409);
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return json({ ok: false, error: message }, 500);
  }
}
