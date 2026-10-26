import { useFavorites } from "@/context";
import { downloadBlob } from "@/lib/downloadBlob";
import type { ZipToolDef } from "@/lib/zip/registry";
import JSZip from "jszip";
import { useEffect, useRef, useState } from "react";

export default function ZipToolClient({ tool }: { tool: ZipToolDef }) {
  const [files, setFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`zip:${tool.slug}`);
  }, [addRecent, tool.slug]);

  const createZip = async () => {
    setError(null);
    if (!files.length) {
      setError("Add at least one file.");
      return;
    }
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const f of files) {
        zip.file(f.name, await f.arrayBuffer());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "archive.zip");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP create failed.");
    } finally {
      setBusy(false);
    }
  };

  const extractZip = async () => {
    setError(null);
    if (!zipFile) {
      setError("Upload a ZIP file.");
      return;
    }
    setBusy(true);
    try {
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
      const names: string[] = [];
      const tasks: Promise<void>[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir) return;
        names.push(path);
        tasks.push(
          entry.async("blob").then((blob) => {
            downloadBlob(blob, path.split("/").pop() || path);
          })
        );
      });
      setEntries(names);
      await Promise.all(tasks);
      if (!names.length) setError("ZIP is empty.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP extract failed.");
    } finally {
      setBusy(false);
    }
  };

  const isCreate = tool.slug === "create";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-[var(--brand-soft)] px-4 py-10 text-center hover:border-[var(--brand)]"
      >
        <span className="text-sm font-medium text-gray-800">
          {isCreate
            ? files.length
              ? `${files.length} file(s) selected`
              : "Drop files or click to browse"
            : zipFile
              ? zipFile.name
              : "Drop a ZIP or click to browse"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={isCreate}
        accept={isCreate ? undefined : ".zip,application/zip"}
        className="hidden"
        onChange={(e) => {
          const list = e.target.files ? Array.from(e.target.files) : [];
          if (isCreate) setFiles((prev) => [...prev, ...list]);
          else setZipFile(list[0] || null);
          e.target.value = "";
        }}
      />

      {isCreate && files.length > 0 && (
        <ul className="space-y-1 text-sm text-gray-600">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isCreate && entries.length > 0 && (
        <p className="text-sm text-[var(--gray-muted)]">
          Extracted: {entries.join(", ")}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={isCreate ? createZip : extractZip}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Working…" : isCreate ? "Create ZIP" : "Extract files"}
      </button>
    </div>
  );
}
