import { rgb } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type RedactBand = {
  /** 0–1 fraction from top of page */
  top: number;
  /** 0–1 fraction of page height to cover */
  height: number;
};

/** Cover bands on every page with opaque black (content underneath stays but is obscured). */
export async function redactPdfBands(
  bytes: Uint8Array,
  bands: RedactBand[]
): Promise<Uint8Array> {
  if (!bands.length) throw new Error("Add at least one redact band.");
  const doc = await loadPdfForEdit(bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    for (const band of bands) {
      const h = Math.max(1, height * band.height);
      const y = height - height * band.top - h;
      page.drawRectangle({
        x: 0,
        y,
        width,
        height: h,
        color: rgb(0, 0, 0),
      });
    }
  }
  return savePdf(doc);
}

/** Fully black out specific 1-based page numbers. */
export async function redactFullPages(
  bytes: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes);
  const set = new Set(pageNumbers);
  doc.getPages().forEach((page, i) => {
    if (!set.has(i + 1)) return;
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0, 0, 0),
    });
  });
  return savePdf(doc);
}
