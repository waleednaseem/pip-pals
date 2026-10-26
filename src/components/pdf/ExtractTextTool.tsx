import { useFavorites } from "@/context";
import { downloadText } from "@/lib/downloadBlob";
import { fileToBytes } from "@/lib/pdf/download";
import { extractTextFromPdf } from "@/lib/pdf/extractText";
import { useEffect, useRef, useState } from "react";

export default function ExtractTextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:extract-text");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!file) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(file);
      const out = await extractTextFromPdf(bytes);
      setText(out || "(No extractable text found.)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extract failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-[var(--brand-soft)] px-4 py-10 text-center hover:border-[var(--brand)]"
      >
        <span className="text-sm font-medium text-gray-800">
          {file ? file.name : "Drop PDF here or click to browse"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          setText("");
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {busy ? "Extracting…" : "Extract text"}
        </button>
        {text && (
          <button
            type="button"
            onClick={() => downloadText(text, "extracted.txt")}
            className="rounded-lg border border-[var(--gray-border)] px-5 py-2.5 text-sm font-semibold hover:border-[var(--brand)]"
          >
            Download .txt
          </button>
        )}
      </div>
      {text && (
        <textarea
          readOnly
          value={text}
          className="h-56 w-full rounded-xl border border-[var(--gray-border)] bg-gray-50 p-3 text-sm"
        />
      )}
    </div>
  );
}
