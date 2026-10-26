import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { compressPdf } from "@/lib/pdf/compress";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { useEffect, useState } from "react";

export default function CompressTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.55);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:compress");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await compressPdf(bytes, quality);
      downloadBytes(out, "compressed.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compress failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <label className="block text-sm">
        Quality ({Math.round(quality * 100)}%)
        <input
          type="range"
          min={0.3}
          max={0.9}
          step={0.05}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <p className="text-sm text-[var(--gray-muted)]">
        Re-encodes pages as JPEG to shrink file size. Text may become an image.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Compressing…" : "Compress & download"}
      </button>
    </div>
  );
}
