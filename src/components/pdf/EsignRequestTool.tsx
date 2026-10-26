import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  fetchEsignRequests,
  saveEsignRequestRemote,
} from "@/lib/client/persist";
import {
  buildEsignRequestPdf,
  type Signer,
  type SignatureSlot,
  type EsignRequestMeta,
} from "@/lib/pdf/esignRequest";
import { loadPdfDocument } from "@/lib/pdf/pdfjs";
import { useCallback, useEffect, useRef, useState } from "react";

export default function EsignRequestTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [title, setTitle] = useState("Please sign this document");
  const [message, setMessage] = useState(
    "Review the document and sign in the highlighted boxes."
  );
  const [signers, setSigners] = useState<Signer[]>([
    { name: "", email: "" },
  ]);
  const [activeSigner, setActiveSigner] = useState(0);
  const [slots, setSlots] = useState<SignatureSlot[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<EsignRequestMeta[]>([]);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:esign-request");
  }, [addRecent]);

  useEffect(() => {
    void fetchEsignRequests().then((list) =>
      setSaved(
        list.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          title: r.title,
          message: r.message || "",
          signers: r.signers,
          status: (r.status as "pending" | "completed") || "pending",
        }))
      )
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPdfBytes(null);
      setSlots([]);
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

  const placeSlot = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = previewRef.current;
    if (!canvas || !pageSize) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const scaleX = pageSize.width / canvas.width;
    const scaleY = pageSize.height / canvas.height;
    const w = 180;
    const h = 50;
    const pdfX = cx * scaleX - w / 2;
    const pdfY = pageSize.height - cy * scaleY - h / 2;
    setSlots((prev) => [
      ...prev,
      {
        pageNumber, // original page; cover added later → index = pageNumber
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: w,
        height: h,
        signerIndex: activeSigner,
      },
    ]);
  };

  const run = async () => {
    setError(null);
    if (!pdfBytes) {
      setError("Upload a PDF first.");
      return;
    }
    const cleanSigners = signers.filter((s) => s.name.trim() && s.email.trim());
    setBusy(true);
    try {
      // slots.pageNumber is 1-based on original; after cover, target page index = pageNumber
      const slotsWithCover = slots.map((s) => ({
        ...s,
        pageNumber: s.pageNumber, // getPage(pageNumber) after cover at 0
      }));
      const { pdf, meta } = await buildEsignRequestPdf(pdfBytes, {
        title,
        message,
        signers: cleanSigners,
        slots: slotsWithCover,
      });
      await saveEsignRequestRemote({ ...meta, slots: slotsWithCover });
      const list = await fetchEsignRequests();
      setSaved(
        list.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          title: r.title,
          message: r.message || "",
          signers: r.signers,
          status: (r.status as "pending" | "completed") || "pending",
        }))
      );
      downloadBytes(pdf, "signature-request.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-dark)]">
        Builds a signing PDF and keeps the request on this device.
        Email delivery to signers can be added later.
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Request title</span>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Message</span>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Signers</p>
        {signers.map((s, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              placeholder="Name"
              className="min-w-[140px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={s.name}
              onChange={(e) =>
                setSigners((prev) =>
                  prev.map((x, idx) =>
                    idx === i ? { ...x, name: e.target.value } : x
                  )
                )
              }
            />
            <input
              placeholder="Email"
              className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={s.email}
              onChange={(e) =>
                setSigners((prev) =>
                  prev.map((x, idx) =>
                    idx === i ? { ...x, email: e.target.value } : x
                  )
                )
              }
            />
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${
                activeSigner === i
                  ? "bg-[var(--brand)] text-white"
                  : "border border-gray-300"
              }`}
              onClick={() => setActiveSigner(i)}
            >
              Place for this signer
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-[var(--brand)]"
          onClick={() => setSigners((prev) => [...prev, { name: "", email: "" }])}
        >
          + Add signer
        </button>
      </div>

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
          <p className="text-sm text-[var(--gray-muted)]">
            Click preview to place a signature box for the selected signer.
          </p>
          <div
            className="relative w-full max-w-[640px] cursor-crosshair overflow-auto rounded-xl border border-gray-300 bg-zinc-100"
            onClick={placeSlot}
          >
            <canvas ref={previewRef} className="block h-auto w-full" />
          </div>
          <p className="text-sm text-[var(--gray-muted)]">{slots.length} box(es) placed</p>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !pdfBytes}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Building…" : "Create request PDF"}
      </button>

      {saved.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <p className="mb-2 font-medium">Saved requests</p>
          <ul className="space-y-1 text-[var(--gray-muted)]">
            {saved.slice(0, 5).map((r) => (
              <li key={r.id}>
                {r.title} · {r.signers.map((s) => s.email).join(", ")} ·{" "}
                {new Date(r.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
