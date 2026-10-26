import { degrees } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type RotateAngle = 90 | 180 | 270;

export async function rotatePdfPages(
  bytes: Uint8Array,
  angle: RotateAngle,
  pageNumbers?: number[]
): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes);
  const count = doc.getPageCount();
  const targets =
    pageNumbers && pageNumbers.length
      ? pageNumbers
      : Array.from({ length: count }, (_, i) => i + 1);

  for (const n of targets) {
    if (n < 1 || n > count) {
      throw new Error(`Page ${n} is out of range (1–${count}).`);
    }
    const page = doc.getPage(n - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }

  return savePdf(doc);
}
