import { rgb, StandardFonts } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type PageNumberPosition = "bottom-center" | "bottom-right" | "top-right";

export async function addPageNumbers(
  bytes: Uint8Array,
  position: PageNumberPosition = "bottom-center"
): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const label = `${i + 1} / ${total}`;
    const size = 10;
    const textWidth = font.widthOfTextAtSize(label, size);
    let x = (width - textWidth) / 2;
    let y = 24;
    if (position === "bottom-right") {
      x = width - textWidth - 24;
      y = 24;
    } else if (position === "top-right") {
      x = width - textWidth - 24;
      y = height - 28;
    }
    page.drawText(label, {
      x,
      y,
      size,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
  });

  return savePdf(doc);
}
