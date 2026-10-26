import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { mergePdfs } from "@/lib/pdf/merge";
import { useEffect, useState } from "react";

export default function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:merge");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (files.length < 2) {
      setError("Upload at least two PDF files to merge.");
      return;
    }
    setBusy(true);
    try {
      const buffers = await Promise.all(files.map(fileToBytes));
      const merged = await mergePdfs(buffers);
      downloadBytes(merged, "merged.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to merge PDFs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone multiple files={files} onChange={setFiles} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Merging…" : "Merge & download"}
      </button>
    </div>
  );
}
