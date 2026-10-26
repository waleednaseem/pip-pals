import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { extractTextFromPdf } from "./extractText";
import { imagesToPdf } from "./jpgToPdf";
import { loadPdfForEdit, savePdf } from "./load";
import { pdfPagesToJpegBlobs } from "./toJpg";

function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw;
    while (line.length > maxChars) {
      let breakAt = line.lastIndexOf(" ", maxChars);
      if (breakAt < maxChars * 0.5) breakAt = maxChars;
      lines.push(line.slice(0, breakAt));
      line = line.slice(breakAt).trimStart();
    }
    lines.push(line);
  }
  return lines;
}

async function textToPdf(
  text: string,
  title = "Document"
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 48;
  const lineHeight = 14;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const avgChar = font.widthOfTextAtSize("n", fontSize) || 6;
  const maxChars = Math.max(40, Math.floor(maxWidth / avgChar));
  const lines = wrapLines(text || "(empty)", maxChars);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  page.drawText(title, {
    x: margin,
    y,
    size: 14,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 28;

  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line.slice(0, 200), {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }

  return savePdf(doc);
}

export async function pdfToWord(bytes: Uint8Array): Promise<Blob> {
  const text = await extractTextFromPdf(bytes);
  const paragraphs = (text || "(No extractable text)").split(/\n+/).map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
      })
  );
  const doc = new Document({
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(doc);
}

export async function pdfToExcel(bytes: Uint8Array): Promise<Blob> {
  const text = await extractTextFromPdf(bytes);
  const rows = (text || "")
    .split(/\n+/)
    .map((line) => line.split(/\t+|\s{2,}/).filter(Boolean));
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.length ? rows : [["(No extractable text)"]]
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "PDF");
  const out = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function pdfToMarkdown(bytes: Uint8Array): Promise<string> {
  const text = await extractTextFromPdf(bytes);
  const body = text || "(No extractable text)";
  return `# PDF export\n\n${body}\n`;
}

export async function pdfToPdfA(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes, { ignoreEncryption: true });
  doc.setTitle(doc.getTitle() || "Archive PDF");
  doc.setProducer("ConvertPDF");
  doc.setCreator("ConvertPDF");
  doc.setModificationDate(new Date());
  return savePdf(doc);
}

export async function wordToPdf(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return textToPdf(result.value || "(empty document)", file.name);
}

export async function excelToPdf(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });
  const parts: string[] = [];
  for (const name of book.SheetNames) {
    parts.push(`## ${name}`);
    const sheet = book.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(csv);
  }
  return textToPdf(parts.join("\n\n"), file.name);
}

export async function htmlStringToPdf(html: string): Promise<Uint8Array> {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return textToPdf(text || "(empty HTML)", "HTML");
}

/** Minimal PPTX: one full-bleed image slide per PDF page (JSZip, browser-safe). */
export async function pdfToPowerPoint(bytes: Uint8Array): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const pages = await pdfPagesToJpegBlobs(bytes, 1.5);
  if (!pages.length) throw new Error("No pages to convert.");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${pages
    .map(
      (_, i) =>
        `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    )
    .join("\n  ")}
</Types>`
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );

  const ppt = zip.folder("ppt")!;
  ppt.folder("_rels")!.file(
    "presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${pages
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
    )
    .join("\n  ")}
</Relationships>`
  );
  ppt.file(
    "presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    ${pages
      .map(
        (_, i) =>
          `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`
      )
      .join("\n    ")}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`
  );

  const slides = ppt.folder("slides")!;
  const media = ppt.folder("media")!;
  const slideRels = slides.folder("_rels")!;

  for (let i = 0; i < pages.length; i++) {
    const n = i + 1;
    const imgName = `image${n}.jpeg`;
    media.file(imgName, await pages[i].blob.arrayBuffer());
    slideRels.file(
      `slide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>
</Relationships>`
    );
    slides.file(
      `slide${n}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
    );
  }

  return zip.generateAsync({ type: "blob" });
}

export async function powerpointToPdf(file: File): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!slideFiles.length) {
    throw new Error("No slides found in this PowerPoint file.");
  }

  const texts: string[] = [];
  for (const path of slideFiles) {
    const xml = await zip.files[path].async("string");
    const matches = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
    const slideText = matches.map((m) => m[1]).join(" ").trim();
    texts.push(slideText || "(empty slide)");
  }

  return textToPdf(texts.map((t, i) => `Slide ${i + 1}\n${t}`).join("\n\n"), file.name);
}

/** Camera / gallery images → PDF (scan helper). */
export async function imagesFilesToPdf(files: File[]): Promise<Uint8Array> {
  const images = await Promise.all(
    files.map(async (f) => {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const type: "jpg" | "png" =
        f.type.includes("png") || f.name.toLowerCase().endsWith(".png")
          ? "png"
          : "jpg";
      return { bytes, type };
    })
  );
  return imagesToPdf(images);
}
