import type { ConverterDef } from "./types";
import { convertCurrency } from "./rates";

const KM_TO_MILE = 0.621371192;
const M_TO_FT = 3.280839895;
const CM_TO_INCH = 0.3937007874;
const M2_TO_FT2 = 10.76391042;
const ACRE_TO_HECTARE = 0.404685642;
const M_TO_YARD = 1.093613298;
const KG_TO_LB = 2.204622622;

function pair(
  slug: string,
  title: string,
  description: string,
  category: ConverterDef["category"],
  fromUnit: string,
  toUnit: string,
  fromLabel: string,
  toLabel: string,
  factor: number,
  featured = false
): ConverterDef {
  return {
    slug,
    title,
    description,
    category,
    fromUnit,
    toUnit,
    fromLabel,
    toLabel,
    convert: (v) => v * factor,
    convertInverse: (v) => v / factor,
    featured,
  };
}

export const converters: ConverterDef[] = [
  pair(
    "km-to-mile",
    "Kilometers to Miles",
    "Convert kilometers to miles instantly.",
    "length",
    "km",
    "mi",
    "Kilometers",
    "Miles",
    KM_TO_MILE,
    true
  ),
  pair(
    "m-to-ft",
    "Meters to Feet",
    "Convert meters to feet for distance and height.",
    "length",
    "m",
    "ft",
    "Meters",
    "Feet",
    M_TO_FT,
    true
  ),
  pair(
    "cm-to-inch",
    "Centimeters to Inches",
    "Convert centimeters to inches.",
    "length",
    "cm",
    "in",
    "Centimeters",
    "Inches",
    CM_TO_INCH,
    true
  ),
  pair(
    "m2-to-ft2",
    "Square Meters to Square Feet",
    "House and floor area: square meters to square feet.",
    "area",
    "m²",
    "ft²",
    "Square meters",
    "Square feet",
    M2_TO_FT2,
    true
  ),
  pair(
    "acre-to-hectare",
    "Acres to Hectares",
    "Convert acres to hectares for land area.",
    "area",
    "acre",
    "ha",
    "Acres",
    "Hectares",
    ACRE_TO_HECTARE
  ),
  pair(
    "m-to-yard",
    "Meters to Yards (Fabric)",
    "Clothes and fabric length: meters to yards.",
    "fabric",
    "m",
    "yd",
    "Meters",
    "Yards",
    M_TO_YARD,
    true
  ),
  pair(
    "fabric-cm-to-inch",
    "Fabric cm to Inches",
    "Cloth measurement: centimeters to inches.",
    "fabric",
    "cm",
    "in",
    "Centimeters",
    "Inches",
    CM_TO_INCH
  ),
  pair(
    "cloth-m-to-ft",
    "Cloth Meters to Feet",
    "Fabric length: meters to feet.",
    "fabric",
    "m",
    "ft",
    "Meters",
    "Feet",
    M_TO_FT
  ),
  {
    slug: "usd-to-pkr",
    title: "USD to PKR",
    description: "Convert US Dollars to Pakistani Rupees.",
    category: "currency",
    fromUnit: "USD",
    toUnit: "PKR",
    fromLabel: "US Dollar",
    toLabel: "Pakistani Rupee",
    convert: (v) => convertCurrency(v, "USD", "PKR"),
    convertInverse: (v) => convertCurrency(v, "PKR", "USD"),
    featured: true,
  },
  {
    slug: "eur-to-pkr",
    title: "EUR to PKR",
    description: "Convert Euros to Pakistani Rupees.",
    category: "currency",
    fromUnit: "EUR",
    toUnit: "PKR",
    fromLabel: "Euro",
    toLabel: "Pakistani Rupee",
    convert: (v) => convertCurrency(v, "EUR", "PKR"),
    convertInverse: (v) => convertCurrency(v, "PKR", "EUR"),
    featured: true,
  },
  {
    slug: "gbp-to-pkr",
    title: "GBP to PKR",
    description: "Convert British Pounds to Pakistani Rupees.",
    category: "currency",
    fromUnit: "GBP",
    toUnit: "PKR",
    fromLabel: "British Pound",
    toLabel: "Pakistani Rupee",
    convert: (v) => convertCurrency(v, "GBP", "PKR"),
    convertInverse: (v) => convertCurrency(v, "PKR", "GBP"),
  },
  {
    slug: "multi-currency",
    title: "Multi Currency Converter",
    description: "Convert between multiple currencies using static rates.",
    category: "currency",
    fromUnit: "USD",
    toUnit: "PKR",
    fromLabel: "From",
    toLabel: "To",
    convert: (v) => convertCurrency(v, "USD", "PKR"),
    convertInverse: (v) => convertCurrency(v, "PKR", "USD"),
    featured: true,
  },
  pair(
    "kg-to-lb",
    "Kilograms to Pounds",
    "Convert kilograms to pounds.",
    "weight",
    "kg",
    "lb",
    "Kilograms",
    "Pounds",
    KG_TO_LB,
    true
  ),
  {
    slug: "c-to-f",
    title: "Celsius to Fahrenheit",
    description: "Convert temperature from Celsius to Fahrenheit.",
    category: "temperature",
    fromUnit: "°C",
    toUnit: "°F",
    fromLabel: "Celsius",
    toLabel: "Fahrenheit",
    convert: (v) => (v * 9) / 5 + 32,
    convertInverse: (v) => ((v - 32) * 5) / 9,
    featured: true,
  },
];

export function getConverter(slug: string): ConverterDef | undefined {
  return converters.find((c) => c.slug === slug);
}

export function getFeaturedConverters(): ConverterDef[] {
  return converters.filter((c) => c.featured);
}

export function getConvertersByCategory(
  category: ConverterDef["category"]
): ConverterDef[] {
  return converters.filter((c) => c.category === category);
}

export function getRelatedConverters(slug: string, limit = 4): ConverterDef[] {
  const current = getConverter(slug);
  if (!current) return [];
  return converters
    .filter((c) => c.slug !== slug && c.category === current.category)
    .slice(0, limit);
}
