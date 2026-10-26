export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string) {
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

export function downloadBytesAs(
  bytes: Uint8Array,
  filename: string,
  mime: string
) {
  const copy = new Uint8Array(bytes);
  downloadBlob(new Blob([copy], { type: mime }), filename);
}
