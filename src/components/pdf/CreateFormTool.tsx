import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { addFormFieldsToPdf, type NewFormField } from "@/lib/pdf/createForm";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { loadPdfDocument } from "@/lib/pdf/pdfjs";
import { useCallback, useEffect, useRef, useState } from "react";

type Draft = Omit<NewFormField, "name"> & { id: string; name: string };

export default function CreateFormTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [fieldType, setFieldType] = useState<"text" | "checkbox">("text");
  const [fields, setFields] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:create-form");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPdfBytes(null);
      setFields([]);
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

  const onClickPreview = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = previewRef.current;
    if (!canvas || !pageSize) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const scaleX = pageSize.width / canvas.width;
    const scaleY = pageSize.height / canvas.height;
    const w = fieldType === "checkbox" ? 18 : 160;
    const h = fieldType === "checkbox" ? 18 : 28;
    const pdfX = cx * scaleX;
    const pdfY = pageSize.height - cy * scaleY - h;
    const id = `f_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        id,
        name: `${fieldType}_${prev.length + 1}`,
        type: fieldType,
        pageNumber,
        x: pdfX,
        y: pdfY,
        width: w,
        height: h,
      },
    ]);
  };

  const run = async () => {
    setError(null);
    if (!pdfBytes) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const out = await addFormFieldsToPdf(
        pdfBytes,
        fields.map(({ id: _id, ...rest }) => rest)
      );
      downloadBytes(out, "fillable-form.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create form.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2 font-medium">
          Field type
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as "text" | "checkbox")}
          >
            <option value="text">Text</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </label>
        {pdfBytes && (
          <label className="flex items-center gap-2 font-medium">
            Page
            <input
              type="number"
              min={1}
              max={pageCount}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5"
              value={pageNumber}
              onChange={(e) => setPageNumber(Number(e.target.value) || 1)}
            />
            / {pageCount}
          </label>
        )}
      </div>
      <p className="text-sm text-[var(--gray-muted)]">
        Click on the preview to place AcroForm fields (Acrobat-compatible).
      </p>
      {pdfBytes && (
        <div
          className="relative w-full max-w-[640px] cursor-crosshair overflow-auto rounded-xl border border-gray-300 bg-zinc-100"
          onClick={onClickPreview}
        >
          <canvas ref={previewRef} className="block h-auto w-full" />
        </div>
      )}
      {fields.length > 0 && (
        <ul className="space-y-2 text-sm">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <input
                className="flex-1 rounded border border-gray-300 px-2 py-1"
                value={f.name}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((x) =>
                      x.id === f.id ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <span className="text-[var(--gray-muted)]">
                p{f.pageNumber} · {f.type}
              </span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !fields.length}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Create fillable PDF"}
      </button>
    </div>
  );
}
