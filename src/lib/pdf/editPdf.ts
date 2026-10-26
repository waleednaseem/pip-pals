import { rgb, StandardFonts } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type EditTextItem = {
  kind: "text";
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  size: number;
};

export type EditImageItem = {
  kind: "image";
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageBytes: Uint8Array;
  imageType: "png" | "jpg";
};

export type EditRectItem = {
  kind: "rect";
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EditStrokeItem = {
  kind: "stroke";
  pageNumber: number;
  /** PDF-space points */
  points: { x: number; y: number }[];
  lineWidth: number;
};

export type EditItem =
  | EditTextItem
  | EditImageItem
  | EditRectItem
  | EditStrokeItem;

export async function applyEditsToPdf(
  bytes: Uint8Array,
  edits: EditItem[]
): Promise<Uint8Array> {
  if (!edits.length) throw new Error("Add at least one edit before saving.");

  const doc = await loadPdfForEdit(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const count = doc.getPageCount();

  for (const edit of edits) {
    if (edit.pageNumber < 1 || edit.pageNumber > count) {
      throw new Error(`Edit references invalid page ${edit.pageNumber}.`);
    }
    const page = doc.getPage(edit.pageNumber - 1);

    if (edit.kind === "text") {
      page.drawText(edit.text, {
        x: edit.x,
        y: edit.y,
        size: edit.size,
        font,
        color: rgb(0.07, 0.07, 0.07),
      });
    } else if (edit.kind === "image") {
      const img =
        edit.imageType === "png"
          ? await doc.embedPng(edit.imageBytes)
          : await doc.embedJpg(edit.imageBytes);
      page.drawImage(img, {
        x: edit.x,
        y: edit.y,
        width: edit.width,
        height: edit.height,
      });
    } else if (edit.kind === "rect") {
      page.drawRectangle({
        x: edit.x,
        y: edit.y,
        width: edit.width,
        height: edit.height,
        borderColor: rgb(0.05, 0.47, 0.34),
        borderWidth: 2,
      });
    } else if (edit.kind === "stroke" && edit.points.length > 1) {
      for (let i = 1; i < edit.points.length; i++) {
        const a = edit.points[i - 1];
        const b = edit.points[i];
        page.drawLine({
          start: { x: a.x, y: a.y },
          end: { x: b.x, y: b.y },
          thickness: edit.lineWidth,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return savePdf(doc);
}
