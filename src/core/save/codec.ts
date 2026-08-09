/**
 * Portable base64 for save export/import.
 *
 * `btoa` is not an option: the game text is Portuguese and btoa throws on
 * anything outside Latin-1. Encoding through UTF-8 bytes ourselves works
 * identically in the browser and in the headless playtest harness.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]

    out += ALPHABET[b0 >> 2]
    out += ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : ALPHABET[b2 & 0x3f]
  }
  return out
}

export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let p = 0
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = ALPHABET.indexOf(clean[i]!)
    const c1 = ALPHABET.indexOf(clean[i + 1] ?? 'A')
    const c2 = clean[i + 2] === undefined ? -1 : ALPHABET.indexOf(clean[i + 2]!)
    const c3 = clean[i + 3] === undefined ? -1 : ALPHABET.indexOf(clean[i + 3]!)

    out[p++] = (c0 << 2) | (c1 >> 4)
    if (c2 >= 0) out[p++] = ((c1 & 0x0f) << 4) | (c2 >> 2)
    if (c3 >= 0) out[p++] = ((c2 & 0x03) << 6) | c3
  }
  return out.subarray(0, p)
}

export function encodeText(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

export function decodeText(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64))
}

/** FNV-1a. Detects corruption and truncation; it is not an anti-cheat measure. */
export function checksum(text: string): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
