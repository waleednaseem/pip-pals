import { describe, expect, it } from "vitest";
import { getAllCatalogTools, getHomeSections } from "./catalog";

describe("catalog", () => {
  it("includes new families", () => {
    const all = getAllCatalogTools();
    const families = new Set(all.map((t) => t.family));
    expect(families.has("image")).toBe(true);
    expect(families.has("text")).toBe(true);
    expect(families.has("zip")).toBe(true);
    expect(families.has("other")).toBe(true);
    expect(all.some((t) => t.slug === "merge-pdf-images")).toBe(true);
    expect(all.some((t) => t.slug === "extract-text")).toBe(true);
    expect(all.some((t) => t.slug === "qr")).toBe(true);
  });

  it("home sections non-empty", () => {
    const sections = getHomeSections();
    expect(sections.length).toBeGreaterThanOrEqual(5);
    sections.forEach((s) => expect(s.tools.length).toBeGreaterThan(0));
  });
});
