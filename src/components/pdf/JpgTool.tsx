import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { fileToBytes } from "@/lib/pdf/download";
import { downloadBlob, pdfPagesToJpegBlobs } from "@/lib/pdf/toJpg";
import { useEffect, useState } from "react";

export default function JpgTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:pdf-to-jpg");
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
      const pages = await pdfPagesToJpegBlobs(bytes, 2);
      for (const p of pages) {
        downloadBlob(p.blob, `page-${p.page}.jpg`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to convert to JPG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <p className="text-sm text-zinc-600">
        Each page downloads as a JPG (works with Acrobat-exported PDFs viewed in-browser).
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Converting…" : "Convert to JPG"}
      </button>
    </div>
  );
}
