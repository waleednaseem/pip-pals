export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: ImageFormat,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to encode image."));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

function drawToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  rotate = 0
): HTMLCanvasElement {
  const rad = ((rotate % 360) * Math.PI) / 180;
  const swap = Math.abs(rotate % 180) === 90;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? height : width;
  canvas.height = swap ? width : height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  return canvas;
}

export async function compressImage(
  file: File,
  quality = 0.7,
  maxWidth = 1920
): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = drawToCanvas(img, w, h);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

export async function resizeImage(
  file: File,
  width: number,
  height: number,
  format: ImageFormat = "image/png"
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = drawToCanvas(img, width, height);
  return canvasToBlob(canvas, format, format === "image/jpeg" ? 0.92 : undefined);
}

export async function cropImage(
  file: File,
  x: number,
  y: number,
  width: number,
  height: number,
  format: ImageFormat = "image/png"
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.drawImage(
    img,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvasToBlob(canvas, format, format === "image/jpeg" ? 0.92 : undefined);
}

export async function rotateImage(
  file: File,
  degrees: 90 | 180 | 270,
  format: ImageFormat = "image/png"
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = drawToCanvas(img, img.width, img.height, degrees);
  return canvasToBlob(canvas, format, format === "image/jpeg" ? 0.92 : undefined);
}

export async function convertImage(
  file: File,
  format: ImageFormat
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = drawToCanvas(img, img.width, img.height);
  return canvasToBlob(
    canvas,
    format,
    format === "image/jpeg" ? 0.92 : undefined
  );
}

/** Simple 24-bit BMP encoder from canvas ImageData. */
export async function convertToBmp(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = drawToCanvas(img, img.width, img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const buffer = new ArrayBuffer(54 + pixelSize);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  u8[0] = 0x42;
  u8[1] = 0x4d;
  view.setUint32(2, 54 + pixelSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);

  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      u8[offset++] = imageData.data[i + 2];
      u8[offset++] = imageData.data[i + 1];
      u8[offset++] = imageData.data[i];
    }
    offset += rowSize - width * 3;
  }

  return new Blob([buffer], { type: "image/bmp" });
}

export async function extractPalette(
  file: File,
  maxColors = 6
): Promise<string[]> {
  const img = await loadImage(file);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] >> 4;
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    const key = `${r},${g},${b}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map((n) => parseInt(n, 10) * 17);
      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    });
}
