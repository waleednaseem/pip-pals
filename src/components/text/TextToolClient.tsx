import { useFavorites } from "@/context";
import { downloadText } from "@/lib/downloadBlob";
import type { TextToolDef } from "@/lib/text/registry";
import { useEffect, useMemo, useState } from "react";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export default function TextToolClient({ tool }: { tool: TextToolDef }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [paragraphs, setParagraphs] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`text:${tool.slug}`);
  }, [addRecent, tool.slug]);

  const stats = useMemo(() => {
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    return { chars: input.length, words };
  }, [input]);

  const transform = (kind: string) => {
    setError(null);
    switch (kind) {
      case "upper":
        setInput(input.toUpperCase());
        break;
      case "lower":
        setInput(input.toLowerCase());
        break;
      case "title":
        setInput(
          input.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        );
        break;
      case "reverse":
        setInput([...input].reverse().join(""));
        break;
    }
  };

  const runBase64 = () => {
    setError(null);
    try {
      if (mode === "encode") {
        setInput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setInput(decodeURIComponent(escape(atob(input))));
      }
    } catch {
      setError("Invalid Base64 input.");
    }
  };

  const generateLorem = () => {
    setInput(Array.from({ length: paragraphs }, () => LOREM).join("\n\n"));
  };

  return (
    <div className="space-y-4">
      {tool.slug === "transform" && (
        <div className="flex flex-wrap gap-2">
          {[
            ["upper", "UPPER"],
            ["lower", "lower"],
            ["title", "Title"],
            ["reverse", "Reverse"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => transform(k)}
              className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-sm font-medium text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tool.slug === "base64" && (
        <div className="flex gap-2">
          {(
            [
              ["encode", "To Base64"],
              ["decode", "From Base64"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                mode === m
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tool.slug === "lorem" && (
        <label className="block text-sm">
          Paragraphs
          <input
            type="number"
            min={1}
            max={20}
            value={paragraphs}
            onChange={(e) => setParagraphs(Number(e.target.value) || 1)}
            className="mt-1 w-32 rounded-lg border border-[var(--gray-border)] px-3 py-2"
          />
        </label>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste text…"
        className="h-48 w-full rounded-xl border border-[var(--gray-border)] p-3 text-sm outline-none ring-[var(--brand)] focus:ring-2"
      />

      {tool.slug === "transform" && (
        <p className="text-xs text-[var(--gray-muted)]">
          {stats.chars} characters · {stats.words} words
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {tool.slug === "base64" && (
          <button
            type="button"
            onClick={runBase64}
            className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            {mode === "encode" ? "Encode" : "Decode"}
          </button>
        )}
        {tool.slug === "lorem" && (
          <button
            type="button"
            onClick={generateLorem}
            className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            Generate
          </button>
        )}
        <button
          type="button"
          onClick={() => downloadText(input, `${tool.slug}.txt`)}
          disabled={!input}
          className="rounded-lg border border-[var(--gray-border)] px-5 py-2.5 text-sm font-semibold hover:border-[var(--brand)] disabled:opacity-50"
        >
          Download .txt
        </button>
      </div>
    </div>
  );
}
