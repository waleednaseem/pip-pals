import RatesStrip from "@/components/home/RatesStrip";
import ToolCard from "@/components/tools/ToolCard";
import {
  familyLabels,
  getAllCatalogTools,
  getHomeSections,
} from "@/lib/catalog";
import type { ToolFamily } from "@/lib/tools/types";
import { Link } from "react-router-dom";
import { useMemo, useRef, useState } from "react";

const pills: Array<ToolFamily | "all"> = [
  "all",
  "pdf",
  "image",
  "text",
  "zip",
  "other",
  "convert",
];

const pillars = [
  { title: "Fast", body: "Quick results", tone: "bg-sky-100 text-sky-700" },
  {
    title: "Secure",
    body: "Files stay private",
    tone: "bg-emerald-100 text-emerald-700",
  },
  { title: "Free", body: "Always free", tone: "bg-violet-100 text-violet-700" },
];

export default function HomeExperience() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ToolFamily | "all">("all");
  const catalogRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => getAllCatalogTools(), []);
  const sections = useMemo(() => getHomeSections(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (family !== "all" && t.family !== family) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [all, family, query]);

  const searching = query.trim().length > 0 || family !== "all";

  const runSearch = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="border-b border-[var(--gray-border)] bg-white">
        <div className="mx-auto max-w-4xl px-4 pb-5 pt-10 text-center sm:pb-6 sm:pt-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand)]">
            File Studio
          </p>
          <h1 className="font-heading text-[1.85rem] font-extrabold tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.12]">
            Free Online Tools &amp; Utilities for Everyday Tasks
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-[var(--gray-muted)] sm:mt-4 sm:text-lg">
            All the tools you need, at your fingertips. 100% FREE and easy to use!
          </p>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-10 sm:pb-12">
          <div className="relative overflow-hidden rounded-[22px] border border-[var(--gray-border)] bg-gradient-to-br from-[#eef5ff] via-[#f8fbff] to-white px-4 py-7 shadow-[var(--shadow-md)] sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute -right-12 -top-8 h-44 w-44 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-[var(--brand-light)]/50 blur-3xl" />

            <div className="relative space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-muted)]">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runSearch();
                    }}
                    placeholder="Search tools... (e.g. PDF, Image, QR)"
                    className="w-full rounded-full border border-[var(--gray-border)] bg-white py-3.5 pl-10 pr-4 text-sm shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--brand)] focus:shadow-[var(--glow-primary)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={runSearch}
                  className="btn-primary px-8 py-3.5 text-sm"
                >
                  Search
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pills.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setFamily(id);
                      runSearch();
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                      family === id
                        ? "bg-[var(--brand)] text-white shadow-[var(--glow-primary)]"
                        : "border border-white/80 bg-white/80 text-[var(--text-secondary)] hover:border-[var(--brand)]/35 hover:text-[var(--brand)]"
                    }`}
                  >
                    {familyLabels[id]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-sky-100/80 pt-5 sm:gap-6">
                {pillars.map((p) => (
                  <div key={p.title} className="flex items-start gap-2.5 sm:items-center sm:justify-center sm:gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${p.tone}`}
                    >
                      {p.title[0]}
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="font-heading text-sm font-bold">{p.title}</p>
                      <p className="truncate text-[11px] text-[var(--gray-muted)] sm:text-xs">
                        {p.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pt-8">
        <RatesStrip />
      </div>

      <div ref={catalogRef} id="tools" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-10">
        {searching ? (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-extrabold tracking-tight">
                  {filtered.length} result{filtered.length === 1 ? "" : "s"}
                </h2>
                <p className="mt-1 text-sm text-[var(--gray-muted)]">
                  {query.trim()
                    ? `Matching “${query.trim()}”`
                    : `Category: ${familyLabels[family]}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFamily("all");
                }}
                className="text-sm font-semibold text-[var(--brand)] hover:underline"
              >
                Clear filters
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <ToolCard
                  key={`${t.family}-${t.slug}`}
                  href={t.href}
                  title={t.title}
                  description={t.description}
                  icon={t.icon}
                  family={t.family}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="rounded-[20px] border border-dashed border-[var(--gray-border)] bg-white px-6 py-14 text-center">
                <p className="font-heading text-lg font-bold">No tools found</p>
                <p className="mt-1 text-sm text-[var(--gray-muted)]">
                  Try another keyword or browse a category.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.family} id={section.family}>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <h2 className="font-heading text-2xl font-extrabold tracking-tight">
                    {section.title}
                  </h2>
                  <Link
                    to={section.href}
                    className="text-sm font-bold text-[var(--brand)] hover:underline"
                  >
                    See All ›
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.tools.map((t) => (
                    <ToolCard
                      key={t.slug}
                      href={t.href}
                      title={t.title}
                      description={t.description}
                      icon={t.icon}
                      family={t.family}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
