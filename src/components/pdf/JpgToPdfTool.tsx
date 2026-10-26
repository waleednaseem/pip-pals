import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { imagesToPdf } from "@/lib/pdf/jpgToPdf";
import { useEffect, useRef, useState } from "react";

function imageType(file: File): "jpg" | "png" {
  if (file.type.includes("png") || file.name.toLowerCase().endsWith(".png")) {
    return "png";
  }
  return "jpg";
}

export default function JpgToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:jpg-to-pdf");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!files.length) {
      setError("Upload at least one JPG or PNG.");
      return;
    }
    setBusy(true);
    try {
      const images = await Promise.all(
        files.map(async (f) => ({
          bytes: await fileToBytes(f),
          type: imageType(f),
        }))
      );
      const out = await imagesToPdf(images);
      downloadBytes(out, "images.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create PDF.");
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
          Drop images here or click to browse
        </span>
        <span className="mt-1 text-xs text-[var(--gray-muted)]">JPG / PNG</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
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
                onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
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
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create PDF"}
      </button>
    </div>
  );
}
