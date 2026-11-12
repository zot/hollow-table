// CRC: crc-Identity.md, crc-Seal.md | R164, R184
// base64url without padding, for keys, signatures and boxes on the wire.

export const b64 = (u8: Uint8Array): string =>
  btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const unb64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
