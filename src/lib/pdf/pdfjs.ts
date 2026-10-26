import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { ensurePdfjsPolyfills } from "./polyfills";

let workerReady = false;

export function ensurePdfjsWorker() {
  ensurePdfjsPolyfills();
  if (workerReady || typeof window === "undefined") return;
  // Legacy worker includes runtime polyfills (toHex, etc.)
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerReady = true;
}

export async function loadPdfDocument(
  data: Uint8Array
): Promise<PDFDocumentProxy> {
  ensurePdfjsWorker();
  const copy = Uint8Array.from(data);
  const loadingTask = getDocument({ data: copy });
  return loadingTask.promise;
}
