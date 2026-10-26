import { FX_TO_PKR } from "@/lib/converters/rates";

const DISPLAY = ["USD", "EUR", "GBP", "AED", "SAR"] as const;

export default function RatesStrip() {
  return (
    <div className="rounded-[16px] border border-[var(--gray-border)] bg-white p-3 shadow-[var(--shadow-sm)] sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="font-heading text-sm font-bold text-[var(--foreground)]">
          Today&apos;s PKR rates
        </p>
        <span className="text-[11px] text-[var(--gray-muted)]">Static · live later</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DISPLAY.map((code) => (
          <div
            key={code}
            className="min-w-[118px] shrink-0 rounded-xl bg-[var(--background)] px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-[var(--gray-muted)]">
              1 {code}
            </p>
            <p className="font-heading text-sm font-bold text-[var(--foreground)]">
              {FX_TO_PKR[code].toFixed(2)}{" "}
              <span className="text-xs font-semibold text-[var(--brand)]">PKR</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
