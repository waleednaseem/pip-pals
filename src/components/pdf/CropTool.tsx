import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { cropPdfMargins } from "@/lib/pdf/crop";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { useEffect, useState } from "react";

export default function CropTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState(36);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:crop");
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
      const m = Number(margin);
      const out = await cropPdfMargins(bytes, {
        top: m,
        right: m,
        bottom: m,
        left: m,
      });
      downloadBytes(out, "cropped.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to crop PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <label className="block max-w-xs text-sm">
        <span className="mb-1 block font-medium">Margin crop (points)</span>
        <input
          type="number"
          min={0}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Cropping…" : "Crop & download"}
      </button>
    </div>
  );
}
