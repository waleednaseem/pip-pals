import { PDFDocument } from "pdf-lib";
import { savePdf } from "./load";

export type MergeItem =
  | { kind: "pdf"; bytes: Uint8Array }
  | { kind: "image"; bytes: Uint8Array; type: "jpg" | "png" };

export async function mergePdfAndImages(items: MergeItem[]): Promise<Uint8Array> {
  if (!items.length) throw new Error("Add at least one PDF or image.");

  const out = await PDFDocument.create();

  for (const item of items) {
    if (item.kind === "pdf") {
      const src = await PDFDocument.load(item.bytes, {
        ignoreEncryption: true,
      });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } else {
      const embedded =
        item.type === "png"
          ? await out.embedPng(item.bytes)
          : await out.embedJpg(item.bytes);
      const page = out.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    }
  }

  return savePdf(out);
}
