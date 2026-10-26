import { PDFDocument } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (!files.length) {
    throw new Error("Add at least one PDF to merge.");
  }

  const merged = await PDFDocument.create();

  for (const bytes of files) {
    const doc = await loadPdfForEdit(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return savePdf(merged);
}
