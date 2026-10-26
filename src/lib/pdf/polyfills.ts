/**
 * pdfjs-dist 5.4+ / 6.x uses bleeding-edge TypedArray helpers.
 * Older Chromium (Playwright, some WebViews) lack them → "a.toHex is not a function".
 */
export function ensurePdfjsPolyfills() {
  if (typeof Uint8Array !== "undefined") {
    const proto = Uint8Array.prototype as Uint8Array & {
      toHex?: () => string;
    };
    if (typeof proto.toHex !== "function") {
      proto.toHex = function toHex(this: Uint8Array) {
        const hex = new Array<string>(this.length);
        for (let i = 0; i < this.length; i++) {
          hex[i] = this[i].toString(16).padStart(2, "0");
        }
        return hex.join("");
      };
    }
  }

  if (typeof Map !== "undefined") {
    const proto = Map.prototype as Map<unknown, unknown> & {
      getOrInsertComputed?: (
        key: unknown,
        callback: (key: unknown) => unknown
      ) => unknown;
    };
    if (typeof proto.getOrInsertComputed !== "function") {
      proto.getOrInsertComputed = function getOrInsertComputed(
        this: Map<unknown, unknown>,
        key: unknown,
        callback: (key: unknown) => unknown
      ) {
        if (this.has(key)) return this.get(key);
        const value = callback(key);
        this.set(key, value);
        return value;
      };
    }
  }
}
