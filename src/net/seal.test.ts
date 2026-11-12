// CRC: crc-Seal.md | Test: test-Crypto.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sealer } from './seal.ts';

test('a box opens only for what it was made for', async () => {
  const gm = await Sealer.make(), dana = await Sealer.make(), ann = await Sealer.make();
  const box = await gm.seal(dana.pub, 'recs', 'gm', 'dana', { sheet: 'Sam' });
  assert.deepEqual(await dana.open(gm.pub, 'recs', 'gm', 'dana', box), { sheet: 'Sam' });
  assert.equal(await dana.open(gm.pub, 'recs', 'gm', 'ann', box), undefined);
  assert.equal(await dana.open(gm.pub, 'edit', 'gm', 'dana', box), undefined);
  assert.equal(await ann.open(gm.pub, 'recs', 'gm', 'dana', box), undefined, "another page's key");
  assert.equal(await dana.open(gm.pub, 'recs', 'gm', 'dana', { iv: 1 }), undefined, 'no box');
});
