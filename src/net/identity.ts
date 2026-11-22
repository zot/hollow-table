// CRC: crc-Identity.md | Seq: seq-join.md#1.2 | R164, R470
// This browser's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
// non-extractable. Trystero proves it: the key is brought to Trystero, and the browser id is the user
// id Trystero derives from the public key, so it survives reloads, and names and the invite's `gm=`
// hold across them.

import type { UserIdentity } from '@trystero-p2p/nostr';
import type { Db } from '../store/db.ts';

/** A browser id: Trystero's user id, 22 base62 characters. Any other shape is from before (R472, R473). */
export const ID = /^[0-9A-Za-z]{22}$/;
/** A raw P-256 public key in base64url: 65 bytes, 87 characters. */
export const PUB = /^[\w-]{87}$/;
const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const, SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// R470: Trystero's user id for a key, written out as Trystero derives it: base62 of the SHA-256 of
// `trystero:uid:v1:` and the key's coordinates. Trystero checks a brought identity's id against its
// key, so if its derivation ever changes, joining fails loudly instead of the ids drifting apart.
async function userIdOf(x: string, y: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`trystero:uid:v1:${x}.${y}`)));
  let n = digest.reduce((v, b) => v << 8n | BigInt(b), 0n) % 62n ** 22n, out = '';
  for (let i = 0; i < 22; i++) { out = BASE62[Number(n % 62n)]! + out; n /= 62n; }
  return out;
}

export class Identity {
  id: string;
  #key: CryptoKey;
  #jwk: JsonWebKey;

  private constructor(id: string, key: CryptoKey, jwk: JsonWebKey) {
    this.id = id;
    this.#key = key;
    this.#jwk = jwk;
  }

  // R164: made on first use and kept; a page without a database keeps it for this load only.
  /** This browser's identity, from the `identity` store. */
  static async load(db: Db | null): Promise<Identity> {
    const kept = db && await db.tx(['identity'], 'readonly', t => t.get<CryptoKeyPair>('identity', 'me'));
    const pair = kept ?? await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']) as CryptoKeyPair;
    if (db && !kept) await db.tx(['identity'], 'readwrite', t => t.put('identity', 'me', pair));
    const { x, y } = await crypto.subtle.exportKey('jwk', pair.publicKey);
    return new Identity(await userIdOf(x!, y!), pair.privateKey, { kty: 'EC', crv: 'P-256', x, y });
  }

  // Seq: seq-join.md#1.2 | R470: what Trystero proves this browser with; the private half stays here.
  /** This browser's identity as Trystero takes it. */
  trystero(): UserIdentity {
    return {
      userId: this.id, signPubJwk: this.#jwk,
      sign: async payload => new Uint8Array(await crypto.subtle.sign(SIG, this.#key, payload as Uint8Array<ArrayBuffer>)),
    };
  }
}
