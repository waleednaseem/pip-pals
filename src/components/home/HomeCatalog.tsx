import ToolCard from "@/components/tools/ToolCard";
import { familyLabels, getAllCatalogTools, getHomeSections } from "@/lib/catalog";
import type { ToolFamily } from "@/lib/tools/types";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

const pills: Array<ToolFamily | "all"> = [
  "all",
  "pdf",
  "image",
  "text",
  "zip",
  "other",
  "convert",
];

export default function HomeCatalog() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ToolFamily | "all">("all");
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-10 overflow-hidden rounded-[20px] border border-[var(--gray-border)] bg-white p-4 shadow-[var(--shadow-md)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-muted)]">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools... (e.g. PDF, Image)"
              className="w-full rounded-full border border-[var(--gray-border)] bg-[var(--background)] py-3.5 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white focus:shadow-[var(--glow-primary)]"
            />
          </div>
          <button
            type="button"
            className="btn-primary px-7 py-3.5 text-sm"
            onClick={() => setFamily("all")}
          >
            Search
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {pills.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFamily(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                family === id
                  ? "bg-[var(--brand)] text-white shadow-[var(--glow-primary)]"
                  : "border border-[var(--gray-border)] bg-white text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)]"
              }`}
            >
              {familyLabels[id]}
            </button>
          ))}
        </div>
      </div>

      {searching ? (
        <section>
          <h2 className="font-heading mb-5 text-2xl font-extrabold tracking-tight">
            {filtered.length} tool{filtered.length === 1 ? "" : "s"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t) => (
              <ToolCard
                key={`${t.family}-${t.slug}`}
                href={t.href}
                title={t.title}
                description={t.description}
                icon={t.icon}
                family={t.family}
                cta="Open →"
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--gray-muted)]">
              No tools match your search.
            </p>
          )}
        </section>
      ) : (
        <div className="space-y-14">
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
                    cta="Open →"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
