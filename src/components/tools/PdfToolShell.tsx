import type { PdfToolDef } from "@/lib/pdf/registry";
import type { ReactNode } from "react";

type Props = {
  tool: PdfToolDef;
  children: ReactNode;
};

export default function PdfToolShell({ tool, children }: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-border)] bg-white p-6 shadow-[var(--shadow-md)]">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          {tool.title}
        </h1>
        {tool.mode === "stub" && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Coming soon
          </span>
        )}
        {tool.mode === "client" && (
          <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand)]">
            In-browser
          </span>
        )}
      </div>
      <p className="mb-6 text-[var(--gray-muted)]">{tool.description}</p>
      {children}
    </div>
  );
}
