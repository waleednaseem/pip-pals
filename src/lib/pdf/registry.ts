export type PdfToolMode = "client" | "stub";

export type PdfToolCategory =
  | "organize"
  | "convert"
  | "edit"
  | "security"
  | "ai";

export type PdfToolDef = {
  slug: string;
  title: string;
  description: string;
  mode: PdfToolMode;
  category: PdfToolCategory;
  featured?: boolean;
};

export const pdfCategories: { id: PdfToolCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "organize", label: "Organize PDF" },
  { id: "convert", label: "Convert PDF" },
  { id: "edit", label: "Edit PDF" },
  { id: "security", label: "Security" },
  { id: "ai", label: "AI tools" },
];

export const pdfTools: PdfToolDef[] = [
  // Organize
  {
    slug: "merge",
    title: "Merge PDF",
    description: "Combine PDFs in the order you want.",
    mode: "client",
    category: "organize",
    featured: true,
  },
  {
    slug: "merge-pdf-images",
    title: "Merge PDF & Images",
    description: "Combine PDFs and JPG/PNG images into one file.",
    mode: "client",
    category: "organize",
    featured: true,
  },
  {
    slug: "split",
    title: "Split PDF",
    description: "Separate pages into independent PDF files.",
    mode: "client",
    category: "organize",
    featured: true,
  },
  {
    slug: "compress",
    title: "Compress PDF",
    description: "Reduce file size while keeping quality.",
    mode: "client",
    category: "organize",
  },
  {
    slug: "organize",
    title: "Organize PDF",
    description: "Reorder or delete pages.",
    mode: "client",
    category: "organize",
  },
  {
    slug: "rotate",
    title: "Rotate PDF",
    description: "Rotate pages the way you need.",
    mode: "client",
    category: "organize",
  },
  {
    slug: "repair",
    title: "Repair PDF",
    description: "Rewrite and repair mildly damaged PDFs.",
    mode: "client",
    category: "organize",
  },
  {
    slug: "crop",
    title: "Crop PDF",
    description: "Crop margins or a selected area.",
    mode: "client",
    category: "organize",
  },
  {
    slug: "compare",
    title: "Compare PDF",
    description: "Side-by-side text comparison of two PDFs.",
    mode: "client",
    category: "organize",
  },
  // Convert
  {
    slug: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDF text to a DOCX file.",
    mode: "client",
    category: "convert",
    featured: true,
  },
  {
    slug: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Turn PDF pages into PPTX slides.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Extract text rows into an Excel sheet.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert DOC/DOCX text to PDF.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Convert PPTX slide text to PDF.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Convert spreadsheet data to PDF.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert each PDF page into a JPG.",
    mode: "client",
    category: "convert",
    featured: true,
  },
  {
    slug: "extract-images",
    title: "Extract Images",
    description: "Extract embedded images (or export pages as PNG).",
    mode: "client",
    category: "convert",
  },
  {
    slug: "extract-text",
    title: "Extract Text",
    description: "Pull text content from your PDF documents.",
    mode: "client",
    category: "convert",
    featured: true,
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG/PNG images to a PDF.",
    mode: "client",
    category: "convert",
    featured: true,
  },
  {
    slug: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert pasted HTML markup to a PDF.",
    mode: "client",
    category: "convert",
  },
  {
    slug: "pdf-to-pdfa",
    title: "PDF to PDF/A",
    description: "Normalize for archive (best-effort metadata rewrite).",
    mode: "client",
    category: "convert",
  },
  {
    slug: "pdf-to-markdown",
    title: "PDF to Markdown",
    description: "Turn PDF text into a Markdown file.",
    mode: "client",
    category: "convert",
  },
  // Edit
  {
    slug: "edit",
    title: "Edit PDF",
    description: "Add text, images, drawings, and rectangles on your PDF.",
    mode: "client",
    category: "edit",
    featured: true,
  },
  {
    slug: "add-text",
    title: "Add Text",
    description: "Click on a page and add text.",
    mode: "client",
    category: "edit",
  },
  {
    slug: "sign",
    title: "Sign PDF",
    description: "Draw or upload a signature and place it on the page.",
    mode: "client",
    category: "edit",
    featured: true,
  },
  {
    slug: "esign-request",
    title: "Request e-Sign",
    description: "Add signers and signature boxes; download a request PDF to share.",
    mode: "client",
    category: "edit",
    featured: true,
  },
  {
    slug: "watermark",
    title: "Watermark",
    description: "Stamp text over your PDF pages.",
    mode: "client",
    category: "edit",
  },
  {
    slug: "page-numbers",
    title: "Page numbers",
    description: "Add page numbers to your PDF.",
    mode: "client",
    category: "edit",
  },
  {
    slug: "redact",
    title: "Redact PDF",
    description: "Black out headers, footers, or whole pages.",
    mode: "client",
    category: "edit",
  },
  {
    slug: "fill-form",
    title: "PDF Forms",
    description: "Fill AcroForm fields and download.",
    mode: "client",
    category: "edit",
    featured: true,
  },
  {
    slug: "create-form",
    title: "Create Form",
    description: "Add fillable text and checkbox fields to a PDF.",
    mode: "client",
    category: "edit",
  },
  {
    slug: "ocr",
    title: "OCR PDF",
    description: "Extract text from scanned PDFs in your browser.",
    mode: "client",
    category: "edit",
  },
  // Security
  {
    slug: "unlock",
    title: "Unlock PDF",
    description: "Remove soft password locks when possible.",
    mode: "client",
    category: "security",
  },
  {
    slug: "protect",
    title: "Protect PDF",
    description: "Password-encrypt your PDF in the browser.",
    mode: "client",
    category: "security",
  },
  // AI
  {
    slug: "summarizer",
    title: "AI Summarizer",
    description: "Extractive summary of PDF text in your browser.",
    mode: "client",
    category: "ai",
  },
  {
    slug: "translate",
    title: "Translate PDF",
    description: "Translate extracted PDF text between languages.",
    mode: "client",
    category: "ai",
  },
  {
    slug: "scan-to-pdf",
    title: "Scan to PDF",
    description: "Capture camera photos or uploads into a PDF.",
    mode: "client",
    category: "ai",
  },
];

export function getPdfTool(slug: string): PdfToolDef | undefined {
  return pdfTools.find((t) => t.slug === slug);
}

export function getFeaturedPdfTools(): PdfToolDef[] {
  return pdfTools.filter((t) => t.featured);
}

export function getClientPdfTools(): PdfToolDef[] {
  return pdfTools.filter((t) => t.mode === "client");
}

export function getPdfToolsByCategory(
  category: PdfToolCategory | "all"
): PdfToolDef[] {
  if (category === "all") return pdfTools;
  return pdfTools.filter((t) => t.category === category);
}
