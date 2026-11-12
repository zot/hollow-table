// CRC: crc-BlobStore.md | Test: test-BlobStore.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDb } from './db.ts';
import { BlobStore, sha256 } from './blobs.ts';

test('images by content', async () => {
  const revoked: string[] = [];
  let made = 0;
  const blobs = new BlobStore(new MemoryDb(), async () => ({ w: 40, h: 30 }),
    { create: () => `blob:${++made}`, revoke: u => { revoked.push(u); } });
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' });
  const hash = await sha256(png);

  assert.deepEqual(await blobs.add(png), { blob: hash, w: 40, h: 30 });
  assert.match(hash, /^[0-9a-f]{64}$/);
  const back = await blobs.get(hash);
  assert.deepEqual(new Uint8Array(await back!.arrayBuffer()), new Uint8Array(await png.arrayBuffer()));

  const other = new MemoryDb(), theirs = new BlobStore(other, async () => ({ w: 1, h: 1 }));
  assert.equal(await theirs.accept(hash, png), true);
  assert.equal(await theirs.accept('0'.repeat(64), png), false);
  assert.equal(await theirs.get('0'.repeat(64)), undefined);
  assert.ok(await theirs.get(hash));

  const [a, b] = [await blobs.url(hash), await blobs.url(hash)];
  assert.equal(a, b);
  assert.equal(made, 1);
  blobs.release(hash);
  assert.deepEqual(revoked, []);
  blobs.release(hash);
  assert.deepEqual(revoked, [a]);
});
