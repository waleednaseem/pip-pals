import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { addTextWatermark } from "@/lib/pdf/watermark";
import { useEffect, useState } from "react";

export default function WatermarkTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:watermark");
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
      const out = await addTextWatermark(bytes, text, 0.28);
      downloadBytes(out, "watermarked.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to watermark PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Watermark text</span>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Working…" : "Add watermark & download"}
      </button>
    </div>
  );
}
