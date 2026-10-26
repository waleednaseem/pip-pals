import { PDFCheckBox, PDFTextField, PDFDropdown, PDFOptionList } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type FormFieldInfo = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "other";
  value: string;
  options?: string[];
};

export async function listFormFields(
  pdfBytes: Uint8Array
): Promise<FormFieldInfo[]> {
  const doc = await loadPdfForEdit(pdfBytes);
  let form;
  try {
    form = doc.getForm();
  } catch {
    throw new Error(
      "No standard AcroForm found. If this is an Acrobat XFA form, use File → Print → Microsoft Print to PDF, then upload again."
    );
  }

  const fields = form.getFields();
  if (!fields.length) {
    throw new Error(
      "No fillable fields found. Acrobat Reader static PDFs without form fields cannot be filled here — use Add Text or Sign instead."
    );
  }

  return fields.map((field) => {
    const name = field.getName();
    if (field instanceof PDFTextField) {
      return { name, type: "text" as const, value: field.getText() ?? "" };
    }
    if (field instanceof PDFCheckBox) {
      return {
        name,
        type: "checkbox" as const,
        value: field.isChecked() ? "true" : "false",
      };
    }
    if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      const options = field.getOptions();
      const selected = field.getSelected();
      return {
        name,
        type: "dropdown" as const,
        value: Array.isArray(selected) ? selected[0] ?? "" : selected ?? "",
        options,
      };
    }
    return { name, type: "other" as const, value: "" };
  });
}

export async function fillFormFields(
  pdfBytes: Uint8Array,
  values: Record<string, string>,
  flatten = true
): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(pdfBytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) {
        field.setText(value);
      } else if (field instanceof PDFCheckBox) {
        if (value === "true" || value === "1" || value === "yes") {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        if (value) field.select(value);
      }
    } catch {
      // Skip missing / unsupported fields
    }
  }

  if (flatten) {
    try {
      form.flatten();
    } catch {
      // Some Acrobat forms refuse flatten; still save filled values
    }
  }

  return savePdf(doc);
}
