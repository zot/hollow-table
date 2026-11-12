// CRC: crc-Identity.md | Seq: seq-join.md#1.4, seq-join.md#1.6 | R164, R165
// This browser's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
// non-extractable. The browser id is 20 characters of the SHA-256 of the public key, so it
// survives reloads, and names and the invite's `gm=` hold across them.

import type { Db } from '../store/db.ts';
import { b64, unb64 } from './b64.ts';

export const ID = /^[\w-]{20}$/;
/** A raw P-256 public key in base64url: 65 bytes, 87 characters. */
export const PUB = /^[\w-]{87}$/;
const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const, SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = new TextEncoder();

async function idOf(raw: Uint8Array<ArrayBuffer>): Promise<string> {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).slice(0, 20);
}

/** Who the proof is between: the signer's Trystero peer id, then the verifier's. */
export type Peers = { from: string; to: string };

// Seq: seq-join.md#1.4: what a proof signs. Every part is bound, so a proof made for one nonce,
// one pair of peers or one sealing key checks for nothing else.
const statement = (nonce: string, peers: Peers, idPub: string, sealPub: string) =>
  enc.encode(JSON.stringify(['hollow-table handshake', nonce, peers.from, peers.to, idPub, sealPub]));

export class Identity {
  id: string;
  /** The public key, as sent in the handshake. */
  pub: string;
  #key: CryptoKey;

  private constructor(id: string, pub: string, key: CryptoKey) {
    this.id = id;
    this.pub = pub;
    this.#key = key;
  }

  // R164: made on first use and kept; a page without a database keeps it for this load only.
  /** This browser's identity, from the `identity` store. */
  static async load(db: Db | null): Promise<Identity> {
    const kept = db && await db.tx(['identity'], 'readonly', t => t.get<CryptoKeyPair>('identity', 'me'));
    const pair = kept ?? await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']) as CryptoKeyPair;
    if (db && !kept) await db.tx(['identity'], 'readwrite', t => t.put('identity', 'me', pair));
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
    return new Identity(await idOf(raw), b64(raw), pair.privateKey);
  }

  // Seq: seq-join.md#1.4
  /** Signs their nonce, the two peer ids, and this page's identity and sealing keys. */
  async prove(theirNonce: string, peers: Peers, sealPub: string): Promise<string> {
    const sig = await crypto.subtle.sign(SIG, this.#key, statement(theirNonce, peers, this.pub, sealPub));
    return b64(new Uint8Array(sig));
  }
}

// Seq: seq-join.md#1.6 | R165: a bad proof refuses the peer.
/** The browser id behind a proof of `ourNonce` between `peers`, or null if it doesn't check out. */
export async function verify(sig: unknown, ourNonce: string, peers: Peers, idPub: unknown, sealPub: unknown): Promise<string | null> {
  if (typeof sig !== 'string' || sig.length > 200 || typeof idPub !== 'string' || !PUB.test(idPub)
    || typeof sealPub !== 'string' || !PUB.test(sealPub)) return null;
  try {
    const raw = unb64(idPub), key = await crypto.subtle.importKey('raw', raw, ALG, false, ['verify']);
    return await crypto.subtle.verify(SIG, key, unb64(sig), statement(ourNonce, peers, idPub, sealPub)) ? await idOf(raw) : null;
  } catch { return null; }
}
