import { PDFDocument } from "pdf-lib";
import { savePdf } from "./load";

export async function imagesToPdf(
  images: { bytes: Uint8Array; type: "jpg" | "png" }[]
): Promise<Uint8Array> {
  if (!images.length) throw new Error("Add at least one image.");

  const doc = await PDFDocument.create();

  for (const img of images) {
    const embedded =
      img.type === "png"
        ? await doc.embedPng(img.bytes)
        : await doc.embedJpg(img.bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }

  return savePdf(doc);
}
