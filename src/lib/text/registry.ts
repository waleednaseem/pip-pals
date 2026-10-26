export type TextToolDef = {
  slug: string;
  title: string;
  description: string;
  featured?: boolean;
};

export const textTools: TextToolDef[] = [
  {
    slug: "transform",
    title: "Text Transform",
    description: "Convert case, reverse text, and count words.",
    featured: true,
  },
  {
    slug: "base64",
    title: "Base64 Encoder",
    description: "Encode and decode Base64 data in your browser.",
    featured: true,
  },
  {
    slug: "lorem",
    title: "Lorem Ipsum",
    description: "Generate placeholder text for layouts.",
  },
];

export function getTextTool(slug: string): TextToolDef | undefined {
  return textTools.find((t) => t.slug === slug);
}
