import { useFavorites } from "@/context";
import { logConverterRun } from "@/lib/client/persist";
import { getConverter } from "@/lib/converters";
import { CURRENCY_CODES, convertCurrency } from "@/lib/converters/rates";
import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
};

function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number(n.toPrecision(12)).toString();
}

export default function ConverterForm({ slug }: Props) {
  const converter = getConverter(slug);
  const isMulti = slug === "multi-currency";
  const [searchParams, setSearchParams] = useSearchParams();
  const { addRecent, toggleFavorite, isFavorite } = useFavorites();

  const [fromCode, setFromCode] = useState(
    searchParams.get("from") || converter?.fromUnit || "USD"
  );
  const [toCode, setToCode] = useState(
    searchParams.get("to") || converter?.toUnit || "PKR"
  );
  const [value, setValue] = useState(searchParams.get("v") || "1");
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    addRecent(`convert:${slug}`);
  }, [addRecent, slug]);

  const numeric = Number(value);
  const result = useMemo(() => {
    if (!converter || value === "" || Number.isNaN(numeric)) return "";
    if (isMulti) {
      try {
        return formatResult(convertCurrency(numeric, fromCode, toCode));
      } catch {
        return "";
      }
    }
    return formatResult(
      swapped ? converter.convertInverse(numeric) : converter.convert(numeric)
    );
  }, [value, numeric, isMulti, fromCode, toCode, swapped, converter]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      logConverterRun({
        slug,
        title: converter?.title,
        input: numeric,
        output: result,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [result, slug, numeric, converter?.title]);

  const syncUrl = useCallback(
    (next: { v?: string; from?: string; to?: string }) => {
      const params = new URLSearchParams(searchParams);
      if (next.v != null) params.set("v", next.v);
      if (next.from != null) params.set("from", next.from);
      if (next.to != null) params.set("to", next.to);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  if (!converter) {
    return <p className="text-red-600">Converter not found.</p>;
  }

  const handleValue = (v: string) => {
    setValue(v);
    syncUrl({ v, from: fromCode, to: toCode });
  };

  const handleSwap = () => {
    if (isMulti) {
      setFromCode(toCode);
      setToCode(fromCode);
      syncUrl({ v: value, from: toCode, to: fromCode });
      return;
    }
    setSwapped((s) => !s);
    if (result !== "") {
      setValue(result);
      syncUrl({ v: result });
    }
  };

  const fromLabel = isMulti
    ? fromCode
    : swapped
      ? converter.toLabel
      : converter.fromLabel;
  const toLabel = isMulti
    ? toCode
    : swapped
      ? converter.fromLabel
      : converter.toLabel;
  const fromUnit = isMulti
    ? fromCode
    : swapped
      ? converter.toUnit
      : converter.fromUnit;
  const toUnit = isMulti
    ? toCode
    : swapped
      ? converter.fromUnit
      : converter.toUnit;

  const favId = `convert:${slug}`;

  return (
    <div className="rounded-[16px] border border-[var(--gray-border)] bg-white p-6 shadow-[var(--shadow-md)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          {converter.title}
        </h1>
        <button
          type="button"
          onClick={() => toggleFavorite(favId)}
          className="rounded-full border border-[var(--gray-border)] px-3.5 py-1.5 text-sm font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]"
          aria-pressed={isFavorite(favId)}
        >
          {isFavorite(favId) ? "★ Saved" : "☆ Save"}
        </button>
      </div>
      <p className="mb-6 text-[var(--gray-muted)]">{converter.description}</p>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[var(--text-secondary)]">
            {fromLabel} ({fromUnit})
          </span>
          {isMulti && (
            <select
              className="mb-2 w-full rounded-xl border border-[var(--gray-border)] px-3 py-2.5 outline-none focus:border-[var(--brand)]"
              value={fromCode}
              onChange={(e) => {
                setFromCode(e.target.value);
                syncUrl({ v: value, from: e.target.value, to: toCode });
              }}
            >
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            inputMode="decimal"
            className="w-full rounded-xl border border-[var(--gray-border)] px-3 py-3 text-lg outline-none focus:border-[var(--brand)] focus:shadow-[var(--glow-primary)]"
            value={value}
            onChange={(e) => handleValue(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={handleSwap}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gray-border)] bg-[var(--background)] text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          aria-label="Swap units"
        >
          ⇄
        </button>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[var(--text-secondary)]">
            {toLabel} ({toUnit})
          </span>
          {isMulti && (
            <select
              className="mb-2 w-full rounded-xl border border-[var(--gray-border)] px-3 py-2.5 outline-none focus:border-[var(--brand)]"
              value={toCode}
              onChange={(e) => {
                setToCode(e.target.value);
                syncUrl({ v: value, from: fromCode, to: e.target.value });
              }}
            >
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            readOnly
            className="w-full rounded-xl border border-[var(--gray-border)] bg-[var(--background)] px-3 py-3 text-lg font-semibold text-[var(--brand-dark)]"
            value={result}
          />
        </label>
      </div>
    </div>
  );
}
