"use client";

import { uploadFileToBlob } from "@/lib/blobClient";
import { MAX_FILE_BYTES } from "@/lib/fileLimits";

/** Best-effort cloud save — never blocks the tool if Blob fails. */
export function cloudSaveFile(
  file: File | null | undefined,
  opts?: { maxBytes?: number; folder?: string }
) {
  if (!file || typeof window === "undefined") return;
  void uploadFileToBlob(file, {
    maxBytes: opts?.maxBytes ?? MAX_FILE_BYTES,
    folder: opts?.folder ?? "uploads",
  }).catch(() => {
    /* local processing still works */
  });
}

export function cloudSaveFiles(
  files: Array<File | null | undefined>,
  opts?: { maxBytes?: number; folder?: string }
) {
  for (const file of files) cloudSaveFile(file, opts);
}
