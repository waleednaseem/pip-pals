import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { deletePdfPages, reorderPdfPages } from "@/lib/pdf/organize";
import { getPageCount } from "@/lib/pdf/split";
import { useEffect, useState } from "react";

export default function OrganizeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [order, setOrder] = useState("");
  const [deletePages, setDeletePages] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:organize");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!files[0]) {
        setPageCount(null);
        setOrder("");
        return;
      }
      try {
        const bytes = await fileToBytes(files[0]);
        const count = await getPageCount(bytes);
        if (!cancelled) {
          setPageCount(count);
          setOrder(
            Array.from({ length: count }, (_, i) => i + 1).join(",")
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read PDF.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const parseList = (raw: string) =>
    raw
      .split(",")
      .map((p) => Number(p.trim()))
      .filter((n) => Number.isInteger(n));

  const runReorder = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await reorderPdfPages(bytes, parseList(order));
      downloadBytes(out, "organized.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to organize PDF.");
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await deletePdfPages(bytes, parseList(deletePages));
      downloadBytes(out, "pages-removed.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete pages.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      {pageCount != null && (
        <p className="text-sm text-zinc-600">{pageCount} page(s) loaded</p>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">
          Page order (reorder / remove by omitting)
        </span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="e.g. 3,1,2"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={runReorder}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Working…" : "Apply order & download"}
      </button>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Or delete pages</span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={deletePages}
          onChange={(e) => setDeletePages(e.target.value)}
          placeholder="e.g. 2,4"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={runDelete}
        className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:border-teal-700 disabled:opacity-60"
      >
        Delete pages & download
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
