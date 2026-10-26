import { useCallback, useEffect, useRef, useState } from "react";

export type CropRect = { x: number; y: number; w: number; h: number };

type Props = {
  file: File;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
};

export default function ImageCropPreview({ file, crop, onChange }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const drag = useRef<{
    mode: "move" | "draw";
    startX: number;
    startY: number;
    orig: CropRect;
  } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    setNatural({ w: 0, h: 0 });
    setDisplay({ w: 0, h: 0 });
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const syncDisplay = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setDisplay({ w: rect.width, h: rect.height });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", syncDisplay);
    return () => window.removeEventListener("resize", syncDisplay);
  }, [syncDisplay]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const img = imgRef.current;
      if (!img || !natural.w) return { x: 0, y: 0 };
      const rect = img.getBoundingClientRect();
      const sx = natural.w / rect.width;
      const sy = natural.h / rect.height;
      return {
        x: Math.max(0, Math.min(natural.w, (clientX - rect.left) * sx)),
        y: Math.max(0, Math.min(natural.h, (clientY - rect.top) * sy)),
      };
    },
    [natural]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toImageCoords(e.clientX, e.clientY);
    const inside =
      p.x >= crop.x &&
      p.x <= crop.x + crop.w &&
      p.y >= crop.y &&
      p.y <= crop.y + crop.h;
    drag.current = {
      mode: inside && crop.w > 0 && crop.h > 0 ? "move" : "draw",
      startX: p.x,
      startY: p.y,
      orig: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !natural.w) return;
    const p = toImageCoords(e.clientX, e.clientY);
    const d = drag.current;
    if (d.mode === "draw") {
      const x = Math.min(d.startX, p.x);
      const y = Math.min(d.startY, p.y);
      onChange({
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(Math.abs(p.x - d.startX)),
        h: Math.round(Math.abs(p.y - d.startY)),
      });
    } else {
      const dx = p.x - d.startX;
      const dy = p.y - d.startY;
      onChange({
        x: Math.round(
          Math.max(0, Math.min(natural.w - d.orig.w, d.orig.x + dx))
        ),
        y: Math.round(
          Math.max(0, Math.min(natural.h - d.orig.h, d.orig.y + dy))
        ),
        w: d.orig.w,
        h: d.orig.h,
      });
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const scaleX = natural.w && display.w ? display.w / natural.w : 1;
  const scaleY = natural.h && display.h ? display.h / natural.h : 1;

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--gray-muted)]">
        Drag on the image to select a crop area. Drag inside the box to move it.
      </p>
      <div className="relative max-h-[70vh] overflow-auto rounded-xl border border-[var(--gray-border)] bg-[#1a1a1a]">
        {url && (
          <div className="relative inline-block max-w-full touch-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={url}
              alt="Crop preview"
              className="max-h-[70vh] max-w-full select-none"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                const w = el.naturalWidth;
                const h = el.naturalHeight;
                setNatural({ w, h });
                syncDisplay();
                onChange({
                  x: Math.round(w * 0.1),
                  y: Math.round(h * 0.1),
                  w: Math.round(w * 0.8),
                  h: Math.round(h * 0.8),
                });
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {natural.w > 0 && crop.w > 0 && crop.h > 0 && (
              <div
                className="pointer-events-none absolute border-2 border-[var(--brand)] bg-[var(--brand)]/20"
                style={{
                  left: crop.x * scaleX,
                  top: crop.y * scaleY,
                  width: crop.w * scaleX,
                  height: crop.h * scaleY,
                }}
              />
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--gray-muted)]">
        Selection: {crop.w} × {crop.h} px at ({crop.x}, {crop.y})
        {natural.w ? ` · Image ${natural.w} × ${natural.h}` : ""}
      </p>
    </div>
  );
}
