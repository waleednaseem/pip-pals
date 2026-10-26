import { PDFDocument } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

/** Rebuild PDF with pages in the given 1-based order (can omit pages to delete). */
export async function reorderPdfPages(
  bytes: Uint8Array,
  order: number[]
): Promise<Uint8Array> {
  if (!order.length) {
    throw new Error("Keep at least one page.");
  }

  const src = await loadPdfForEdit(bytes);
  const count = src.getPageCount();
  for (const n of order) {
    if (!Number.isInteger(n) || n < 1 || n > count) {
      throw new Error(`Invalid page number: ${n}`);
    }
  }

  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    src,
    order.map((n) => n - 1)
  );
  pages.forEach((p) => out.addPage(p));
  return savePdf(out);
}

export async function deletePdfPages(
  bytes: Uint8Array,
  pagesToDelete: number[]
): Promise<Uint8Array> {
  const src = await loadPdfForEdit(bytes);
  const count = src.getPageCount();
  const remove = new Set(pagesToDelete);
  const keep = Array.from({ length: count }, (_, i) => i + 1).filter(
    (n) => !remove.has(n)
  );
  return reorderPdfPages(bytes, keep);
}
