import { PDFDocument } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type SplitRange = { start: number; end: number };

/** Parse ranges like "1-3,5,7-8" (1-based, inclusive). */
export function parsePageRanges(input: string, pageCount: number): SplitRange[] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter page ranges, e.g. 1-3,5");
  }

  const ranges: SplitRange[] = [];
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((x) => Number(x.trim()));
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) {
        throw new Error(`Invalid range: ${part}`);
      }
      if (b > pageCount) {
        throw new Error(`Page ${b} exceeds document (${pageCount} pages).`);
      }
      ranges.push({ start: a, end: b });
    } else {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        throw new Error(`Invalid page: ${part}`);
      }
      ranges.push({ start: n, end: n });
    }
  }

  return ranges;
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdfForEdit(bytes);
  return doc.getPageCount();
}

export async function extractPages(
  bytes: Uint8Array,
  ranges: SplitRange[]
): Promise<Uint8Array> {
  const src = await loadPdfForEdit(bytes);
  const out = await PDFDocument.create();
  const indices: number[] = [];

  for (const range of ranges) {
    for (let p = range.start; p <= range.end; p++) {
      indices.push(p - 1);
    }
  }

  const pages = await out.copyPages(src, indices);
  pages.forEach((page) => out.addPage(page));
  return savePdf(out);
}

export async function splitAllPages(
  bytes: Uint8Array
): Promise<{ index: number; bytes: Uint8Array }[]> {
  const src = await loadPdfForEdit(bytes);
  const count = src.getPageCount();
  const results: { index: number; bytes: Uint8Array }[] = [];

  for (let i = 0; i < count; i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({ index: i + 1, bytes: await savePdf(out) });
  }

  return results;
}
