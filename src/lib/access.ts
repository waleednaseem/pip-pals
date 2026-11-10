/** Owner-only features — keep emails lowercase. */
const ADS_ADMIN_EMAILS = new Set(["waleed.naseem1@gmail.com"]);

export function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function canManageAdvertising(email: string | null | undefined): boolean {
  return ADS_ADMIN_EMAILS.has(normalizeEmail(email));
}
