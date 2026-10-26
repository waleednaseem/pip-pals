import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  extractPages,
  getPageCount,
  parsePageRanges,
  splitAllPages,
} from "@/lib/pdf/split";
import { useEffect, useState } from "react";

export default function SplitTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [ranges, setRanges] = useState("1");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:split");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!files[0]) {
        setPageCount(null);
        return;
      }
      try {
        const bytes = await fileToBytes(files[0]);
        const count = await getPageCount(bytes);
        if (!cancelled) setPageCount(count);
      } catch {
        if (!cancelled) setPageCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const extract = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const count = await getPageCount(bytes);
      const parsed = parsePageRanges(ranges, count);
      const out = await extractPages(bytes, parsed);
      downloadBytes(out, "split.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to split PDF.");
    } finally {
      setBusy(false);
    }
  };

  const extractAll = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const parts = await splitAllPages(bytes);
      for (const part of parts) {
        downloadBytes(part.bytes, `page-${part.index}.pdf`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to split PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      {pageCount != null && (
        <p className="text-sm text-zinc-600">{pageCount} page(s) detected</p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Page ranges</span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
          placeholder="e.g. 1-3,5"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={extract}
          className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {busy ? "Working…" : "Extract ranges"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={extractAll}
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:border-teal-700 disabled:opacity-60"
        >
          Split all pages
        </button>
      </div>
    </div>
  );
}
