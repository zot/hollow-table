// CRC: crc-Identity.md | Test: test-Crypto.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Identity, ID, verify } from './identity.ts';
import { Sealer } from './seal.ts';
import { MemoryDb } from '../store/db.ts';

test('the handshake proof', async () => {
  const db = new MemoryDb();
  const gm = await Identity.load(db), dana = await Identity.load(null);
  assert.match(gm.id, ID);
  assert.equal((await Identity.load(db)).id, gm.id, 'the same browser keeps its id');
  assert.notEqual(dana.id, gm.id);

  const seal = await Sealer.make(), other = await Sealer.make();
  const nonce = 'n-dana-1', peers = { from: 'peer-gm', to: 'peer-dana' };
  const proof = await gm.prove(nonce, peers, seal.pub);
  assert.equal(await verify(proof, nonce, peers, gm.pub, seal.pub), gm.id);
  assert.equal(await verify(proof, 'n-dana-2', peers, gm.pub, seal.pub), null, 'another nonce');
  assert.equal(await verify(proof, nonce, { from: peers.to, to: peers.from }, gm.pub, seal.pub), null, 'swapped peer ids');
  assert.equal(await verify(proof, nonce, peers, gm.pub, other.pub), null, 'another sealing key');
  assert.equal(await verify(proof, nonce, peers, dana.pub, seal.pub), null, 'another identity');
  assert.equal(await verify(42, nonce, peers, gm.pub, seal.pub), null, 'not a signature');
});
