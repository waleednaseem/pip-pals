import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fillFormFields, listFormFields } from "./formFill";
import { mergePdfs } from "./merge";
import { pdfTools } from "./registry";
import { addSignatureToPdf } from "./sign";
import {
  extractPages,
  getPageCount,
  parsePageRanges,
  splitAllPages,
} from "./split";

async function makePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 350, size: 18, font });
  }
  return doc.save();
}

async function makeFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const form = doc.getForm();
  const name = form.createTextField("fullName");
  name.addToPage(page, { x: 50, y: 300, width: 200, height: 24 });
  const agree = form.createCheckBox("agree");
  agree.addToPage(page, { x: 50, y: 250, width: 16, height: 16 });
  return doc.save();
}

async function tinyPng(): Promise<Uint8Array> {
  // 1x1 red PNG
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

describe("parsePageRanges", () => {
  it("parses mixed ranges", () => {
    expect(parsePageRanges("1-3,5", 10)).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
    ]);
  });

  it("rejects out of bounds", () => {
    expect(() => parsePageRanges("1-9", 5)).toThrow();
  });
});

describe("mergePdfs", () => {
  it("merges page counts", async () => {
    const a = await makePdf(2);
    const b = await makePdf(3);
    const merged = await mergePdfs([a, b]);
    expect(await getPageCount(merged)).toBe(5);
  });

  it("throws when empty", async () => {
    await expect(mergePdfs([])).rejects.toThrow();
  });
});

describe("split", () => {
  it("extracts ranges", async () => {
    const src = await makePdf(5);
    const out = await extractPages(src, [{ start: 2, end: 4 }]);
    expect(await getPageCount(out)).toBe(3);
  });

  it("splits all pages", async () => {
    const src = await makePdf(3);
    const parts = await splitAllPages(src);
    expect(parts).toHaveLength(3);
    expect(await getPageCount(parts[0].bytes)).toBe(1);
  });
});

describe("sign", () => {
  it("embeds signature image", async () => {
    const pdf = await makePdf(1);
    const png = await tinyPng();
    const signed = await addSignatureToPdf(pdf, {
      pageNumber: 1,
      imageBytes: png,
      imageType: "png",
      x: 40,
      y: 40,
      width: 50,
      height: 20,
    });
    expect(await getPageCount(signed)).toBe(1);
    expect(signed.byteLength).toBeGreaterThan(pdf.byteLength);
  });
});

describe("form fill", () => {
  it("lists and fills fields", async () => {
    const pdf = await makeFormPdf();
    const fields = await listFormFields(pdf);
    expect(fields.some((f) => f.name === "fullName")).toBe(true);
    expect(fields.some((f) => f.name === "agree" && f.type === "checkbox")).toBe(
      true
    );

    const filled = await fillFormFields(
      pdf,
      { fullName: "Ada Lovelace", agree: "true" },
      true
    );
    expect(filled.byteLength).toBeGreaterThan(0);
  });
});

describe("pdf registry", () => {
  it("has unique slugs", () => {
    const slugs = pdfTools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("rotate & organize", () => {
  it("rotates pages", async () => {
    const { rotatePdfPages } = await import("./rotate");
    const src = await makePdf(2);
    const out = await rotatePdfPages(src, 90);
    expect(await getPageCount(out)).toBe(2);
  });

  it("reorders and deletes pages", async () => {
    const { reorderPdfPages, deletePdfPages } = await import("./organize");
    const src = await makePdf(3);
    const reordered = await reorderPdfPages(src, [3, 1, 2]);
    expect(await getPageCount(reordered)).toBe(3);
    const deleted = await deletePdfPages(src, [2]);
    expect(await getPageCount(deleted)).toBe(2);
  });
});

describe("watermark pageNumbers crop jpgToPdf", () => {
  it("adds watermark", async () => {
    const { addTextWatermark } = await import("./watermark");
    const src = await makePdf(1);
    const out = await addTextWatermark(src, "DRAFT");
    expect(out.byteLength).toBeGreaterThan(src.byteLength);
  });

  it("adds page numbers", async () => {
    const { addPageNumbers } = await import("./pageNumbers");
    const src = await makePdf(2);
    const out = await addPageNumbers(src, "bottom-center");
    expect(await getPageCount(out)).toBe(2);
  });

  it("crops margins", async () => {
    const { cropPdfMargins } = await import("./crop");
    const src = await makePdf(1);
    const out = await cropPdfMargins(src, {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    });
    expect(await getPageCount(out)).toBe(1);
  });

  it("builds pdf from png", async () => {
    const { imagesToPdf } = await import("./jpgToPdf");
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );
    const out = await imagesToPdf([{ bytes: png, type: "png" }]);
    expect(await getPageCount(out)).toBe(1);
  });
});

describe("create form + edit + esign", () => {
  it("adds form fields", async () => {
    const { addFormFieldsToPdf } = await import("./createForm");
    const src = await makePdf(1);
    const out = await addFormFieldsToPdf(src, [
      {
        name: "fullName",
        type: "text",
        pageNumber: 1,
        x: 40,
        y: 300,
        width: 160,
        height: 24,
      },
    ]);
    const fields = await listFormFields(out);
    expect(fields.some((f) => f.name === "fullName")).toBe(true);
  });

  it("applies text edits", async () => {
    const { applyEditsToPdf } = await import("./editPdf");
    const src = await makePdf(1);
    const out = await applyEditsToPdf(src, [
      { kind: "text", pageNumber: 1, x: 40, y: 200, text: "Hello", size: 14 },
    ]);
    expect(out.byteLength).toBeGreaterThan(src.byteLength);
  });

  it("builds esign request pdf", async () => {
    const { buildEsignRequestPdf } = await import("./esignRequest");
    const src = await makePdf(1);
    const { pdf, meta } = await buildEsignRequestPdf(src, {
      title: "Test",
      message: "Sign please",
      signers: [{ name: "Ada", email: "ada@example.com" }],
      slots: [
        {
          pageNumber: 1,
          x: 50,
          y: 80,
          width: 160,
          height: 40,
          signerIndex: 0,
        },
      ],
    });
    expect(meta.signers).toHaveLength(1);
    expect(await getPageCount(pdf)).toBe(2);
  });
});
