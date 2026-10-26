import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { queuePdfJob } from "@/lib/client/persist";
import { useEffect, useState } from "react";

type Props = {
  slug?: string;
  title?: string;
};

export default function StubTool({ slug = "unknown", title }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`pdf:${slug}`);
  }, [addRecent, slug]);

  const queue = async () => {
    setError(null);
    if (!files.length) {
      setError("Upload at least one file first.");
      return;
    }
    setBusy(true);
    try {
      const data = await queuePdfJob({
        slug,
        title: title || slug,
        status: "queued",
        note: "Queued for server processing when API is ready.",
        files: files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || "application/octet-stream",
        })),
      });
      if (!data?.ok || !data.id) {
        setError("Could not save this job.");
        return;
      }
      setJobId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        This tool stays on this device. File names and sizes are not sent to the database.
      </div>
      <UploadZone files={files} onChange={setFiles} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {jobId && (
        <p className="rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand-dark)]">
          Saved on this device — job id: {jobId}
        </p>
      )}
      <button
        type="button"
        disabled={busy || !files.length}
        onClick={queue}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save job on this device"}
      </button>
    </div>
  );
}
