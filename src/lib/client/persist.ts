"use client";

import { authHeaders } from "@/lib/session";

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

function postJson(url: string, body: unknown) {
  void fetch(url, {
    method: "POST",
    credentials: "include",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  }).catch(() => {
    /* guest / offline — localStorage still kept */
  });
}

export function logToolRun(payload: {
  family: string;
  slug: string;
  title?: string;
  source?: string;
}) {
  pushItem(ACTIVITY_KEY, { ...payload, at: new Date().toISOString() });
  postJson("/api/activity", {
    family: payload.family,
    slug: payload.slug,
    toolId: `${payload.family}:${payload.slug}`,
    title: payload.title,
    source: payload.source || "app",
  });
}

export function logConverterRun(payload: {
  slug: string;
  title?: string;
  input?: number | string;
  output?: number | string;
}) {
  pushItem(ACTIVITY_KEY, { kind: "convert", ...payload, at: new Date().toISOString() });
  postJson("/api/converters/run", payload);
}

export function syncFavorite(toolId: string, action: "add" | "remove") {
  postJson("/api/favorites", { toolId, action });
}

export function syncRecent(toolId: string) {
  postJson("/api/recent", { toolId });
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
  postJson("/api/jobs", payload);
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
  postJson("/api/esign", { ...meta, id, ...row });
  return Promise.resolve({ ok: true as const, id });
}

export async function fetchEsignRequests(): Promise<EsignRow[]> {
  try {
    const response = await fetch("/api/esign", {
      credentials: "include",
      headers: authHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.ok && Array.isArray(data.requests)) {
        return data.requests as EsignRow[];
      }
    }
  } catch {
    /* fall through to local */
  }
  return readList<EsignRow>(ESIGN_KEY);
}
