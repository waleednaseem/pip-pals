import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { fileToBytes } from "@/lib/pdf/download";
import { extractImagesFromPdf } from "@/lib/pdf/extractImages";
import { downloadBlob } from "@/lib/pdf/toJpg";
import { useEffect, useState } from "react";

export default function ExtractImagesTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:extract-images");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    setCount(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const images = await extractImagesFromPdf(bytes, true);
      if (!images.length) {
        setError("No images found in this PDF.");
        return;
      }
      setCount(images.length);
      for (const img of images) {
        downloadBlob(img.blob, `page${img.page}-img${img.index}.png`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract images.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <p className="text-sm text-[var(--gray-muted)]">
        Extracts embedded images when possible. If none are found, each page is
        exported as a PNG.
      </p>
      {count != null && (
        <p className="text-sm text-[var(--brand)]">Downloaded {count} image(s).</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Extracting…" : "Extract images"}
      </button>
    </div>
  );
}
