import { PDFDocument } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type CropMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Crop all pages by equal margins (PDF points). */
export async function cropPdfMargins(
  bytes: Uint8Array,
  margins: CropMargins
): Promise<Uint8Array> {
  const { top, right, bottom, left } = margins;
  if ([top, right, bottom, left].some((n) => n < 0 || Number.isNaN(n))) {
    throw new Error("Margins must be zero or positive numbers.");
  }

  const src = await loadPdfForEdit(bytes);
  const out = await PDFDocument.create();

  for (let i = 0; i < src.getPageCount(); i++) {
    const [embedded] = await out.embedPages([src.getPage(i)]);
    const w = embedded.width - left - right;
    const h = embedded.height - top - bottom;
    if (w <= 10 || h <= 10) {
      throw new Error("Crop margins are too large for this page size.");
    }
    const page = out.addPage([w, h]);
    page.drawPage(embedded, {
      x: -left,
      y: -bottom,
      width: embedded.width,
      height: embedded.height,
    });
  }

  return savePdf(out);
}
