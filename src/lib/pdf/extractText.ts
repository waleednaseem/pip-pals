import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ensurePdfjsPolyfills } from "./polyfills";

if (typeof window !== "undefined") {
  ensurePdfjsPolyfills();
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export async function extractTextFromPdf(bytes: Uint8Array): Promise<string> {
  ensurePdfjsPolyfills();
  if (typeof window !== "undefined") {
    GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  const copy = new Uint8Array(bytes);
  const loadingTask = getDocument({ data: copy });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(line.trim());
  }

  return parts.filter(Boolean).join("\n\n");
}
