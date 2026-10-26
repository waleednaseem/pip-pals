import { rgb } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type NewFormField = {
  name: string;
  type: "text" | "checkbox";
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function addFormFieldsToPdf(
  bytes: Uint8Array,
  fields: NewFormField[]
): Promise<Uint8Array> {
  if (!fields.length) throw new Error("Add at least one form field.");

  const doc = await loadPdfForEdit(bytes);
  const form = doc.getForm();
  const count = doc.getPageCount();

  for (const field of fields) {
    if (field.pageNumber < 1 || field.pageNumber > count) {
      throw new Error(`Invalid page for field "${field.name}".`);
    }
    const page = doc.getPage(field.pageNumber - 1);
    const name = field.name.trim() || `field_${Date.now()}`;

    if (field.type === "text") {
      const tf = form.createTextField(name);
      tf.addToPage(page, {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        borderWidth: 1,
        borderColor: rgb(0.05, 0.47, 0.34),
        backgroundColor: rgb(0.95, 1, 0.98),
      });
      tf.setFontSize(12);
    } else {
      const cb = form.createCheckBox(name);
      cb.addToPage(page, {
        x: field.x,
        y: field.y,
        width: Math.min(field.width, field.height),
        height: Math.min(field.width, field.height),
        borderWidth: 1,
        borderColor: rgb(0.05, 0.47, 0.34),
        backgroundColor: rgb(0.95, 1, 0.98),
      });
    }
  }

  return savePdf(doc);
}
