import CategoryPills from "@/components/tools/CategoryPills";
import ToolCard from "@/components/tools/ToolCard";
import {
  pdfCategories,
  pdfTools,
  type PdfToolCategory,
} from "@/lib/pdf/registry";
import { useMemo, useState } from "react";

export default function PdfToolsBrowser() {
  const [active, setActive] = useState<string>("all");

  const tools = useMemo(() => {
    if (active === "all") return pdfTools;
    return pdfTools.filter((t) => t.category === (active as PdfToolCategory));
  }, [active]);

  return (
    <div className="space-y-6">
      <CategoryPills
        pills={pdfCategories}
        active={active}
        onChange={setActive}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard
            key={t.slug}
            href={`/studio/pdf/${t.slug}`}
            title={t.title}
            description={t.description}
            badge={t.mode === "stub" ? "Soon" : undefined}
            icon="PDF"
            family="pdf"
          />
        ))}
      </div>
    </div>
  );
}
