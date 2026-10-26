import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { mergePdfAndImages, type MergeItem } from "@/lib/pdf/mergePdfImages";
import { useEffect, useRef, useState } from "react";

function isPdf(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function imageType(file: File): "jpg" | "png" {
  if (file.type.includes("png") || file.name.toLowerCase().endsWith(".png")) {
    return "png";
  }
  return "jpg";
}

export default function MergePdfImagesTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:merge-pdf-images");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!files.length) {
      setError("Upload at least one PDF or image.");
      return;
    }
    setBusy(true);
    try {
      const items: MergeItem[] = await Promise.all(
        files.map(async (f) => {
          const bytes = await fileToBytes(f);
          if (isPdf(f)) return { kind: "pdf" as const, bytes };
          return { kind: "image" as const, bytes, type: imageType(f) };
        })
      );
      const out = await mergePdfAndImages(items);
      downloadBytes(out, "merged.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-[var(--brand-soft)] px-4 py-10 text-center hover:border-[var(--brand)]"
      >
        <span className="text-sm font-medium text-gray-800">
          Drop PDFs & images or click to browse
        </span>
        <span className="mt-1 text-xs text-[var(--gray-muted)]">
          PDF · JPG · PNG — order preserved
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.target.files ? Array.from(e.target.files) : [];
          setFiles((prev) => [...prev, ...list]);
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="space-y-1 text-sm text-gray-600">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Merging…" : "Merge & download"}
      </button>
    </div>
  );
}
