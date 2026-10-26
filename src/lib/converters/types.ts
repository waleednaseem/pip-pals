export type ConverterCategory =
  | "length"
  | "area"
  | "fabric"
  | "currency"
  | "weight"
  | "temperature";

export type ConverterDef = {
  slug: string;
  title: string;
  description: string;
  category: ConverterCategory;
  fromUnit: string;
  toUnit: string;
  fromLabel: string;
  toLabel: string;
  /** Convert from → to */
  convert: (value: number) => number;
  /** Convert to → from (for swap) */
  convertInverse: (value: number) => number;
  featured?: boolean;
};
