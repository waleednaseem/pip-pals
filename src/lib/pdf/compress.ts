import { imagesToPdf } from "./jpgToPdf";
import { loadPdfDocument } from "./pdfjs";

export async function compressPdf(
  bytes: Uint8Array,
  quality = 0.55,
  scale = 1.25
): Promise<Uint8Array> {
  const pdf = await loadPdfDocument(bytes);
  const images: { bytes: Uint8Array; type: "jpg" | "png" }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Compress encode failed."))),
        "image/jpeg",
        quality
      );
    });
    images.push({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      type: "jpg",
    });
  }

  await pdf.cleanup();
  return imagesToPdf(images);
}
