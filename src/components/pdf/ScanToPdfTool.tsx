import { useFavorites } from "@/context";
import { downloadBytes } from "@/lib/pdf/download";
import { imagesFilesToPdf } from "@/lib/pdf/officeConvert";
import { useEffect, useRef, useState } from "react";

export default function ScanToPdfTool() {
  const [shots, setShots] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:scan-to-pdf");
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [addRecent]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError("Camera permission denied or unavailable. Upload photos instead.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.9)
    );
    if (!blob) return;
    const file = new File([blob], `scan-${shots.length + 1}.jpg`, {
      type: "image/jpeg",
    });
    setShots((s) => [...s, file]);
  };

  const run = async () => {
    setError(null);
    if (!shots.length) {
      setError("Capture or upload at least one image.");
      return;
    }
    setBusy(true);
    try {
      stopCamera();
      const out = await imagesFilesToPdf(shots);
      downloadBytes(out, "scan.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[var(--gray-border)] bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="mx-auto max-h-80 w-full object-contain"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {!streaming ? (
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
          >
            Start camera
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={capture}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
            >
              Capture page
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-lg border border-[var(--gray-border)] px-4 py-2 text-sm"
            >
              Stop camera
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-[var(--gray-border)] px-4 py-2 text-sm"
        >
          Upload photos
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            if (list.length) setShots((s) => [...s, ...list]);
            e.target.value = "";
          }}
        />
      </div>
      {shots.length > 0 && (
        <p className="text-sm text-[var(--gray-muted)]">
          {shots.length} page{shots.length === 1 ? "" : "s"} ready
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Building…" : "Create PDF"}
      </button>
    </div>
  );
}
