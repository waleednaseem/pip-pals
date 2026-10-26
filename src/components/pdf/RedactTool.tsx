import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { redactFullPages, redactPdfBands } from "@/lib/pdf/redact";
import { useEffect, useState } from "react";

export default function RedactTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"header" | "footer" | "pages">("header");
  const [pages, setPages] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:redact");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      let out: Uint8Array;
      if (mode === "pages") {
        const nums = pages
          .split(/[, ]+/)
          .map((n) => Number(n.trim()))
          .filter((n) => n > 0);
        if (!nums.length) throw new Error("Enter page numbers, e.g. 1,2,5");
        out = await redactFullPages(bytes, nums);
      } else if (mode === "header") {
        out = await redactPdfBands(bytes, [{ top: 0, height: 0.12 }]);
      } else {
        out = await redactPdfBands(bytes, [{ top: 0.88, height: 0.12 }]);
      }
      downloadBytes(out, "redacted.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redact failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["header", "Black out header"],
            ["footer", "Black out footer"],
            ["pages", "Black out pages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              mode === id
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "pages" && (
        <label className="block text-sm">
          Page numbers
          <input
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
            placeholder="1, 2, 5"
          />
        </label>
      )}
      <p className="text-sm text-[var(--gray-muted)]">
        Covers areas with solid black. For legal redaction, also remove underlying
        text with a dedicated workflow when available.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Redacting…" : "Redact & download"}
      </button>
    </div>
  );
}
