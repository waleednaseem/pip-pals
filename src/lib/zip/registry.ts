export type ZipToolDef = {
  slug: string;
  title: string;
  description: string;
  featured?: boolean;
};

export const zipTools: ZipToolDef[] = [
  {
    slug: "create",
    title: "ZIP Creator",
    description: "Compress files into a ZIP archive.",
    featured: true,
  },
  {
    slug: "extract",
    title: "ZIP Extractor",
    description: "Extract files from ZIP archives.",
    featured: true,
  },
];

export function getZipTool(slug: string): ZipToolDef | undefined {
  return zipTools.find((t) => t.slug === slug);
}
