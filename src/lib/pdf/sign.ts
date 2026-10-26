import { loadPdfForEdit, savePdf } from "./load";

export type SignOptions = {
  /** 1-based page number */
  pageNumber: number;
  /** PNG or JPEG bytes */
  imageBytes: Uint8Array;
  imageType: "png" | "jpg";
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function addSignatureToPdf(
  pdfBytes: Uint8Array,
  options: SignOptions
): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(pdfBytes);
  const pageCount = doc.getPageCount();
  if (options.pageNumber < 1 || options.pageNumber > pageCount) {
    throw new Error(`Page must be between 1 and ${pageCount}.`);
  }

  const page = doc.getPage(options.pageNumber - 1);
  const image =
    options.imageType === "png"
      ? await doc.embedPng(options.imageBytes)
      : await doc.embedJpg(options.imageBytes);

  page.drawImage(image, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
  });

  return savePdf(doc);
}
