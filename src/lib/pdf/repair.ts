import { loadPdfForEdit, savePdf } from "./load";

/** Best-effort repair: reload and rewrite the PDF structure. */
export async function repairPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdfForEdit(bytes, { ignoreEncryption: true });
  return savePdf(doc);
}
