import { useCallback, useRef, useState } from "react";

type Props = {
  multiple?: boolean;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({
  multiple = false,
  accept = "application/pdf",
  files,
  onChange,
  label = "Drop PDF here or click to browse",
  hint = "PDF only · processed in your browser",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [dragging, setDragging] = useState(false);

  const takeFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const pdfOnly =
        accept === "application/pdf" ||
        (accept.includes("pdf") &&
          !accept.includes("doc") &&
          !accept.includes("xls") &&
          !accept.includes("ppt") &&
          !accept.includes("image") &&
          !accept.includes("*"));
      const next = Array.from(list).filter((f) => {
        if (!pdfOnly) return true;
        return (
          f.type === "application/pdf" ||
          f.name.toLowerCase().endsWith(".pdf")
        );
      });
      if (!next.length) return;
      const current = filesRef.current;
      const merged = multiple ? [...current, ...next] : [next[0]];
      filesRef.current = merged;
      onChange(merged);
    },
    [accept, multiple, onChange]
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
          takeFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-4 py-11 text-center transition ${
          dragging
            ? "border-[var(--brand)] bg-[var(--brand-soft)]"
            : "border-[var(--gray-border)] bg-[var(--background)] hover:border-[var(--brand)]/45 hover:bg-[var(--brand-soft)]/40"
        }`}
      >
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg shadow-[var(--shadow-sm)]">
          ↑
        </span>
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-1 text-xs text-[var(--gray-muted)]">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {accept === "application/pdf" && (
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={async () => {
            const res = await fetch("/sample-unsigned.pdf");
            if (!res.ok) return;
            const blob = await res.blob();
            const file = new File(
              [blob],
              multiple ? `sample-${filesRef.current.length + 1}.pdf` : "sample.pdf",
              { type: "application/pdf" }
            );
            const current = filesRef.current;
            const merged = multiple ? [...current, file] : [file];
            filesRef.current = merged;
            onChange(merged);
          }}
        >
          Use sample PDF
        </button>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--gray-border)] bg-white px-3 py-2.5 text-sm shadow-[var(--shadow-sm)]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">
                  {f.name}
                </p>
                <p className="text-xs text-[var(--gray-muted)]">
                  {formatSize(f.size)}
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
