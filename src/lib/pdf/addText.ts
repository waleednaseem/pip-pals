import { rgb, StandardFonts } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type AddTextOptions = {
  pageNumber: number;
  text: string;
  x: number;
  y: number;
  size?: number;
};

export async function addTextToPdf(
  bytes: Uint8Array,
  options: AddTextOptions
): Promise<Uint8Array> {
  const text = options.text.trim();
  if (!text) throw new Error("Enter text to add.");

  const doc = await loadPdfForEdit(bytes);
  const count = doc.getPageCount();
  if (options.pageNumber < 1 || options.pageNumber > count) {
    throw new Error(`Page must be between 1 and ${count}.`);
  }

  const page = doc.getPage(options.pageNumber - 1);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, {
    x: options.x,
    y: options.y,
    size: options.size ?? 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  return savePdf(doc);
}
