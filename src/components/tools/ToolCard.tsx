import type { ToolFamily } from "@/lib/tools/types";
import { Link } from "react-router-dom";

type ToolCardProps = {
  href: string;
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  family?: ToolFamily;
  cta?: string;
};

const iconClass: Record<ToolFamily, string> = {
  pdf: "tool-card-icon-pdf",
  image: "tool-card-icon-image",
  text: "tool-card-icon-text",
  zip: "tool-card-icon-zip",
  other: "tool-card-icon-other",
  convert: "tool-card-icon-convert",
};

const surfaceClass: Record<ToolFamily, string> = {
  pdf: "tool-card-surface-pdf",
  image: "tool-card-surface-image",
  text: "tool-card-surface-text",
  zip: "tool-card-surface-zip",
  other: "tool-card-surface-other",
  convert: "tool-card-surface-convert",
};

export default function ToolCard({
  href,
  title,
  description,
  badge,
  icon = "PDF",
  family = "pdf",
  cta = "Open →",
}: ToolCardProps) {
  return (
    <Link
      to={href}
      className={`group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--gray-border)] p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-1 hover:border-[rgba(229,50,45,0.28)] hover:shadow-[var(--shadow-md)] ${surfaceClass[family]}`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-extrabold tracking-wide shadow-sm ${iconClass[family]}`}
        >
          {icon.slice(0, 3).toUpperCase()}
        </div>
        {badge && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-heading text-base font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--brand)]">
        {title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--gray-muted)]">
        {description}
      </p>
      <span className="mt-4 text-sm font-bold text-[var(--brand)] opacity-90 group-hover:opacity-100">
        {cta}
      </span>
    </Link>
  );
}
