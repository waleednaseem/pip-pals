import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import http from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing. Add it in .env, then restart.");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();

if (/hajj/i.test(db.databaseName)) {
  console.error("This database is protected. Point MONGODB_URI at this app's own database.");
  await client.close();
  process.exit(1);
}

await db.command({ ping: 1 });
const appState = db.collection("app_state");
try {
  await appState.dropIndex("key_1");
} catch {
  /* index is already gone */
}
await appState.createIndex({ userId: 1, key: 1 }, { unique: true });
await db.collection("users").createIndex({ email: 1 }, { unique: true });
await db.collection("users").createIndex({ username: 1 }, { unique: true });
await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
console.log(`MongoDB connected (${db.databaseName})`);

const COL = {
  toolRuns: "tool_runs",
  converterRuns: "converter_runs",
  favorites: "favorites",
  recent: "recent",
  esignRequests: "esign_requests",
  pdfJobs: "pdf_jobs",
  usageDaily: "usage_daily",
};

function safeError(error) {
  const message = error instanceof Error ? error.message : "Failed";
  return message.replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://***");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    out[name] = decodeURIComponent(rest.join("="));
  }
  return out;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const current = Buffer.from(hash, "hex");
  if (current.length !== next.length) return false;
  return timingSafeEqual(current, next);
}

function wantsSecureCookie(req) {
  if (process.env.COOKIE_SECURE === "0") return false;
  if (process.env.COOKIE_SECURE === "1") return true;
  const proto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return proto === "https";
}

function sessionCookie(token, req) {
  const maxAge = token ? 60 * 60 * 24 * 30 : 0;
  const value = token || "";
  const secure = wantsSecureCookie(req) ? "; Secure" : "";
  return `sid=${value}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

function publicUser(user) {
  return { email: user.email, username: user.username };
}

function readAuthToken(req) {
  const cookieToken = readCookies(req).sid;
  if (cookieToken) return cookieToken;
  const header = String(req.headers.authorization || "");
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || "";
}

async function currentUser(req) {
  const token = readAuthToken(req);
  if (!token) return null;
  const session = await db.collection("sessions").findOne({ token });
  if (!session?.userId) return null;
  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) return null;
  return user;
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const path = url.pathname.replace(/\/$/, "") || "/";
  const method = req.method || "GET";

  try {
    if (method === "GET" && path === "/api/health/db") {
      await db.command({ ping: 1 });
      send(res, 200, { ok: true, database: db.databaseName });
      return;
    }

    if (path === "/api/favorites") {
      const col = db.collection(COL.favorites);
      if (method === "GET") {
        const docs = await col.find({}).sort({ updatedAt: -1 }).toArray();
        send(res, 200, { ok: true, favorites: docs.map((doc) => doc.toolId) });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
        if (!body.toolId) {
          send(res, 400, { ok: false, error: "toolId required" });
          return;
        }
        if (body.action === "remove") {
          await col.deleteOne({ toolId: body.toolId });
        } else {
          await col.updateOne(
            { toolId: body.toolId },
            { $set: { toolId: body.toolId, updatedAt: new Date() } },
            { upsert: true }
          );
        }
        send(res, 200, { ok: true });
        return;
      }
    }

    if (path === "/api/recent") {
      const col = db.collection(COL.recent);
      if (method === "GET") {
        const docs = await col.find({}).sort({ updatedAt: -1 }).limit(24).toArray();
        send(res, 200, { ok: true, recent: docs.map((doc) => doc.toolId) });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
        if (!body.toolId) {
          send(res, 400, { ok: false, error: "toolId required" });
          return;
        }
        await col.updateOne(
          { toolId: body.toolId },
          { $set: { toolId: body.toolId, updatedAt: new Date() } },
          { upsert: true }
        );
        send(res, 200, { ok: true });
        return;
      }
    }

    if (path === "/api/activity") {
      const col = db.collection(COL.toolRuns);
      if (method === "GET") {
        const runs = await col.find({}).sort({ createdAt: -1 }).limit(100).toArray();
        send(res, 200, {
          ok: true,
          count: runs.length,
          runs: runs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
        });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
        if (!body.slug && !body.toolId) {
          send(res, 400, { ok: false, error: "slug or toolId required" });
          return;
        }
        const doc = {
          family: body.family || "unknown",
          slug: body.slug || String(body.toolId).split(":").pop() || "",
          toolId: body.toolId || `${body.family}:${body.slug}`,
          title: body.title || null,
          source: body.source || "app",
          createdAt: new Date(),
        };
        const result = await col.insertOne(doc);
        send(res, 200, { ok: true, id: String(result.insertedId) });
        return;
      }
    }

    if (path === "/api/converters/run") {
      const col = db.collection(COL.converterRuns);
      if (method === "GET") {
        const runs = await col.find({}).sort({ createdAt: -1 }).limit(50).toArray();
        send(res, 200, {
          ok: true,
          count: runs.length,
          runs: runs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
        });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
        if (!body.slug) {
          send(res, 400, { ok: false, error: "slug required" });
          return;
        }
        const result = await col.insertOne({
          slug: body.slug,
          title: body.title || null,
          input: body.input ?? null,
          output: body.output ?? null,
          createdAt: new Date(),
        });
        send(res, 200, { ok: true, id: String(result.insertedId) });
        return;
      }
    }

    if (path === "/api/esign") {
      const col = db.collection(COL.esignRequests);
      if (method === "GET") {
        const docs = await col.find({}).sort({ createdAt: -1 }).limit(50).toArray();
        send(res, 200, {
          ok: true,
          requests: docs.map(({ _id, ...rest }) => ({
            id: rest.id || String(_id),
            ...rest,
          })),
        });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
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
        await col.updateOne({ id }, { $set: doc }, { upsert: true });
        send(res, 200, { ok: true, id, request: doc });
        return;
      }
    }

    if (path === "/api/jobs") {
      const col = db.collection(COL.pdfJobs);
      if (method === "GET") {
        const status = url.searchParams.get("status");
        const filter = status ? { status } : {};
        const jobs = await col.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
        send(res, 200, {
          ok: true,
          count: jobs.length,
          jobs: jobs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
        });
        return;
      }
      if (method === "POST") {
        const body = await readJson(req);
        if (!body.slug) {
          send(res, 400, { ok: false, error: "slug required" });
          return;
        }
        const doc = {
          slug: body.slug,
          title: body.title || body.slug,
          status: body.status || "queued",
          files: body.files || [],
          note: body.note || null,
          source: body.source || "app",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await col.insertOne(doc);
        const day = new Date().toISOString().slice(0, 10);
        await db.collection(COL.usageDaily).updateOne(
          { day, slug: body.slug },
          { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
          { upsert: true }
        );
        send(res, 200, { ok: true, id: String(result.insertedId) });
        return;
      }
    }

    if (path === "/api/auth/signup" && method === "POST") {
      const body = await readJson(req);
      const email = String(body.email || "").trim().toLowerCase();
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        send(res, 400, { ok: false, error: "Enter a valid email." });
        return;
      }
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        send(res, 400, { ok: false, error: "Username must be 3-24 letters, numbers, or underscores." });
        return;
      }
      if (password.length < 8) {
        send(res, 400, { ok: false, error: "Password must be at least 8 characters." });
        return;
      }
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
        send(
          res,
          200,
          { ok: true, token, user: { email, username } },
          { "Set-Cookie": sessionCookie(token, req) }
        );
      } catch (error) {
        if (error?.code === 11000) {
          send(res, 409, { ok: false, error: "That email or username is already used." });
          return;
        }
        throw error;
      }
      return;
    }

    if (path === "/api/auth/login" && method === "POST") {
      const body = await readJson(req);
      const login = String(body.login || body.email || body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = await db.collection("users").findOne({
        $or: [{ email: login }, { username: login }],
      });
      if (!user || !passwordMatches(password, user.passwordHash)) {
        send(res, 401, { ok: false, error: "Email, username, or password is wrong." });
        return;
      }
      const token = randomBytes(32).toString("hex");
      await db.collection("sessions").insertOne({
        token,
        userId: user._id,
        createdAt: new Date(),
      });
      send(
        res,
        200,
        { ok: true, token, user: publicUser(user) },
        { "Set-Cookie": sessionCookie(token, req) }
      );
      return;
    }

    if (path === "/api/auth/logout" && method === "POST") {
      const token = readAuthToken(req);
      if (token) await db.collection("sessions").deleteOne({ token });
      send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", req) });
      return;
    }

    if (path === "/api/auth/me" && method === "GET") {
      const user = await currentUser(req);
      if (!user) {
        send(res, 401, { ok: false, error: "Not signed in." });
        return;
      }
      send(res, 200, { ok: true, user: publicUser(user) });
      return;
    }

    if (path === "/api/app/state") {
      const user = await currentUser(req);
      if (!user) {
        send(res, 401, { ok: false, error: "Not signed in." });
        return;
      }
      const userId = new ObjectId(user._id);
      const col = db.collection("app_state");
      if (method === "GET") {
        const docs = await col.find({ userId }).toArray();
        send(res, 200, {
          ok: true,
          items: docs.map((doc) => ({
            key: doc.key,
            value: doc.value,
            updatedAt: doc.updatedAt,
          })),
        });
        return;
      }
      if (method === "PUT") {
        const body = await readJson(req);
        if (!body.key || typeof body.value !== "string") {
          send(res, 400, { ok: false, error: "key and value required" });
          return;
        }
        if (body.key.startsWith("pip-pals:studio") || body.key === "business_ideas_openai_key") {
          send(res, 400, { ok: false, error: "This key is not stored in the database." });
          return;
        }
        if (body.value.length > 12_000_000) {
          send(res, 413, { ok: false, error: "Value is too large." });
          return;
        }
        await col.updateOne(
          { userId, key: body.key },
          { $set: { userId, key: body.key, value: body.value, updatedAt: new Date() } },
          { upsert: true }
        );
        send(res, 200, { ok: true });
        return;
      }
      if (method === "DELETE") {
        const body = await readJson(req);
        if (!body.key) {
          send(res, 400, { ok: false, error: "key required" });
          return;
        }
        await col.deleteOne({ userId, key: body.key });
        send(res, 200, { ok: true });
        return;
      }
    }

    send(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    send(res, 500, { ok: false, error: safeError(error) });
  }
});

const port = Number(process.env.API_PORT || 8787);
server.listen(port, "127.0.0.1", () => {
  console.log(`API ready on http://127.0.0.1:${port}`);
});
