import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  addPageNumbers,
  type PageNumberPosition,
} from "@/lib/pdf/pageNumbers";
import { useEffect, useState } from "react";

export default function PageNumbersTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [position, setPosition] =
    useState<PageNumberPosition>("bottom-center");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:page-numbers");
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
      const out = await addPageNumbers(bytes, position);
      downloadBytes(out, "numbered.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add page numbers.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <label className="block max-w-xs text-sm">
        <span className="mb-1 block font-medium">Position</span>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={position}
          onChange={(e) => setPosition(e.target.value as PageNumberPosition)}
        >
          <option value="bottom-center">Bottom center</option>
          <option value="bottom-right">Bottom right</option>
          <option value="top-right">Top right</option>
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Working…" : "Add numbers & download"}
      </button>
    </div>
  );
}
