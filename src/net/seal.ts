// CRC: crc-Seal.md | Seq: seq-sync.md#1.4, seq-edit.md#1.3 | R184, R187
// Sealed boxes between the GM's page and one player's page: an ECDH P-256 key pair per page load,
// a shared AES-GCM key per pair, and additional data naming what the box is and who it's from and
// to, so a box can't be passed off as anything else.

import { b64, unb64 } from './b64.ts';
import { PUB } from './identity.ts';

export type Box = { iv: string; data: string };
const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const enc = new TextEncoder(), dec = new TextDecoder();
const ad = (what: string, from: string, to: string) => enc.encode(`${what}:${from}>${to}`);

export class Sealer {
  /** This page's sealing key, sent in the handshake. */
  pub: string;
  #pair: CryptoKeyPair;
  #shared = new Map<string, Promise<CryptoKey>>();

  private constructor(pair: CryptoKeyPair, pub: string) {
    this.#pair = pair;
    this.pub = pub;
  }

  /** A new key pair: one per page load. */
  static async make(): Promise<Sealer> {
    const pair = await crypto.subtle.generateKey(ECDH, false, ['deriveKey']) as CryptoKeyPair;
    return new Sealer(pair, b64(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))));
  }

  #with(theirs: string): Promise<CryptoKey> {
    let key = this.#shared.get(theirs);
    if (!key) {
      key = (async () => {
        if (!PUB.test(theirs)) throw new Error('not a sealing key');
        const pub = await crypto.subtle.importKey('raw', unb64(theirs), ECDH, false, []);
        return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, this.#pair.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      })();
      key.catch(() => this.#shared.delete(theirs));
      this.#shared.set(theirs, key);
    }
    return key;
  }

  /** A box only the page holding `theirs` can open, and only as `what` from `from` to `to`. */
  async seal(theirs: string, what: string, from: string, to: string, value: unknown): Promise<Box> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: ad(what, from, to) },
      await this.#with(theirs), enc.encode(JSON.stringify(value)));
    return { iv: b64(iv), data: b64(new Uint8Array(data)) };
  }

  /** What the box holds, or undefined if it was made for anything else (or is no box at all). */
  async open(theirs: string, what: string, from: string, to: string, box: unknown): Promise<unknown> {
    const b = box as Partial<Box> | null;
    if (!b || typeof b.iv !== 'string' || typeof b.data !== 'string' || b.iv.length > 24) return undefined;
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv), additionalData: ad(what, from, to) },
        await this.#with(theirs), unb64(b.data));
      return JSON.parse(dec.decode(plain));
    } catch { return undefined; }
  }
}
