import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Db } from "mongodb";
import { cookies } from "next/headers";

export type PublicUser = { email: string; username: string };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function passwordMatches(password: string, stored: string) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const current = Buffer.from(hash, "hex");
  if (current.length !== next.length) return false;
  return timingSafeEqual(current, next);
}

export function publicUser(user: { email: string; username: string }): PublicUser {
  return { email: user.email, username: user.username };
}

export function sessionCookieValue(token: string, secure: boolean) {
  const maxAge = token ? 60 * 60 * 24 * 30 : 0;
  const securePart = secure ? "; Secure" : "";
  return `sid=${token || ""}; HttpOnly; Path=/; SameSite=Lax${securePart}; Max-Age=${maxAge}`;
}

export function readBearerToken(header: string | null) {
  const match = /^Bearer\s+(.+)$/i.exec(String(header || ""));
  return match?.[1]?.trim() || "";
}

export async function readAuthToken(req: Request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("sid")?.value;
  if (cookieToken) return cookieToken;
  return readBearerToken(req.headers.get("authorization"));
}

export async function currentUser(db: Db, req: Request) {
  const token = await readAuthToken(req);
  if (!token) return null;
  const session = await db.collection("sessions").findOne({ token });
  if (!session?.userId) return null;
  const user = await db.collection("users").findOne({ _id: session.userId });
  return user || null;
}

export function wantsSecureCookie(req: Request) {
  if (process.env.COOKIE_SECURE === "0") return false;
  if (process.env.COOKIE_SECURE === "1") return true;
  const proto = req.headers.get("x-forwarded-proto") || "";
  return proto.split(",")[0].trim().toLowerCase() === "https";
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers });
}
