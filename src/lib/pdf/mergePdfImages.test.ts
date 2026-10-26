import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { mergePdfAndImages } from "./mergePdfImages";

async function tinyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return doc.save();
}

describe("mergePdfAndImages", () => {
  it("merges pdf pages", async () => {
    const a = await tinyPdf();
    const b = await tinyPdf();
    const out = await mergePdfAndImages([
      { kind: "pdf", bytes: a },
      { kind: "pdf", bytes: b },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });
});
