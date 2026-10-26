export type ToolFamily = "pdf" | "image" | "text" | "zip" | "other" | "convert";

export type CatalogTool = {
  slug: string;
  title: string;
  description: string;
  family: ToolFamily;
  href: string;
  icon: string;
  featured?: boolean;
};
