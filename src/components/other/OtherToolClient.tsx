import { useFavorites } from "@/context";
import { downloadBlob, downloadText } from "@/lib/downloadBlob";
import { extractPalette } from "@/lib/image/ops";
import type { OtherToolDef } from "@/lib/other/registry";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

function randomPassword(length: number, symbols: boolean) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const sym = "!@#$%^&*-_=+";
  const pool = lower + upper + nums + (symbols ? sym : "");
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => pool[n % pool.length]).join("");
}

export default function OtherToolClient({ tool }: { tool: OtherToolDef }) {
  const [text, setText] = useState("https://example.com");
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [symbols, setSymbols] = useState(true);
  const [colors, setColors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useFavorites();

  useEffect(() => {
    addRecent(`other:${tool.slug}`);
  }, [addRecent, tool.slug]);

  useEffect(() => {
    if (tool.slug !== "qr" || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, text || " ", {
      width: 220,
      margin: 2,
      color: { dark: "#064e3b", light: "#ffffff" },
    }).catch(() => setError("Could not generate QR."));
  }, [text, tool.slug]);

  useEffect(() => {
    if (tool.slug !== "barcode" || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, text || "0", {
        format: "CODE128",
        displayValue: true,
        height: 80,
        margin: 8,
      });
      setError(null);
    } catch {
      setError("Invalid barcode value.");
    }
  }, [text, tool.slug]);

  const downloadQr = async () => {
    const url = await QRCode.toDataURL(text || " ", { width: 512, margin: 2 });
    const res = await fetch(url);
    downloadBlob(await res.blob(), "qrcode.png");
  };

  const downloadBarcode = () => {
    const svg = barcodeRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    downloadBlob(
      new Blob([xml], { type: "image/svg+xml" }),
      "barcode.svg"
    );
  };

  const runPalette = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      setColors(await extractPalette(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extract failed.");
    } finally {
      setBusy(false);
    }
  };

  if (tool.slug === "password") {
    return (
      <div className="space-y-4">
        <label className="block text-sm">
          Length ({length})
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={symbols}
            onChange={(e) => setSymbols(e.target.checked)}
          />
          Include symbols
        </label>
        <button
          type="button"
          onClick={() => setPassword(randomPassword(length, symbols))}
          className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          Generate
        </button>
        {password && (
          <div className="space-y-2">
            <code className="block break-all rounded-xl bg-gray-50 p-3 text-sm">
              {password}
            </code>
            <button
              type="button"
              onClick={() => downloadText(password, "password.txt")}
              className="rounded-lg border border-[var(--gray-border)] px-4 py-2 text-sm font-semibold"
            >
              Download
            </button>
          </div>
        )}
      </div>
    );
  }

  if (tool.slug === "color-extractor") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-[var(--brand-soft)] px-4 py-10 text-center hover:border-[var(--brand)]"
        >
          <span className="text-sm font-medium">
            {busy ? "Extracting…" : "Drop image or click to browse"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runPalette(f);
            e.target.value = "";
          }}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <div key={c} className="text-center text-xs">
              <div
                className="h-14 w-14 rounded-xl border border-[var(--gray-border)] shadow-sm"
                style={{ background: c }}
              />
              <p className="mt-1 font-mono">{c}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        {tool.slug === "qr" ? "URL or text" : "Barcode value"}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2"
        />
      </label>
      {tool.slug === "qr" && (
        <canvas ref={canvasRef} className="mx-auto rounded-xl border border-[var(--gray-border)] bg-white p-2" />
      )}
      {tool.slug === "barcode" && (
        <div className="overflow-x-auto rounded-xl border border-[var(--gray-border)] bg-white p-4">
          <svg ref={barcodeRef} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={tool.slug === "qr" ? downloadQr : downloadBarcode}
        className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Download
      </button>
    </div>
  );
}
