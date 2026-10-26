import { rgb, degrees, StandardFonts } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export async function addTextWatermark(
  bytes: Uint8Array,
  text: string,
  opacity = 0.25
): Promise<Uint8Array> {
  const label = text.trim();
  if (!label) throw new Error("Enter watermark text.");

  const doc = await loadPdfForEdit(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(width, height) / 12;
    page.drawText(label, {
      x: width * 0.2,
      y: height * 0.45,
      size,
      font,
      color: rgb(0.2, 0.2, 0.2),
      opacity,
      rotate: degrees(35),
    });
  }

  return savePdf(doc);
}
