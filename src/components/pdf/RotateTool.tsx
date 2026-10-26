import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { rotatePdfPages, type RotateAngle } from "@/lib/pdf/rotate";
import { getPageCount } from "@/lib/pdf/split";
import { useEffect, useState } from "react";

export default function RotateTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState<RotateAngle>(90);
  const [pages, setPages] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:rotate");
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
      } catch (e) {
        if (!cancelled) {
          setPageCount(null);
          setError(e instanceof Error ? e.message : "Could not read PDF.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const run = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const pageNumbers = pages.trim()
        ? pages
            .split(",")
            .map((p) => Number(p.trim()))
            .filter((n) => Number.isInteger(n))
        : undefined;
      const out = await rotatePdfPages(bytes, angle, pageNumbers);
      downloadBytes(out, "rotated.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rotate PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      {pageCount != null && (
        <p className="text-sm text-zinc-600">{pageCount} page(s)</p>
      )}
      <label className="block max-w-xs text-sm">
        <span className="mb-1 block font-medium">Rotate by</span>
        <select
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value) as RotateAngle)}
        >
          <option value={90}>90° clockwise</option>
          <option value={180}>180°</option>
          <option value={270}>270° (90° counter-clockwise)</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">
          Pages (optional, comma-separated — blank = all)
        </span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="e.g. 1,3,5"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Rotating…" : "Rotate & download"}
      </button>
    </div>
  );
}
