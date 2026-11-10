import { useCallback, useRef, useState } from "react";
import { uploadFilesToBlob, type BlobUploadResult } from "@/lib/blobClient";
import {
  MAX_FILE_BYTES,
  filterValidFiles,
  formatFileSize,
} from "@/lib/fileLimits";

type Props = {
  multiple?: boolean;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
  maxBytes?: number;
  /** Upload selected files to Vercel Blob (default true). */
  cloudSave?: boolean;
  onCloudSaved?: (uploads: BlobUploadResult[]) => void;
};

export default function UploadZone({
  multiple = false,
  accept = "application/pdf",
  files,
  onChange,
  label = "Drop PDF here or click to browse",
  hint,
  maxBytes = MAX_FILE_BYTES,
  cloudSave = true,
  onCloudSaved,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const resolvedHint =
    hint ??
    `PDF only · max ${formatFileSize(maxBytes)} · browser process + cloud save`;

  const takeFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setError(null);
      const pdfOnly =
        accept === "application/pdf" ||
        (accept.includes("pdf") &&
          !accept.includes("doc") &&
          !accept.includes("xls") &&
          !accept.includes("ppt") &&
          !accept.includes("image") &&
          !accept.includes("*"));
      const picked = Array.from(list).filter((f) => {
        if (!pdfOnly) return true;
        return (
          f.type === "application/pdf" ||
          f.name.toLowerCase().endsWith(".pdf")
        );
      });
      if (!picked.length) {
        setError("No supported files selected.");
        return;
      }

      const { ok, error: sizeError } = filterValidFiles(picked, maxBytes);
      if (sizeError) {
        setError(sizeError);
        return;
      }
      if (!ok.length) return;

      const current = filesRef.current;
      const merged = multiple ? [...current, ...ok] : [ok[0]];
      filesRef.current = merged;
      onChange(merged);

      if (!cloudSave) return;
      setUploading(true);
      try {
        const uploads = await uploadFilesToBlob(ok, { maxBytes });
        onCloudSaved?.(uploads);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Cloud save failed.";
        // Keep local files; surface cloud error separately.
        setError(
          message.includes("BLOB_READ_WRITE_TOKEN") ||
            message.includes("No token") ||
            /blob/i.test(message)
            ? `Saved locally, but cloud upload failed: ${message}`
            : `Saved locally, but cloud upload failed: ${message}`
        );
      } finally {
        setUploading(false);
      }
    },
    [accept, cloudSave, maxBytes, multiple, onChange, onCloudSaved]
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void takeFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-4 py-11 text-center transition ${
          dragging
            ? "border-[var(--brand)] bg-[var(--brand-soft)]"
            : "border-[var(--gray-border)] bg-[var(--surface-muted)] hover:border-[var(--brand)]/45 hover:bg-[var(--brand-soft)]/40"
        }`}
      >
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-lg shadow-[var(--shadow-sm)]">
          ↑
        </span>
        <span className="text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className="mt-1 text-xs text-[var(--gray-muted)]">
          {uploading ? "Uploading to cloud…" : resolvedHint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          void takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {accept === "application/pdf" && (
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={async () => {
            setError(null);
            const res = await fetch("/sample-unsigned.pdf");
            if (!res.ok) return;
            const blob = await res.blob();
            const file = new File(
              [blob],
              multiple ? `sample-${filesRef.current.length + 1}.pdf` : "sample.pdf",
              { type: "application/pdf" }
            );
            const { ok, error: sizeError } = filterValidFiles([file], maxBytes);
            if (sizeError) {
              setError(sizeError);
              return;
            }
            const current = filesRef.current;
            const merged = multiple ? [...current, ...ok] : [ok[0]];
            filesRef.current = merged;
            onChange(merged);
          }}
        >
          Use sample PDF
        </button>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--gray-border)] bg-[var(--surface)] px-3 py-2.5 text-sm shadow-[var(--shadow-sm)]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {f.name}
                </p>
                <p className="text-xs text-[var(--gray-muted)]">
                  {formatFileSize(f.size)}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
