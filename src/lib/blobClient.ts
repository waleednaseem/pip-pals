"use client";

import { upload } from "@vercel/blob/client";
import { MAX_FILE_BYTES, validateFileSize } from "@/lib/fileLimits";

export type BlobUploadResult = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  name: string;
};

export async function uploadFileToBlob(
  file: File,
  opts?: { maxBytes?: number; folder?: string }
): Promise<BlobUploadResult> {
  const maxBytes = opts?.maxBytes ?? MAX_FILE_BYTES;
  const sizeError = validateFileSize(file, maxBytes);
  if (sizeError) throw new Error(sizeError);

  const folder = (opts?.folder || "uploads").replace(/^\/+|\/+$/g, "");
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  const pathname = `${folder}/${Date.now()}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/blob/upload",
    contentType: file.type || "application/octet-stream",
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || file.type || "application/octet-stream",
    size: file.size,
    name: file.name,
  };
}

export async function uploadFilesToBlob(
  files: File[],
  opts?: { maxBytes?: number; folder?: string }
): Promise<BlobUploadResult[]> {
  const out: BlobUploadResult[] = [];
  for (const file of files) {
    out.push(await uploadFileToBlob(file, opts));
  }
  return out;
}
