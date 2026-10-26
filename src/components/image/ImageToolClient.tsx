import ImageCropPreview from "@/components/image/ImageCropPreview";
import { useFavorites } from "@/context";
import { downloadBlob } from "@/lib/downloadBlob";
import {
  compressImage,
  convertImage,
  convertToBmp,
  cropImage,
  resizeImage,
  rotateImage,
  type ImageFormat,
} from "@/lib/image/ops";
import type { ImageToolDef } from "@/lib/image/registry";
import { useEffect, useRef, useState } from "react";

const formatMap: Record<string, { mime: ImageFormat; ext: string }> = {
  "to-jpg": { mime: "image/jpeg", ext: "jpg" },
  "to-png": { mime: "image/png", ext: "png" },
  "to-webp": { mime: "image/webp", ext: "webp" },
};

export default function ImageToolClient({ tool }: { tool: ImageToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [quality, setQuality] = useState(0.7);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 400, h: 300 });
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`image:${tool.slug}`);
  }, [addRecent, tool.slug]);

  const run = async () => {
    setError(null);
    if (!file) {
      setError("Upload an image first.");
      return;
    }
    setBusy(true);
    try {
      let blob: Blob;
      let name = file.name.replace(/\.[^.]+$/, "");
      switch (tool.slug) {
        case "compress":
          blob = await compressImage(file, quality);
          name += "-compressed.jpg";
          break;
        case "resize":
          blob = await resizeImage(file, width, height);
          name += `-resized.png`;
          break;
        case "crop":
          blob = await cropImage(file, crop.x, crop.y, crop.w, crop.h);
          name += "-cropped.png";
          break;
        case "rotate":
          blob = await rotateImage(file, degrees);
          name += `-rotated.png`;
          break;
        case "to-bmp":
          blob = await convertToBmp(file);
          name += ".bmp";
          break;
        case "to-jpg":
        case "to-png":
        case "to-webp": {
          const fmt = formatMap[tool.slug];
          blob = await convertImage(file, fmt.mime);
          name += `.${fmt.ext}`;
          break;
        }
        default:
          throw new Error("Unknown image tool.");
      }
      downloadBlob(blob, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image processing failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-[var(--brand-soft)] px-4 py-10 text-center hover:border-[var(--brand)]"
      >
        <span className="text-sm font-medium text-gray-800">
          {file ? file.name : "Drop image here or click to browse"}
        </span>
        <span className="mt-1 text-xs text-[var(--gray-muted)]">
          JPG · PNG · WEBP · GIF
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />

      {tool.slug === "compress" && (
        <label className="block text-sm">
          Quality ({Math.round(quality * 100)}%)
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      )}

      {tool.slug === "resize" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Width
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Height
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
            />
          </label>
        </div>
      )}

      {tool.slug === "crop" && file && (
        <ImageCropPreview file={file} crop={crop} onChange={setCrop} />
      )}
      {tool.slug === "crop" && !file && (
        <p className="text-sm text-[var(--gray-muted)]">
          Upload an image to see a preview and drag to crop.
        </p>
      )}

      {tool.slug === "rotate" && (
        <div className="flex flex-wrap gap-2">
          {([90, 180, 270] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDegrees(d)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                degrees === d
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
              }`}
            >
              {d}°
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Working…" : "Process & download"}
      </button>
    </div>
  );
}
