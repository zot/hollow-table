// CRC: crc-BlobStore.md | Test: test-BlobStore.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDb, type Db } from './db.ts';
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

test('images kept as bytes, where a Blob cannot be stored', async () => {
  // R449: WebKit's private IndexedDB refuses a Blob ("Error preparing Blob/File data to be stored in object
  // store"); bytes and their type are stored, and an image stored whole before still loads.
  const mem = new MemoryDb();
  const noBlobs: Db = { tx: (stores, mode, fn) => mem.tx(stores, mode, t => fn({ ...t,
    put: async (s, k, v) => { if (v instanceof Blob) throw new Error('UnknownError: Error preparing Blob/File data to be stored in object store'); return t.put(s, k, v); } })) };
  const blobs = new BlobStore(noBlobs, async () => ({ w: 8, h: 8 }));
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 4, 5, 6])], { type: 'image/png' }), hash = await sha256(png);
  assert.deepEqual(await blobs.add(png), { blob: hash, w: 8, h: 8 }, 'added');
  const back = await blobs.get(hash);
  assert.equal(back?.type, 'image/png', 'its type kept');
  assert.deepEqual(new Uint8Array(await back!.arrayBuffer()), new Uint8Array(await png.arrayBuffer()), 'its bytes');
  const jpg = new Blob([new Uint8Array([255, 216, 255, 1])], { type: 'image/jpeg' });
  assert.equal(await blobs.accept(await sha256(jpg), jpg), true, "another page's image kept");
  // Stored whole, as before.
  const old = new Blob([new Uint8Array([71, 73, 70])], { type: 'image/gif' }), oldHash = await sha256(old);
  await mem.tx(['blobs'], 'readwrite', t => t.put('blobs', oldHash, old));
  const was = await blobs.get(oldHash);
  assert.equal(was?.type, 'image/gif', 'an image stored whole still loads');
  assert.deepEqual(new Uint8Array(await was!.arrayBuffer()), new Uint8Array([71, 73, 70]));
});
