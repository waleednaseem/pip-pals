import UploadZone from "@/components/tools/UploadZone";
import { useFavorites } from "@/context";
import { downloadBytes, fileToBytes } from "@/lib/pdf/download";
import {
  fillFormFields,
  listFormFields,
  type FormFieldInfo,
} from "@/lib/pdf/formFill";
import { useEffect, useState } from "react";

export default function FillFormTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent("pdf:fill-form");
  }, [addRecent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setFields([]);
      setValues({});
      if (!files[0]) return;
      try {
        const bytes = await fileToBytes(files[0]);
        const listed = await listFormFields(bytes);
        if (cancelled) return;
        setFields(listed);
        const initial: Record<string, string> = {};
        listed.forEach((f) => {
          initial[f.name] = f.value;
        });
        setValues(initial);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read form fields.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const run = async () => {
    setError(null);
    if (!files[0]) {
      setError("Upload a PDF first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await fillFormFields(bytes, values, true);
      downloadBytes(out, "filled.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fill form.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone files={files} onChange={setFiles} />
      <p className="text-sm text-zinc-600">
        Supports Acrobat AcroForm fields (text, checkbox, dropdown). XFA-only forms need
        Print to PDF first.
      </p>
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1 block text-sm font-medium">{field.name}</span>
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={values[field.name] === "true"}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.name]: e.target.checked ? "true" : "false",
                    }))
                  }
                />
              ) : field.type === "dropdown" ? (
                <select
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                  disabled={field.type === "other"}
                />
              )}
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy || !fields.length}
        onClick={run}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Fill & download"}
      </button>
    </div>
  );
}
