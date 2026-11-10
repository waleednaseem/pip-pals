"use client";

import {
  ConvertIndexPage,
  ConvertToolPage,
  FamilyIndexPage,
  FamilyToolPage,
  MissingTool,
  PdfIndexPage,
  PdfToolPage,
  StudioHomePage,
} from "@/views/studio/StudioPages";
import type { ToolFamily } from "@/lib/tools/types";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

const families: ToolFamily[] = ["image", "text", "zip", "other"];

function StudioBody() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const parts = params.slug || [];

  useEffect(() => {
    if (parts[0] === "login") router.replace("/login");
    if (parts[0] === "signup") router.replace("/signup");
  }, [parts, router]);

  if (parts.length === 0) return <StudioHomePage />;
  if (parts[0] === "login" || parts[0] === "signup") return null;

  if (parts[0] === "pdf") {
    if (parts.length === 1) return <PdfIndexPage />;
    return <PdfToolPage slug={parts[1]} />;
  }

  if (parts[0] === "convert") {
    if (parts.length === 1) return <ConvertIndexPage />;
    return <ConvertToolPage slug={parts[1]} />;
  }

  if (families.includes(parts[0] as ToolFamily)) {
    const family = parts[0] as Exclude<ToolFamily, "pdf" | "convert">;
    if (parts.length === 1) return <FamilyIndexPage family={family} />;
    return <FamilyToolPage family={family} slug={parts[1]} />;
  }

  return <MissingTool />;
}

export default function StudioCatchAllPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading File Studio…
        </div>
      }
    >
      <StudioBody />
    </Suspense>
  );
}
