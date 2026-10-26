import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBlob } from "@/lib/downloadBlob";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  excelToPdf,
  htmlStringToPdf,
  pdfToExcel,
  pdfToMarkdown,
  pdfToPdfA,
  pdfToPowerPoint,
  pdfToWord,
  powerpointToPdf,
  wordToPdf,
} from "@/lib/pdf/officeConvert";
import { useEffect, useState } from "react";

type Slug =
  | "pdf-to-word"
  | "pdf-to-powerpoint"
  | "pdf-to-excel"
  | "word-to-pdf"
  | "powerpoint-to-pdf"
  | "excel-to-pdf"
  | "html-to-pdf"
  | "pdf-to-pdfa"
  | "pdf-to-markdown";

const accept: Record<Slug, string> = {
  "pdf-to-word": "application/pdf",
  "pdf-to-powerpoint": "application/pdf",
  "pdf-to-excel": "application/pdf",
  "pdf-to-pdfa": "application/pdf",
  "pdf-to-markdown": "application/pdf",
  "word-to-pdf":
    ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "powerpoint-to-pdf":
    ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "excel-to-pdf":
    ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "html-to-pdf": "",
};

export default function OfficeConvertTool({ slug }: { slug: Slug }) {
  const [files, setFiles] = useState<File[]>([]);
  const [html, setHtml] = useState("<h1>Hello</h1><p>Paste HTML here.</p>");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`pdf:${slug}`);
  }, [addRecent, slug]);

  const run = async () => {
    setError(null);
    if (slug !== "html-to-pdf" && !files[0]) {
      setError("Upload a file first.");
      return;
    }
    setBusy(true);
    try {
      if (slug === "html-to-pdf") {
        const out = await htmlStringToPdf(html);
        downloadBytes(out, "from-html.pdf");
        return;
      }
      const file = files[0];
      const bytes = await fileToBytes(file);

      switch (slug) {
        case "pdf-to-word":
          downloadBlob(await pdfToWord(bytes), "document.docx");
          break;
        case "pdf-to-excel":
          downloadBlob(await pdfToExcel(bytes), "tables.xlsx");
          break;
        case "pdf-to-powerpoint":
          downloadBlob(await pdfToPowerPoint(bytes), "slides.pptx");
          break;
        case "pdf-to-markdown": {
          const md = await pdfToMarkdown(bytes);
          downloadBlob(
            new Blob([md], { type: "text/markdown" }),
            "document.md"
          );
          break;
        }
        case "pdf-to-pdfa":
          downloadBytes(await pdfToPdfA(bytes), "archive.pdf");
          break;
        case "word-to-pdf":
          downloadBytes(await wordToPdf(file), "from-word.pdf");
          break;
        case "excel-to-pdf":
          downloadBytes(await excelToPdf(file), "from-excel.pdf");
          break;
        case "powerpoint-to-pdf":
          downloadBytes(await powerpointToPdf(file), "from-pptx.pdf");
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {slug === "html-to-pdf" ? (
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-[var(--gray-border)] px-3 py-2 font-mono text-sm"
        />
      ) : (
        <UploadZone
          files={files}
          onChange={setFiles}
          accept={accept[slug]}
          multiple={false}
        />
      )}
      <p className="text-sm text-[var(--gray-muted)]">
        Browser conversion — text layout is best-effort, not pixel-perfect
        Office fidelity.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Working…" : "Convert & download"}
      </button>
    </div>
  );
}
