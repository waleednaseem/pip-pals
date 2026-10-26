import { extractTextFromPdf } from "./extractText";

async function translateChunk(
  text: string,
  from: string,
  to: string
): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text.slice(0, 450)
  )}&langpair=${encodeURIComponent(`${from}|${to}`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Translation service unavailable.");
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    throw new Error("Translation failed. Try a shorter PDF.");
  }
  return data.responseData.translatedText;
}

export async function translatePdfText(
  bytes: Uint8Array,
  from: string,
  to: string
): Promise<string> {
  const text = await extractTextFromPdf(bytes);
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No text found to translate.";

  const chunks: string[] = [];
  let rest = cleaned.slice(0, 3500);
  while (rest.length) {
    const piece = rest.slice(0, 450);
    rest = rest.slice(450);
    chunks.push(await translateChunk(piece, from, to));
  }
  return chunks.join(" ");
}
