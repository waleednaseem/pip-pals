/** Shared upload limits (Hobby Blob ~1GB total — keep per-file modest). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ZIP_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_BLOB_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
] as const;

export function formatFileSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFileSize(
  file: File,
  maxBytes: number = MAX_FILE_BYTES
): string | null {
  if (file.size <= 0) return "File is empty.";
  if (file.size > maxBytes) {
    return `"${file.name}" is too large (${formatFileSize(file.size)}). Max is ${formatFileSize(maxBytes)}.`;
  }
  return null;
}

export function filterValidFiles(
  files: File[],
  maxBytes: number = MAX_FILE_BYTES
): { ok: File[]; error: string | null } {
  const ok: File[] = [];
  for (const file of files) {
    const err = validateFileSize(file, maxBytes);
    if (err) return { ok, error: err };
    ok.push(file);
  }
  return { ok, error: null };
}
