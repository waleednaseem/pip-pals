import { Link } from "react-router-dom";
import { useState } from "react";

type MegaLink = {
  label: string;
  href: string;
  tone: "jpg" | "word" | "ppt" | "excel" | "html" | "pdfa";
  arrow?: "up" | "down";
};

const convertToPdf: MegaLink[] = [
  { label: "JPG to PDF", href: "/studio/pdf/jpg-to-pdf", tone: "jpg", arrow: "down" },
  { label: "WORD to PDF", href: "/studio/pdf/word-to-pdf", tone: "word", arrow: "down" },
  { label: "POWERPOINT to PDF", href: "/studio/pdf/powerpoint-to-pdf", tone: "ppt", arrow: "down" },
  { label: "EXCEL to PDF", href: "/studio/pdf/excel-to-pdf", tone: "excel", arrow: "down" },
  { label: "HTML to PDF", href: "/studio/pdf/html-to-pdf", tone: "html", arrow: "down" },
];

const convertFromPdf: MegaLink[] = [
  { label: "PDF to JPG", href: "/studio/pdf/pdf-to-jpg", tone: "jpg", arrow: "up" },
  { label: "PDF to WORD", href: "/studio/pdf/pdf-to-word", tone: "word", arrow: "up" },
  { label: "PDF to POWERPOINT", href: "/studio/pdf/pdf-to-powerpoint", tone: "ppt", arrow: "up" },
  { label: "PDF to EXCEL", href: "/studio/pdf/pdf-to-excel", tone: "excel", arrow: "up" },
  { label: "PDF to PDF/A", href: "/studio/pdf/pdf-to-pdfa", tone: "pdfa", arrow: "up" },
];

const allToolsGroups: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Organize",
    items: [
      { label: "Merge PDF", href: "/studio/pdf/merge" },
      { label: "Split PDF", href: "/studio/pdf/split" },
      { label: "Compress PDF", href: "/studio/pdf/compress" },
      { label: "Organize PDF", href: "/studio/pdf/organize" },
      { label: "Rotate PDF", href: "/studio/pdf/rotate" },
      { label: "Repair PDF", href: "/studio/pdf/repair" },
    ],
  },
  {
    title: "Edit & Security",
    items: [
      { label: "Edit PDF", href: "/studio/pdf/edit" },
      { label: "Sign PDF", href: "/studio/pdf/sign" },
      { label: "Watermark", href: "/studio/pdf/watermark" },
      { label: "Protect PDF", href: "/studio/pdf/protect" },
      { label: "Unlock PDF", href: "/studio/pdf/unlock" },
      { label: "Redact PDF", href: "/studio/pdf/redact" },
    ],
  },
  {
    title: "More tools",
    items: [
      { label: "Image tools", href: "/studio/image" },
      { label: "Text tools", href: "/studio/text" },
      { label: "ZIP tools", href: "/studio/zip" },
      { label: "Other tools", href: "/studio/other" },
      { label: "Converters", href: "/studio/convert" },
      { label: "All PDF tools", href: "/studio/pdf" },
    ],
  },
];

const toneClass: Record<MegaLink["tone"], string> = {
  jpg: "bg-[#f5c518]",
  word: "bg-[#2b579a]",
  ppt: "bg-[#c43e1c]",
  excel: "bg-[#217346]",
  html: "bg-[#e8a317]",
  pdfa: "bg-[#3b82f6]",
};

function ToolIcon({ tone, arrow }: { tone: MegaLink["tone"]; arrow?: "up" | "down" }) {
  const letter =
    tone === "word"
      ? "W"
      : tone === "ppt"
        ? "P"
        : tone === "excel"
          ? "X"
          : tone === "pdfa"
            ? "/A"
            : tone === "html"
              ? "◎"
              : "▣";

  return (
    <span
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white shadow-sm ${toneClass[tone]}`}
    >
      {letter}
      {arrow && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] font-black text-[var(--foreground)] shadow">
          {arrow === "down" ? "↓" : "↑"}
        </span>
      )}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="ml-1.5 transition-transform duration-150 group-hover:rotate-180 group-hover:text-[var(--brand)] group-focus-within:rotate-180 group-focus-within:text-[var(--brand)]"
      aria-hidden
    >
      <path
        d="M2 3.5 L5 6.5 L8 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WaffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}-${c}`} cx={3 + c * 6} cy={3 + r * 6} r="1.35" fill="currentColor" />
        ))
      )}
    </svg>
  );
}

const navBtn =
  "inline-flex items-center whitespace-nowrap px-2.5 py-2 text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--foreground)] transition-colors hover:text-[var(--brand)] group-hover:text-[var(--brand)] group-focus-within:text-[var(--brand)]";

const panel =
  "invisible absolute top-full z-[60] pt-3 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-[var(--gray-border)] bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:gap-5">
        <Link to="/studio" className="flex shrink-0 items-center gap-2" aria-label="File Studio home">
          <span className="relative flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 rounded-[10px] bg-[var(--brand)]" />
            <span className="relative text-[15px] leading-none text-white">♥</span>
            <span className="absolute inset-[7px] rounded-[3px] border border-white/90" />
          </span>
          <span className="font-heading text-[1.35rem] font-extrabold tracking-tight">
            <span className="text-[var(--foreground)]">File</span>
            <span className="text-[var(--brand)]">Studio</span>
          </span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
          <Link to="/studio/pdf/merge" className={navBtn}>
            Merge PDF
          </Link>
          <Link to="/studio/pdf/split" className={navBtn}>
            Split PDF
          </Link>
          <Link to="/studio/pdf/compress" className={navBtn}>
            Compress PDF
          </Link>

          <div className="group relative">
            <button type="button" className={navBtn} aria-haspopup="true">
              Convert PDF
              <Chevron />
            </button>
            <div className={`${panel} left-1/2 w-[560px] -translate-x-1/2`}>
              <div className="relative rounded-2xl border border-[var(--gray-border)] bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
                <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-[var(--gray-border)] bg-white" />
                <div className="relative grid grid-cols-2 gap-6">
                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gray-muted)]">
                      Convert to PDF
                    </p>
                    <ul className="space-y-1">
                      {convertToPdf.map((item) => (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[var(--brand-soft)]"
                          >
                            <ToolIcon tone={item.tone} arrow={item.arrow} />
                            <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--foreground)]">
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gray-muted)]">
                      Convert from PDF
                    </p>
                    <ul className="space-y-1">
                      {convertFromPdf.map((item) => (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[var(--brand-soft)]"
                          >
                            <ToolIcon tone={item.tone} arrow={item.arrow} />
                            <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--foreground)]">
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <button type="button" className={navBtn} aria-haspopup="true">
              All PDF Tools
              <Chevron />
            </button>
            <div className={`${panel} left-1/2 w-[640px] -translate-x-1/2`}>
              <div className="relative rounded-2xl border border-[var(--gray-border)] bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
                <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-[var(--gray-border)] bg-white" />
                <div className="relative grid grid-cols-3 gap-5">
                  {allToolsGroups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gray-muted)]">
                        {group.title}
                      </p>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              className="block rounded-lg px-2 py-2 text-[13px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="hidden px-2 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--brand)] sm:inline-flex sm:items-center"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="hidden items-center justify-center rounded-[6px] bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--brand-dark)] sm:inline-flex"
          >
            Sign up
          </Link>

          <div className="group relative hidden lg:block">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] group-hover:bg-[var(--brand-soft)] group-hover:text-[var(--brand)]"
              aria-label="More products"
            >
              <WaffleIcon />
            </button>
            <div className={`${panel} right-0 w-56`}>
              <div className="rounded-2xl border border-[var(--gray-border)] bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
                {[
                  { label: "Image Tools", href: "/studio/image" },
                  { label: "Text Tools", href: "/studio/text" },
                  { label: "ZIP Tools", href: "/studio/zip" },
                  { label: "Other Tools", href: "/studio/other" },
                  { label: "Converters", href: "/studio/convert" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--gray-border)] lg:hidden"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="text-lg">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-[var(--gray-border)] bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {[
              { label: "Merge PDF", href: "/studio/pdf/merge" },
              { label: "Split PDF", href: "/studio/pdf/split" },
              { label: "Compress PDF", href: "/studio/pdf/compress" },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-bold uppercase"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <p className="mt-3 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gray-muted)]">
              Convert to PDF
            </p>
            {convertToPdf.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <ToolIcon tone={item.tone} arrow={item.arrow} />
                {item.label}
              </Link>
            ))}

            <p className="mt-3 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gray-muted)]">
              Convert from PDF
            </p>
            {convertFromPdf.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <ToolIcon tone={item.tone} arrow={item.arrow} />
                {item.label}
              </Link>
            ))}

            <Link
              to="/studio/pdf"
              className="mt-3 rounded-xl px-3 py-2.5 text-sm font-bold uppercase text-[var(--brand)]"
              onClick={() => setMobileOpen(false)}
            >
              All PDF Tools
            </Link>

            <div className="mt-4 flex gap-2 px-3">
              <Link
                to="/login"
                className="flex flex-1 items-center justify-center rounded-[6px] border border-[var(--gray-border)] py-2.5 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="flex flex-1 items-center justify-center rounded-[6px] bg-[var(--brand)] py-2.5 text-sm font-bold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
