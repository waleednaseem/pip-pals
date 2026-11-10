import { MongoClient, type Db } from "mongodb";

const COL = {
  toolRuns: "tool_runs",
  converterRuns: "converter_runs",
  favorites: "favorites",
  recent: "recent",
  esignRequests: "esign_requests",
  pdfJobs: "pdf_jobs",
  usageDaily: "usage_daily",
  businessIdeas: "business_ideas",
} as const;

declare global {
  // eslint-disable-next-line no-var
  var __pipPalsMongo: { client: MongoClient; db: Db; ready: Promise<void> } | undefined;
}

function createMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing.");

  const client = new MongoClient(uri);
  const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();

  const ready = (async () => {
    await client.connect();
    if (/hajj/i.test(db.databaseName)) {
      await client.close();
      throw new Error("This database is protected. Point MONGODB_URI at this app's own database.");
    }
    await db.command({ ping: 1 });
    const appState = db.collection("app_state");
    try {
      await appState.dropIndex("key_1");
    } catch {
      /* index already gone */
    }
    await appState.createIndex({ userId: 1, key: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
    await db.collection("uploads").createIndex({ userId: 1, createdAt: -1 });
    await db.collection("uploads").createIndex({ createdAt: -1 });
    await db.collection(COL.businessIdeas).createIndex({ dedupeKey: 1 }, { unique: true });
    await db.collection(COL.businessIdeas).createIndex({ pubDate: -1 });
    await db.collection(COL.businessIdeas).createIndex({ updatedAt: -1 });
  })();

  return { client, db, ready };
}

export async function getDb(): Promise<Db> {
  if (!globalThis.__pipPalsMongo) {
    globalThis.__pipPalsMongo = createMongo();
  }
  await globalThis.__pipPalsMongo.ready;
  return globalThis.__pipPalsMongo.db;
}

export { COL };
