import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { fileToBytes } from "@/lib/pdf/download";
import { extractTextFromPdf } from "@/lib/pdf/extractText";
import { useEffect, useState } from "react";

export default function CompareTool() {
  const [left, setLeft] = useState<File[]>([]);
  const [right, setRight] = useState<File[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:compare");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!left[0] || !right[0]) {
      setError("Upload both PDFs.");
      return;
    }
    setBusy(true);
    try {
      const [ta, tb] = await Promise.all([
        extractTextFromPdf(await fileToBytes(left[0])),
        extractTextFromPdf(await fileToBytes(right[0])),
      ]);
      setA(ta || "(empty)");
      setB(tb || "(empty)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Document A</p>
          <UploadZone files={left} onChange={setLeft} multiple={false} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Document B</p>
          <UploadZone files={right} onChange={setRight} multiple={false} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Comparing…" : "Compare text"}
      </button>
      {(a || b) && (
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--gray-border)] bg-[var(--brand-soft)] p-3 text-xs whitespace-pre-wrap">
            {a}
          </pre>
          <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--gray-border)] bg-[var(--brand-soft)] p-3 text-xs whitespace-pre-wrap">
            {b}
          </pre>
        </div>
      )}
    </div>
  );
}
