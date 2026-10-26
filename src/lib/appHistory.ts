const SKIP_KEYS = new Set(["business_ideas_openai_key", "pip-pals-theme"]);

function skipKey(key: string) {
  return SKIP_KEYS.has(key) || key.startsWith("pip-pals:studio");
}

type Pending = { type: "save"; value: string } | { type: "remove" };

const pending = new Map<string, Pending>();
let flushTimer = 0;
let applyingRemote = false;

function scheduleFlush() {
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 500);
}

function queueSave(key: string, value: string) {
  pending.set(key, { type: "save", value });
  scheduleFlush();
}

function queueRemove(key: string) {
  pending.set(key, { type: "remove" });
  scheduleFlush();
}

let nativeSet: typeof localStorage.setItem | null = null;
let nativeRemove: typeof localStorage.removeItem | null = null;

async function flush() {
  const batch = [...pending.entries()];
  pending.clear();
  await Promise.all(
    batch.map(async ([key, op]) => {
      try {
        if (op.type === "remove") {
          await fetch("/api/app/state", {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          });
          return;
        }
        await fetch("/api/app/state", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: op.value }),
        });
      } catch {
        /* try again on the next change */
      }
    })
  );
}

function installSync() {
  if (nativeSet) return;
  nativeSet = localStorage.setItem.bind(localStorage);
  nativeRemove = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    nativeSet?.(key, value);
    if (!applyingRemote && !skipKey(key)) queueSave(key, String(value));
  };
  localStorage.removeItem = (key: string) => {
    nativeRemove?.(key);
    if (!applyingRemote && !skipKey(key)) queueRemove(key);
  };
}

export function clearLocalAppData() {
  installSync();
  applyingRemote = true;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && !skipKey(key)) keys.push(key);
  }
  for (const key of keys) nativeRemove?.(key);
  applyingRemote = false;
}

export async function loadUserHistory() {
  installSync();
  const serverKeys = new Set<string>();

  const response = await fetch("/api/app/state", { credentials: "include" });
  if (!response.ok) return;
  const data = await response.json();
  if (!data?.ok || !Array.isArray(data.items)) return;

  applyingRemote = true;
  if (data.items.length > 0) {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && !skipKey(key)) stale.push(key);
    }
    for (const key of stale) nativeRemove?.(key);
  }
  for (const item of data.items) {
    if (!item || typeof item.key !== "string" || typeof item.value !== "string") continue;
    if (skipKey(item.key)) continue;
    serverKeys.add(item.key);
    nativeSet?.(item.key, item.value);
  }
  applyingRemote = false;

  if (serverKeys.size > 0) return;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || skipKey(key) || serverKeys.has(key)) continue;
    const value = localStorage.getItem(key);
    if (value != null) queueSave(key, value);
  }
}
