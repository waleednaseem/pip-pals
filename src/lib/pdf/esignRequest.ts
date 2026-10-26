import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { loadPdfForEdit, savePdf } from "./load";

export type Signer = {
  name: string;
  email: string;
};

export type SignatureSlot = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerIndex: number;
};

export type EsignRequestMeta = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  signers: Signer[];
  status: "pending" | "completed";
};

/**
 * Build a signing package: cover page + original pages + signature boxes as form fields.
 * Metadata is stored on this device by the UI.
 */
export async function buildEsignRequestPdf(
  bytes: Uint8Array,
  options: {
    title: string;
    message: string;
    signers: Signer[];
    slots: SignatureSlot[];
  }
): Promise<{ pdf: Uint8Array; meta: EsignRequestMeta }> {
  if (!options.signers.length) {
    throw new Error("Add at least one signer (name + email).");
  }
  if (!options.slots.length) {
    throw new Error("Place at least one signature box on the PDF.");
  }

  const src = await loadPdfForEdit(bytes);
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  const cover = out.addPage([595, 842]);
  cover.drawText("Signature request", {
    x: 50,
    y: 780,
    size: 22,
    font: bold,
    color: rgb(0.02, 0.35, 0.27),
  });
  cover.drawText((options.title || "Document for signature").slice(0, 80), {
    x: 50,
    y: 740,
    size: 14,
    font,
  });
  cover.drawText((options.message || "Please sign where indicated.").slice(0, 90), {
    x: 50,
    y: 710,
    size: 11,
    font,
  });

  let y = 660;
  cover.drawText("Signers:", { x: 50, y, size: 12, font: bold });
  y -= 22;
  options.signers.forEach((s, i) => {
    cover.drawText(`${i + 1}. ${s.name} <${s.email}>`.slice(0, 70), {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;
  });
  cover.drawText(
    "Open in ConvertPDF Sign / Fill form to complete signatures.",
    { x: 50, y: 80, size: 10, font, color: rgb(0.4, 0.4, 0.4) }
  );

  const copied = await out.copyPages(src, src.getPageIndices());
  copied.forEach((p) => out.addPage(p));

  const form = out.getForm();
  for (let i = 0; i < options.slots.length; i++) {
    const slot = options.slots[i];
    const signer = options.signers[slot.signerIndex] || options.signers[0];
    // Cover is page index 0; original page N is at index N
    const page = out.getPage(slot.pageNumber);
    const fieldName = `sig_${i + 1}_${signer.name.replace(/\W+/g, "_") || "signer"}`;
    const tf = form.createTextField(fieldName);
    tf.addToPage(page, {
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      borderWidth: 1.5,
      borderColor: rgb(0.05, 0.47, 0.34),
      backgroundColor: rgb(0.93, 0.99, 0.96),
    });
    page.drawText(`Sign: ${signer.name || "Signer"}`, {
      x: slot.x,
      y: slot.y + slot.height + 4,
      size: 8,
      font,
      color: rgb(0.05, 0.47, 0.34),
    });
  }

  const pdf = await savePdf(out);
  const meta: EsignRequestMeta = {
    id: `req_${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: options.title || "Signature request",
    message: options.message,
    signers: options.signers,
    status: "pending",
  };

  return { pdf, meta };
}
