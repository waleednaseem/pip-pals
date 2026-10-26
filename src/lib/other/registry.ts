export type OtherToolDef = {
  slug: string;
  title: string;
  description: string;
  featured?: boolean;
};

export const otherTools: OtherToolDef[] = [
  {
    slug: "qr",
    title: "QR Code Generator",
    description: "Create downloadable QR codes instantly.",
    featured: true,
  },
  {
    slug: "password",
    title: "Password Generator",
    description: "Create strong secure passwords locally.",
    featured: true,
  },
  {
    slug: "color-extractor",
    title: "Color Extractor",
    description: "Extract color palettes from images.",
  },
  {
    slug: "barcode",
    title: "Barcode Generator",
    description: "Generate standard 1D barcodes.",
  },
];

export function getOtherTool(slug: string): OtherToolDef | undefined {
  return otherTools.find((t) => t.slug === slug);
}
