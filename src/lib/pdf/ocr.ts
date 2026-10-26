import Tesseract from "tesseract.js";
import { extractTextFromPdf } from "./extractText";
import { pdfPagesToJpegBlobs } from "./toJpg";

export async function ocrPdfToText(
  bytes: Uint8Array,
  maxPages = 5,
  onProgress?: (msg: string) => void
): Promise<string> {
  // Prefer embedded text when present
  try {
    const existing = await extractTextFromPdf(bytes);
    if (existing.trim().length > 40) {
      onProgress?.("Using embedded text from PDF.");
      return existing;
    }
  } catch {
    /* fall through to OCR */
  }

  const pages = await pdfPagesToJpegBlobs(bytes, 2);
  const limit = Math.min(pages.length, maxPages);
  const parts: string[] = [];

  for (let i = 0; i < limit; i++) {
    onProgress?.(`OCR page ${i + 1} of ${limit}…`);
    const { data } = await Tesseract.recognize(pages[i].blob, "eng");
    parts.push(data.text.trim());
  }

  if (pages.length > limit) {
    parts.push(`\n…(${pages.length - limit} more pages skipped)`);
  }

  return parts.filter(Boolean).join("\n\n") || "(No text recognized)";
}
