import { describe, expect, it } from "vitest";
import { convertCurrency } from "./rates";
import { converters, getConverter } from "./registry";

describe("converter registry", () => {
  it("has unique slugs", () => {
    const slugs = converters.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes at least 12 converters", () => {
    expect(converters.length).toBeGreaterThanOrEqual(12);
  });

  it("converts km to mile roughly", () => {
    const c = getConverter("km-to-mile")!;
    expect(c.convert(1)).toBeCloseTo(0.621371, 5);
    expect(c.convertInverse(c.convert(10))).toBeCloseTo(10, 8);
  });

  it("converts m2 to ft2", () => {
    const c = getConverter("m2-to-ft2")!;
    expect(c.convert(1)).toBeCloseTo(10.7639, 3);
  });

  it("converts fabric m to yard", () => {
    const c = getConverter("m-to-yard")!;
    expect(c.convert(1)).toBeCloseTo(1.09361, 4);
  });

  it("converts C to F", () => {
    const c = getConverter("c-to-f")!;
    expect(c.convert(0)).toBe(32);
    expect(c.convert(100)).toBe(212);
    expect(c.convertInverse(32)).toBe(0);
  });

  it("converts kg to lb", () => {
    const c = getConverter("kg-to-lb")!;
    expect(c.convert(1)).toBeCloseTo(2.20462, 4);
  });
});

describe("currency rates", () => {
  it("converts USD to PKR and back", () => {
    const pkr = convertCurrency(1, "USD", "PKR");
    expect(pkr).toBeGreaterThan(200);
    expect(convertCurrency(pkr, "PKR", "USD")).toBeCloseTo(1, 8);
  });

  it("throws on unknown currency", () => {
    expect(() => convertCurrency(1, "USD", "XXX")).toThrow();
  });
});
