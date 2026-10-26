import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import { protectPdf } from "@/lib/pdf/protect";
import { useEffect, useState } from "react";

export default function ProtectTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:protect");
  }, [addRecent]);

  const run = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    if (!password.trim()) {
      setError("Enter a password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await protectPdf(bytes, password);
      downloadBytes(out, "protected.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to protect PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Open password"
            className="w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            className="w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
      </div>
      <p className="text-sm text-[var(--gray-muted)]">
        Encrypts the PDF with a password so it cannot be opened without it.
        Need to remove a password? Use Unlock PDF.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {busy ? "Protecting…" : "Protect & download"}
      </button>
    </div>
  );
}
