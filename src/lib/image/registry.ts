export type ImageToolDef = {
  slug: string;
  title: string;
  description: string;
  featured?: boolean;
};

export const imageTools: ImageToolDef[] = [
  {
    slug: "compress",
    title: "Compress Image",
    description: "Reduce image file size while keeping visual quality.",
    featured: true,
  },
  {
    slug: "resize",
    title: "Resize Image",
    description: "Change image width and height precisely.",
    featured: true,
  },
  {
    slug: "crop",
    title: "Crop Image",
    description: "Crop images to the area you need.",
  },
  {
    slug: "rotate",
    title: "Rotate Image",
    description: "Rotate image orientation by 90° steps.",
  },
  {
    slug: "to-jpg",
    title: "Convert to JPG",
    description: "Convert images to JPEG format.",
    featured: true,
  },
  {
    slug: "to-png",
    title: "Convert to PNG",
    description: "Convert images to PNG format.",
  },
  {
    slug: "to-webp",
    title: "Convert to WEBP",
    description: "Convert images to modern WEBP format.",
  },
  {
    slug: "to-bmp",
    title: "Convert to BMP",
    description: "Convert images to BMP format.",
  },
];

export function getImageTool(slug: string): ImageToolDef | undefined {
  return imageTools.find((t) => t.slug === slug);
}
