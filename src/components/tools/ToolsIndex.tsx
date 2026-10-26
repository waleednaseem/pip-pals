import ToolCard from "@/components/tools/ToolCard";
import type { ToolFamily } from "@/lib/tools/types";

type Item = {
  slug: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
};

export default function ToolsIndex({
  title,
  description,
  family,
  tools,
}: {
  title: string;
  description: string;
  family: ToolFamily;
  tools: Item[];
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-[var(--gray-muted)]">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard
            key={t.slug}
            href={t.href}
            title={t.title}
            description={t.description}
            badge={t.badge}
            family={family}
            icon={
              family === "image"
                ? "IMG"
                : family === "text"
                  ? "TXT"
                  : family === "zip"
                    ? "ZIP"
                    : "APP"
            }
            cta="Open →"
          />
        ))}
      </div>
    </main>
  );
}
