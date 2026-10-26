import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
};

export default function ToolShell({
  title,
  description,
  badge = "In-browser",
  children,
}: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-border)] bg-white p-6 shadow-[var(--shadow-md)]">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand)]">
          {badge}
        </span>
      </div>
      <p className="mb-6 text-[var(--gray-muted)]">{description}</p>
      {children}
    </div>
  );
}
