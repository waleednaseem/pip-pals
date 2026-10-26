import { encryptPDF } from "@pdfsmaller/pdf-encrypt";
import { loadPdfForEdit, savePdf } from "./load";

/**
 * Password-protect a PDF (AES-256 in secure contexts; RC4 fallback on HTTP).
 */
export async function protectPdf(
  bytes: Uint8Array,
  userPassword: string
): Promise<Uint8Array> {
  const password = userPassword.trim();
  if (!password) {
    throw new Error("Enter a password to protect this PDF.");
  }

  // Normalize via pdf-lib so we start from a clean unencrypted document.
  const doc = await loadPdfForEdit(bytes, { ignoreEncryption: true });
  const clean = await savePdf(doc);

  const secure =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1");

  try {
    return await encryptPDF(clean, password, {
      algorithm: secure ? "AES-256" : "RC4",
      allowPrinting: true,
      allowModifying: false,
      allowCopying: false,
      allowAnnotating: false,
      allowFillingForms: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ALREADY_ENCRYPTED|already encrypted/i.test(msg)) {
      throw new Error(
        "This PDF is already encrypted. Unlock it first, then protect again."
      );
    }
    // AES needs Web Crypto; retry RC4
    if (secure) {
      try {
        return await encryptPDF(clean, password, { algorithm: "RC4" });
      } catch {
        /* fall through */
      }
    }
    throw new Error(msg || "Could not encrypt this PDF.");
  }
}

/** Re-save without encryption when the file can be opened with ignoreEncryption. */
export async function unlockPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes, { ignoreEncryption: true });
  return savePdf(doc);
}
