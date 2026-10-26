import { Link } from "react-router-dom";

type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[var(--gray-muted)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-40">/</span>}
              {item.href && !last ? (
                <Link
                  to={item.href}
                  className="font-medium hover:text-[var(--brand)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "font-semibold text-[var(--foreground)]" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
