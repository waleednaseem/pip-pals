import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { loadPdfDocument } from "./pdfjs";

export type ExtractedImage = {
  page: number;
  index: number;
  blob: Blob;
  width: number;
  height: number;
};

function rgbaToPngBlob(
  width: number,
  height: number,
  data: Uint8ClampedArray | Uint8Array
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable."));
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
      "image/png"
    );
  });
}

/**
 * Extract embedded images from a PDF (Acrobat / standard).
 * Falls back to rendering each page as an image if none are found.
 */
export async function extractImagesFromPdf(
  bytes: Uint8Array,
  fallbackRenderPages = true
): Promise<ExtractedImage[]> {
  const pdf = await loadPdfDocument(bytes);
  const results: ExtractedImage[] = [];
  let globalIndex = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const ops = await page.getOperatorList();
    const seen = new Set<string>();

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn !== OPS.paintImageXObject &&
        fn !== OPS.paintImageXObjectRepeat &&
        fn !== OPS.paintInlineImageXObject &&
        fn !== OPS.paintInlineImageXObjectGroup
      ) {
        continue;
      }

      const args = ops.argsArray[i] as unknown[];
      const name = typeof args[0] === "string" ? args[0] : null;
      if (!name || seen.has(name)) continue;
      seen.add(name);

      try {
        const img = await new Promise<{
          width: number;
          height: number;
          data?: Uint8ClampedArray | Uint8Array;
          kind?: number;
        } | null>((resolve) => {
          try {
            page.objs.get(name, (obj: unknown) => {
              resolve(obj as { width: number; height: number; data?: Uint8ClampedArray });
            });
          } catch {
            resolve(null);
          }
        });

        if (!img?.width || !img?.height || !img.data) continue;

        // pdf.js image data is often RGBA
        const expected = img.width * img.height * 4;
        let rgba: Uint8ClampedArray;
        if (img.data.length >= expected) {
          rgba = new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, expected);
        } else if (img.data.length === img.width * img.height * 3) {
          rgba = new Uint8ClampedArray(expected);
          for (let j = 0, k = 0; j < img.data.length; j += 3, k += 4) {
            rgba[k] = img.data[j];
            rgba[k + 1] = img.data[j + 1];
            rgba[k + 2] = img.data[j + 2];
            rgba[k + 3] = 255;
          }
        } else {
          continue;
        }

        const blob = await rgbaToPngBlob(img.width, img.height, rgba);
        globalIndex += 1;
        results.push({
          page: p,
          index: globalIndex,
          blob,
          width: img.width,
          height: img.height,
        });
      } catch {
        // skip bad image objs
      }
    }
  }

  if (!results.length && fallbackRenderPages) {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Render failed."))),
          "image/png"
        );
      });
      globalIndex += 1;
      results.push({
        page: p,
        index: globalIndex,
        blob,
        width: canvas.width,
        height: canvas.height,
      });
    }
  }

  await pdf.cleanup();
  return results;
}
