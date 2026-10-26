import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBlob } from "@/lib/downloadBlob";
import { fileToBytes } from "@/lib/pdf/download";
import { ocrPdfToText } from "@/lib/pdf/ocr";
import { useEffect, useState } from "react";

export default function OcrTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:ocr");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    setText("");
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await ocrPdfToText(bytes, 5, setStatus);
      setText(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <p className="text-sm text-[var(--gray-muted)]">
        Extracts embedded text when available, otherwise runs OCR on up to 5
        pages in your browser.
      </p>
      {status && <p className="text-sm text-[var(--brand-dark)]">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {busy ? "Running OCR…" : "Run OCR"}
        </button>
        {text && (
          <button
            type="button"
            onClick={() =>
              downloadBlob(new Blob([text], { type: "text/plain" }), "ocr.txt")
            }
            className="rounded-lg border border-[var(--gray-border)] px-5 py-2.5 text-sm font-medium"
          >
            Download .txt
          </button>
        )}
      </div>
      {text && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--gray-border)] bg-[var(--brand-soft)] p-3 text-sm whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  );
}
