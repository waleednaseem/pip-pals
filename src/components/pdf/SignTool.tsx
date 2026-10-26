import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { loadPdfDocument } from "@/lib/pdf/pdfjs";
import { addSignatureToPdf } from "@/lib/pdf/sign";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_W = 180;
const DEFAULT_H = 60;
const MIN_W = 40;
const MIN_H = 20;
const MAX_W = 480;
const MAX_H = 240;

type SigBox = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se" | "move";

export default function SignTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreviewUrl, setSigPreviewUrl] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  const [sigBox, setSigBox] = useState<SigBox | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null
  );

  const previewRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drag = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origin: SigBox;
  } | null>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:sign");
  }, [addRecent]);

  useEffect(() => {
    const canvas = drawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setSigBox(null);
      setPlaceMode(false);
      setPdfBytes(null);
      setPageCount(1);
      setPageNumber(1);
      setPageSize(null);

      if (!files[0]) return;

      setLoadingPdf(true);
      try {
        const bytes = await fileToBytes(files[0]);
        if (cancelled) return;
        const pdf = await loadPdfDocument(bytes);
        if (cancelled) {
          await pdf.cleanup();
          return;
        }
        setPageCount(pdf.numPages);
        setPageNumber(1);
        setPdfBytes(bytes);
        await pdf.cleanup();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF.");
        }
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  const renderPage = useCallback(async (bytes: Uint8Array, pageNum: number) => {
    const canvas = previewRef.current;
    if (!canvas) return;

    setRendering(true);
    setError(null);
    try {
      const pdf = await loadPdfDocument(bytes);
      const page = await pdf.getPage(pageNum);
      const unscaled = page.getViewport({ scale: 1 });
      setPageSize({ width: unscaled.width, height: unscaled.height });

      const parentWidth = canvas.parentElement?.clientWidth || 640;
      const maxWidth = Math.min(640, parentWidth > 0 ? parentWidth : 640);
      const scale = maxWidth / unscaled.width;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        await pdf.cleanup();
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      await pdf.cleanup();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to render page.");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (!pdfBytes) return;
    const id = requestAnimationFrame(() => {
      void renderPage(pdfBytes, pageNumber);
    });
    return () => cancelAnimationFrame(id);
  }, [pdfBytes, pageNumber, renderPage]);

  useEffect(() => {
    if (!sigFile) {
      setSigPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(sigFile);
    setSigPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sigFile]);

  const refreshDrawnPreview = () => {
    const canvas = drawRef.current;
    if (!canvas) return;
    setSigPreviewUrl((prev) => {
      if (prev?.startsWith("blob:") && !sigFile) URL.revokeObjectURL(prev);
      return canvas.toDataURL("image/png");
    });
  };

  const getDrawPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const clearCanvas = () => {
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sigFile) setSigPreviewUrl(null);
  };

  const canvasToPng = async (): Promise<Uint8Array> => {
    const canvas = drawRef.current!;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not export signature."))),
        "image/png"
      );
    });
    return new Uint8Array(await blob.arrayBuffer());
  };

  const clampBox = (box: SigBox, bounds: DOMRect): SigBox => {
    let { x, y, w, h } = box;
    w = Math.max(MIN_W, Math.min(MAX_W, w));
    h = Math.max(MIN_H, Math.min(MAX_H, h));
    x = Math.max(0, Math.min(x, bounds.width - w));
    y = Math.max(0, Math.min(y, bounds.height - h));
    return { x, y, w, h };
  };

  const startInteraction = (
    e: React.PointerEvent,
    handle: Handle,
    origin: SigBox
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = previewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    drag.current = {
      handle,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origin,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const wrap = (e.currentTarget as HTMLElement).closest(
      "[data-sig-wrap]"
    ) as HTMLElement | null;
    wrap?.setPointerCapture(e.pointerId);
  };

  const onPreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = previewRef.current;
    if (!canvas || !placeMode) return;
    if ((e.target as HTMLElement).dataset?.handle) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (sigBox) {
      const inside =
        x >= sigBox.x &&
        x <= sigBox.x + sigBox.w &&
        y >= sigBox.y &&
        y <= sigBox.y + sigBox.h;
      if (inside) {
        startInteraction(e, "move", sigBox);
        return;
      }
    }

    const next = clampBox(
      { x: x - DEFAULT_W / 2, y: y - DEFAULT_H / 2, w: DEFAULT_W, h: DEFAULT_H },
      rect
    );
    setSigBox(next);
    startInteraction(e, "move", next);
  };

  const onPreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { handle, startX, startY, origin } = drag.current;
    const dx = x - startX;
    const dy = y - startY;

    let next: SigBox = { ...origin };

    if (handle === "move") {
      next = { ...origin, x: origin.x + dx, y: origin.y + dy };
    } else if (handle === "se") {
      next = { ...origin, w: origin.w + dx, h: origin.h + dy };
    } else if (handle === "sw") {
      next = {
        x: origin.x + dx,
        y: origin.y,
        w: origin.w - dx,
        h: origin.h + dy,
      };
    } else if (handle === "ne") {
      next = {
        x: origin.x,
        y: origin.y + dy,
        w: origin.w + dx,
        h: origin.h - dy,
      };
    } else if (handle === "nw") {
      next = {
        x: origin.x + dx,
        y: origin.y + dy,
        w: origin.w - dx,
        h: origin.h - dy,
      };
    }

    // Keep aspect roughly when Shift held
    if (e.shiftKey && handle !== "move") {
      const ratio = DEFAULT_W / DEFAULT_H;
      next.h = next.w / ratio;
    }

    setSigBox(clampBox(next, rect));
  };

  const onPreviewPointerUp = () => {
    drag.current = null;
  };

  const run = async () => {
    setError(null);
    if (!files[0] || !pdfBytes) {
      setError("Upload a PDF first.");
      return;
    }
    if (!sigBox || !pageSize || !previewRef.current) {
      setError("Click on the PDF preview to place your signature.");
      return;
    }
    if (!sigFile && !sigPreviewUrl) {
      setError("Draw a signature or upload an image first.");
      return;
    }

    setBusy(true);
    try {
      let imageBytes: Uint8Array;
      let imageType: "png" | "jpg" = "png";

      if (sigFile) {
        imageBytes = await fileToBytes(sigFile);
        imageType =
          sigFile.type.includes("jpeg") || sigFile.name.match(/\.jpe?g$/i)
            ? "jpg"
            : "png";
      } else {
        imageBytes = await canvasToPng();
      }

      const canvas = previewRef.current;
      const scaleX = pageSize.width / canvas.width;
      const scaleY = pageSize.height / canvas.height;
      const pdfWidth = sigBox.w * scaleX;
      const pdfHeight = sigBox.h * scaleY;
      const pdfX = sigBox.x * scaleX;
      const pdfY = pageSize.height - sigBox.y * scaleY - pdfHeight;

      const out = await addSignatureToPdf(pdfBytes, {
        pageNumber,
        imageBytes,
        imageType,
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      });
      downloadBytes(out, "signed.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign PDF.");
    } finally {
      setBusy(false);
    }
  };

  const handles = ["nw", "ne", "sw", "se"] as const;
  const handleStyle: Record<(typeof handles)[number], string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  };

  return (
    <div className="space-y-5">
      <UploadZone files={files} onChange={setFiles} />

      {files[0] && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
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
              <span className="font-normal text-zinc-500">/ {pageCount}</span>
            </label>
            <button
              type="button"
              onClick={() => setPlaceMode((v) => !v)}
              disabled={!pdfBytes}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                placeMode
                  ? "bg-teal-800 text-white"
                  : "border border-zinc-300 text-zinc-800 hover:border-teal-700"
              }`}
            >
              {placeMode ? "Placement on — click PDF" : "Place signature on PDF"}
            </button>
          </div>

          <p className="text-sm text-zinc-600">
            Place signature, drag to move, pull corner handles to resize. Hold Shift for
            locked aspect.
          </p>

          {sigBox && (
            <label className="flex max-w-sm items-center gap-3 text-sm">
              <span className="shrink-0 font-medium">Size</span>
              <input
                type="range"
                min={50}
                max={250}
                value={Math.round(sigBox.w)}
                onChange={(e) => {
                  const canvas = previewRef.current;
                  if (!canvas) return;
                  const rect = canvas.getBoundingClientRect();
                  const w = Number(e.target.value);
                  const h = Math.max(MIN_H, (w * sigBox.h) / sigBox.w);
                  setSigBox(clampBox({ ...sigBox, w, h }, rect));
                }}
                className="w-full"
              />
              <span className="w-16 shrink-0 text-zinc-500">
                {Math.round(sigBox.w)}×{Math.round(sigBox.h)}
              </span>
            </label>
          )}

          {(loadingPdf || rendering) && (
            <p className="text-sm text-teal-800">Loading PDF preview…</p>
          )}

          <div
            data-sig-wrap
            className={`relative w-full max-w-[640px] overflow-auto rounded-xl border border-zinc-300 bg-zinc-100 ${
              placeMode ? "cursor-crosshair ring-2 ring-teal-700/40" : ""
            }`}
            onPointerDown={onPreviewPointerDown}
            onPointerMove={onPreviewPointerMove}
            onPointerUp={onPreviewPointerUp}
          >
            <canvas ref={previewRef} className="block h-auto w-full max-w-full" />
            {sigBox && (
              <div
                className="absolute border-2 border-dashed border-teal-700 bg-white/30"
                style={{
                  left: sigBox.x,
                  top: sigBox.y,
                  width: sigBox.w,
                  height: sigBox.h,
                }}
              >
                {sigPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sigPreviewUrl}
                    alt="Signature placement"
                    draggable={false}
                    className="pointer-events-none h-full w-full object-contain"
                  />
                ) : (
                  <div className="pointer-events-none flex h-full items-center justify-center text-xs text-teal-900">
                    Signature here
                  </div>
                )}
                {placeMode &&
                  handles.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-handle={h}
                      aria-label={`Resize ${h}`}
                      className={`absolute z-10 h-3.5 w-3.5 rounded-sm border-2 border-teal-800 bg-white shadow ${handleStyle[h]}`}
                      onPointerDown={(e) => {
                        if (!sigBox) return;
                        startInteraction(e, h, sigBox);
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Draw signature</p>
        <canvas
          ref={drawRef}
          width={400}
          height={120}
          className="w-full max-w-md touch-none rounded-lg border border-zinc-300 bg-white"
          onPointerDown={(e) => {
            drawing.current = true;
            const ctx = drawRef.current?.getContext("2d");
            if (!ctx) return;
            const { x, y } = getDrawPos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = drawRef.current?.getContext("2d");
            if (!ctx) return;
            const { x, y } = getDrawPos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            drawing.current = false;
            if (!sigFile) refreshDrawnPreview();
          }}
        />
        <button
          type="button"
          onClick={clearCanvas}
          className="mt-2 text-sm text-zinc-600 hover:underline"
        >
          Clear drawing
        </button>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Or upload signature image (PNG/JPG)</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            setSigFile(e.target.files?.[0] ?? null);
          }}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !pdfBytes}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Signing…" : "Sign & download"}
      </button>
    </div>
  );
}
