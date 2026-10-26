import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { addTextToPdf } from "@/lib/pdf/addText";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { loadPdfDocument } from "@/lib/pdf/pdfjs";
import { useCallback, useEffect, useRef, useState } from "react";

export default function AddTextTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [text, setText] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:add-text");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPdfBytes(null);
      setPos(null);
      if (!files[0]) return;
      try {
        const bytes = await fileToBytes(files[0]);
        if (cancelled) return;
        const pdf = await loadPdfDocument(bytes);
        setPageCount(pdf.numPages);
        setPageNumber(1);
        setPdfBytes(bytes);
        await pdf.cleanup();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const renderPage = useCallback(async (bytes: Uint8Array, pageNum: number) => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const pdf = await loadPdfDocument(bytes);
    const page = await pdf.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1 });
    setPageSize({ width: unscaled.width, height: unscaled.height });
    const maxWidth = Math.min(640, canvas.parentElement?.clientWidth || 640);
    const viewport = page.getViewport({ scale: maxWidth / unscaled.width });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      await pdf.cleanup();
      return;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    await pdf.cleanup();
  }, []);

  useEffect(() => {
    if (!pdfBytes) return;
    const id = requestAnimationFrame(() => void renderPage(pdfBytes, pageNumber));
    return () => cancelAnimationFrame(id);
  }, [pdfBytes, pageNumber, renderPage]);

  const run = async () => {
    setError(null);
    if (!pdfBytes || !pos || !pageSize || !previewRef.current) {
      setError("Upload a PDF and click where the text should go.");
      return;
    }
    setBusy(true);
    try {
      const canvas = previewRef.current;
      const scaleX = pageSize.width / canvas.width;
      const scaleY = pageSize.height / canvas.height;
      const pdfX = pos.x * scaleX;
      const pdfY = pageSize.height - pos.y * scaleY;
      const out = await addTextToPdf(pdfBytes, {
        pageNumber,
        text,
        x: pdfX,
        y: pdfY - 14,
        size: 14,
      });
      downloadBytes(out, "text-added.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add text.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Text</span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type text to place on the PDF"
        />
      </label>
      {files[0] && (
        <>
          <label className="flex items-center gap-2 text-sm font-medium">
            Page
            <input
              type="number"
              min={1}
              max={pageCount}
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5"
              value={pageNumber}
              onChange={(e) => setPageNumber(Number(e.target.value) || 1)}
            />
            / {pageCount}
          </label>
          <p className="text-sm text-zinc-600">Click on the preview to place text.</p>
          <div
            className="relative w-full max-w-[640px] cursor-crosshair overflow-auto rounded-xl border border-zinc-300 bg-zinc-100"
            onClick={(e) => {
              const canvas = previewRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              setPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
          >
            <canvas ref={previewRef} className="block h-auto w-full" />
            {pos && (
              <span
                className="pointer-events-none absolute rounded bg-teal-800/90 px-2 py-0.5 text-xs text-white"
                style={{ left: pos.x, top: pos.y }}
              >
                {text || "Text"}
              </span>
            )}
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !pdfBytes}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Add text & download"}
      </button>
    </div>
  );
}
