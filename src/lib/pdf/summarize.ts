import { extractTextFromPdf } from "./extractText";

/** Lightweight extractive summary (no external AI). */
export async function summarizePdf(
  bytes: Uint8Array,
  maxSentences = 8
): Promise<string> {
  const text = await extractTextFromPdf(bytes);
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No text found to summarize.";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);

  if (!sentences.length) {
    return cleaned.slice(0, 800) + (cleaned.length > 800 ? "…" : "");
  }

  const scored = sentences.map((s, i) => {
    const words = new Set(s.toLowerCase().split(/\W+/).filter(Boolean));
    let score = words.size;
    if (i < 3) score += 8;
    if (/\b(summary|conclusion|important|key|overall)\b/i.test(s)) score += 5;
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored
    .slice(0, maxSentences)
    .sort(
      (a, b) => sentences.indexOf(a.s) - sentences.indexOf(b.s)
    )
    .map((x) => x.s);

  return picked.join(" ");
}
