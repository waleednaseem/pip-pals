import { PDFDocument } from "pdf-lib";

export type LoadPdfOptions = {
  /** Try to open encrypted Acrobat PDFs without password when allowed */
  ignoreEncryption?: boolean;
};

/**
 * Load Acrobat / standard PDFs for manipulation.
 * Throws clear errors for unsupported/encrypted cases.
 */
export async function loadPdfForEdit(
  bytes: Uint8Array,
  options: LoadPdfOptions = {}
): Promise<PDFDocument> {
  const ignoreEncryption = options.ignoreEncryption !== false;
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption,
      updateMetadata: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/encrypt|password|security/i.test(msg)) {
      throw new Error(
        "This PDF is password-protected. Use Protect/Unlock and enter the password, or remove protection in Acrobat first."
      );
    }
    if (/xfa/i.test(msg)) {
      throw new Error(
        "This looks like an Acrobat XFA form. Save as a static PDF (Print to PDF) in Acrobat, then try again."
      );
    }
    throw new Error(
      msg || "Could not open this PDF. Re-save it in Acrobat as a standard PDF and retry."
    );
  }
}

export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: false });
}
