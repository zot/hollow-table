// CRC: crc-Identity.md | Test: test-Crypto.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importUserIdentity } from '@trystero-p2p/nostr';
import { Identity, ID } from './identity.ts';
import { MemoryDb } from '../store/db.ts';

test("a browser's id is Trystero's for its key", async () => {
  const db = new MemoryDb();
  // An extractable pair, so Trystero can be asked for the id of the very same key.
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  await db.tx(['identity'], 'readwrite', t => t.put('identity', 'me', pair));
  const me = await Identity.load(db), theirs = await importUserIdentity(await crypto.subtle.exportKey('jwk', pair.privateKey));
  assert.match(me.id, ID);
  assert.equal(me.id, theirs.userId, "Trystero's user id for this key");
  assert.equal((await Identity.load(db)).id, me.id, 'the same browser keeps its id');
  assert.notEqual((await Identity.load(null)).id, me.id);

  const t = me.trystero(), payload = new TextEncoder().encode('a transcript');
  assert.equal(t.userId, me.id);
  assert.deepEqual(t.signPubJwk, theirs.signPubJwk);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, await t.sign(payload) as Uint8Array<ArrayBuffer>, payload), 'signs with the kept key');
});
