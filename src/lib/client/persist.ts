/** Local-only studio history. File Studio is not stored in the database. */

const ACTIVITY_KEY = "pip-pals:studio:activity";
const JOBS_KEY = "pip-pals:studio:jobs";
const ESIGN_KEY = "pip-pals:studio:esign";

type EsignRow = {
  id: string;
  title: string;
  message?: string;
  signers: { name: string; email: string }[];
  status: string;
  createdAt: string;
};

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function pushItem(key: string, item: unknown, max = 40) {
  if (typeof window === "undefined") return;
  const next = [item, ...readList<unknown>(key)].slice(0, max);
  localStorage.setItem(key, JSON.stringify(next));
}

export function logToolRun(payload: {
  family: string;
  slug: string;
  title?: string;
  source?: string;
}) {
  pushItem(ACTIVITY_KEY, { ...payload, at: new Date().toISOString() });
}

export function logConverterRun(payload: {
  slug: string;
  title?: string;
  input?: number | string;
  output?: number | string;
}) {
  pushItem(ACTIVITY_KEY, { kind: "convert", ...payload, at: new Date().toISOString() });
}

export function syncFavorite(_toolId: string, _action: "add" | "remove") {
  /* Favorites stay in this browser. */
}

export function syncRecent(_toolId: string) {
  /* Recent tools stay in this browser. */
}

export function queuePdfJob(payload: {
  slug: string;
  title?: string;
  files: { name: string; size: number; type: string }[];
  note?: string;
  status?: string;
}) {
  const id = `job_${Date.now()}`;
  pushItem(JOBS_KEY, { id, ...payload, createdAt: new Date().toISOString() });
  return Promise.resolve({ ok: true as const, id });
}

export function saveEsignRequestRemote(meta: Record<string, unknown>) {
  const id = String(meta.id || `req_${Date.now()}`);
  const row: EsignRow = {
    id,
    title: String(meta.title || "Signature request"),
    message: typeof meta.message === "string" ? meta.message : "",
    signers: Array.isArray(meta.signers)
      ? (meta.signers as { name: string; email: string }[])
      : [],
    status: String(meta.status || "pending"),
    createdAt: String(meta.createdAt || new Date().toISOString()),
  };
  const rest = readList<EsignRow>(ESIGN_KEY).filter((item) => item.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(ESIGN_KEY, JSON.stringify([row, ...rest].slice(0, 50)));
  }
  return Promise.resolve({ ok: true as const, id });
}

export async function fetchEsignRequests(): Promise<EsignRow[]> {
  return readList<EsignRow>(ESIGN_KEY);
}
