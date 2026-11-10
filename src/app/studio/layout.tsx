"use client";

import { StudioFrame } from "@/views/studio/StudioFrame";
import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFrame>{children}</StudioFrame>;
}
