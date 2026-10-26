import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  applyEditsToPdf,
  type EditItem,
  type EditStrokeItem,
} from "@/lib/pdf/editPdf";
import { loadPdfDocument } from "@/lib/pdf/pdfjs";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "text" | "image" | "draw" | "rect";

type Overlay =
  | {
      id: string;
      kind: "text";
      pageNumber: number;
      x: number;
      y: number;
      text: string;
      size: number;
    }
  | {
      id: string;
      kind: "image";
      pageNumber: number;
      x: number;
      y: number;
      w: number;
      h: number;
      url: string;
      bytes: Uint8Array;
      imageType: "png" | "jpg";
    }
  | {
      id: string;
      kind: "rect";
      pageNumber: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      id: string;
      kind: "stroke";
      pageNumber: number;
      points: { x: number; y: number }[];
    };

export default function EditPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [mode, setMode] = useState<Mode>("text");
  const [textValue, setTextValue] = useState("Edit me");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokeId = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<{
    bytes: Uint8Array;
    url: string;
    type: "png" | "jpg";
  } | null>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:edit");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPdfBytes(null);
      setOverlays([]);
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

  const toCanvasPos = (e: React.PointerEvent | React.MouseEvent) => {
    const canvas = previewRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewRef.current || !pageSize) return;
    const pos = toCanvasPos(e);

    if (mode === "draw") {
      drawing.current = true;
      const id = `s_${Date.now()}`;
      strokeId.current = id;
      setOverlays((prev) => [
        ...prev,
        { id, kind: "stroke", pageNumber, points: [pos] },
      ]);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (mode === "text") {
      setOverlays((prev) => [
        ...prev,
        {
          id: `t_${Date.now()}`,
          kind: "text",
          pageNumber,
          x: pos.x,
          y: pos.y,
          text: textValue || "Text",
          size: 16,
        },
      ]);
      return;
    }

    if (mode === "rect") {
      setOverlays((prev) => [
        ...prev,
        {
          id: `r_${Date.now()}`,
          kind: "rect",
          pageNumber,
          x: pos.x - 40,
          y: pos.y - 20,
          w: 120,
          h: 60,
        },
      ]);
      return;
    }

    if (mode === "image" && pendingImage.current) {
      const img = pendingImage.current;
      setOverlays((prev) => [
        ...prev,
        {
          id: `i_${Date.now()}`,
          kind: "image",
          pageNumber,
          x: pos.x - 60,
          y: pos.y - 40,
          w: 120,
          h: 80,
          url: img.url,
          bytes: img.bytes,
          imageType: img.type,
        },
      ]);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing.current || !strokeId.current) return;
    const pos = toCanvasPos(e);
    const id = strokeId.current;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id && o.kind === "stroke"
          ? { ...o, points: [...o.points, pos] }
          : o
      )
    );
  };

  const onPointerUp = () => {
    drawing.current = false;
    strokeId.current = null;
  };

  const run = async () => {
    setError(null);
    if (!pdfBytes || !previewRef.current || !pageSize) {
      setError("Upload a PDF and add edits first.");
      return;
    }
    const canvas = previewRef.current;
    const scaleX = pageSize.width / canvas.width;
    const scaleY = pageSize.height / canvas.height;

    const edits: EditItem[] = [];
    for (const o of overlays) {
      if (o.kind === "text") {
        edits.push({
          kind: "text",
          pageNumber: o.pageNumber,
          text: o.text,
          size: o.size,
          x: o.x * scaleX,
          y: pageSize.height - o.y * scaleY - o.size,
        });
      } else if (o.kind === "image") {
        edits.push({
          kind: "image",
          pageNumber: o.pageNumber,
          x: o.x * scaleX,
          y: pageSize.height - (o.y + o.h) * scaleY,
          width: o.w * scaleX,
          height: o.h * scaleY,
          imageBytes: o.bytes,
          imageType: o.imageType,
        });
      } else if (o.kind === "rect") {
        edits.push({
          kind: "rect",
          pageNumber: o.pageNumber,
          x: o.x * scaleX,
          y: pageSize.height - (o.y + o.h) * scaleY,
          width: o.w * scaleX,
          height: o.h * scaleY,
        });
      } else if (o.kind === "stroke") {
        const stroke: EditStrokeItem = {
          kind: "stroke",
          pageNumber: o.pageNumber,
          lineWidth: 2,
          points: o.points.map((p) => ({
            x: p.x * scaleX,
            y: pageSize.height - p.y * scaleY,
          })),
        };
        edits.push(stroke);
      }
    }

    // Fix: pageSize is for current page only — multi-page edits need per-page sizes.
    // For simplicity, re-compute using current pageSize only works if edits are on current page dims.
    // Better approach: store pageSize per page when rendering. For MVP, only allow accurate export
    // when all overlays share pages that were rendered at same aspect; we re-apply with load of each page size.

    setBusy(true);
    try {
      // Rebuild edits with correct page dimensions per page
      const pdf = await loadPdfDocument(pdfBytes);
      const fixed: EditItem[] = [];
      for (const o of overlays) {
        const page = await pdf.getPage(o.pageNumber);
        const vp1 = page.getViewport({ scale: 1 });
        // canvas display size for that page may differ; use last rendered canvas only if same page
        const sx =
          o.pageNumber === pageNumber
            ? pageSize.width / canvas.width
            : vp1.width / canvas.width;
        const sy =
          o.pageNumber === pageNumber
            ? pageSize.height / canvas.height
            : vp1.height / canvas.height;
        const pw = vp1.width;
        const ph = vp1.height;

        if (o.kind === "text") {
          fixed.push({
            kind: "text",
            pageNumber: o.pageNumber,
            text: o.text,
            size: o.size,
            x: o.x * sx,
            y: ph - o.y * sy - o.size,
          });
        } else if (o.kind === "image") {
          fixed.push({
            kind: "image",
            pageNumber: o.pageNumber,
            x: o.x * sx,
            y: ph - (o.y + o.h) * sy,
            width: o.w * sx,
            height: o.h * sy,
            imageBytes: o.bytes,
            imageType: o.imageType,
          });
        } else if (o.kind === "rect") {
          fixed.push({
            kind: "rect",
            pageNumber: o.pageNumber,
            x: o.x * sx,
            y: ph - (o.y + o.h) * sy,
            width: o.w * sx,
            height: o.h * sy,
          });
        } else {
          fixed.push({
            kind: "stroke",
            pageNumber: o.pageNumber,
            lineWidth: 2,
            points: o.points.map((p) => ({
              x: p.x * sx,
              y: ph - p.y * sy,
            })),
          });
        }
      }
      await pdf.cleanup();

      const out = await applyEditsToPdf(pdfBytes, fixed.length ? fixed : edits);
      downloadBytes(out, "edited.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save edits.");
    } finally {
      setBusy(false);
    }
  };

  const pageOverlays = overlays.filter((o) => o.pageNumber === pageNumber);

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["text", "Text"],
            ["image", "Image"],
            ["draw", "Draw"],
            ["rect", "Rectangle"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              if (id === "image") imageInputRef.current?.click();
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              mode === id
                ? "bg-[var(--brand)] text-white"
                : "border border-gray-300 bg-white"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm"
          onClick={() => setOverlays([])}
        >
          Clear edits
        </button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const bytes = await fileToBytes(f);
          const url = URL.createObjectURL(f);
          pendingImage.current = {
            bytes,
            url,
            type: f.type.includes("png") ? "png" : "jpg",
          };
          setMode("image");
          e.target.value = "";
        }}
      />
      {mode === "text" && (
        <input
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Text to place"
        />
      )}
      {mode === "image" && (
        <p className="text-sm text-[var(--gray-muted)]">
          Choose an image, then click the page to place it.
        </p>
      )}

      {pdfBytes && (
        <>
          <label className="flex items-center gap-2 text-sm font-medium">
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
          <div
            className="relative w-full max-w-[640px] touch-none overflow-auto rounded-xl border border-gray-300 bg-zinc-100"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <canvas ref={previewRef} className="block h-auto w-full" />
            {pageOverlays.map((o) => {
              if (o.kind === "text") {
                return (
                  <span
                    key={o.id}
                    className="pointer-events-none absolute text-gray-900"
                    style={{ left: o.x, top: o.y, fontSize: o.size }}
                  >
                    {o.text}
                  </span>
                );
              }
              if (o.kind === "image") {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={o.id}
                    src={o.url}
                    alt=""
                    className="pointer-events-none absolute object-contain"
                    style={{ left: o.x, top: o.y, width: o.w, height: o.h }}
                  />
                );
              }
              if (o.kind === "rect") {
                return (
                  <div
                    key={o.id}
                    className="pointer-events-none absolute border-2 border-[var(--brand)]"
                    style={{ left: o.x, top: o.y, width: o.w, height: o.h }}
                  />
                );
              }
              const d = o.points
                .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
                .join(" ");
              return (
                <svg
                  key={o.id}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  <path d={d} fill="none" stroke="#111" strokeWidth="2" />
                </svg>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !overlays.length}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save edited PDF"}
      </button>
    </div>
  );
}
