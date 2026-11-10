/** Owner-only features — keep emails lowercase. */
const OWNER_EMAILS = new Set(["waleed.naseem1@gmail.com"]);

/** Tabs only the owner account may open. */
export const OWNER_ONLY_TABS = new Set([
  "pair",
  "calculator",
  "totals",
  "lotfit",
  "ftmo",
  "dynamic-calc",
  "trading-signals",
  "advertising",
]);

export function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function isAppOwner(email: string | null | undefined): boolean {
  return OWNER_EMAILS.has(normalizeEmail(email));
}

export function canManageAdvertising(email: string | null | undefined): boolean {
  return isAppOwner(email);
}

export function canAccessOwnerTab(
  tab: string,
  email: string | null | undefined
): boolean {
  if (!OWNER_ONLY_TABS.has(tab)) return true;
  return isAppOwner(email);
}
