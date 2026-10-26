import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBlob } from "@/lib/downloadBlob";
import { fileToBytes } from "@/lib/pdf/download";
import { summarizePdf } from "@/lib/pdf/summarize";
import { translatePdfText } from "@/lib/pdf/translate";
import { useEffect, useState } from "react";

export default function AiTextTool({
  mode,
}: {
  mode: "summarizer" | "translate";
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [from, setFrom] = useState("en");
  const [to, setTo] = useState("ur");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`pdf:${mode}`);
  }, [addRecent, mode]);

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
      const out =
        mode === "summarizer"
          ? await summarizePdf(bytes)
          : await translatePdfText(bytes, from, to);
      setText(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      {mode === "translate" && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            From
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-[var(--gray-border)] px-3 py-2"
            >
              <option value="en">English</option>
              <option value="ur">Urdu</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="text-sm">
            To
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-[var(--gray-border)] px-3 py-2"
            >
              <option value="ur">Urdu</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
        </div>
      )}
      <p className="text-sm text-[var(--gray-muted)]">
        {mode === "summarizer"
          ? "Extractive summary from PDF text (runs locally in your browser)."
          : "Translates extracted text via a free public API (best for short docs)."}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : mode === "summarizer"
              ? "Summarize"
              : "Translate"}
        </button>
        {text && (
          <button
            type="button"
            onClick={() =>
              downloadBlob(
                new Blob([text], { type: "text/plain" }),
                mode === "summarizer" ? "summary.txt" : "translation.txt"
              )
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
