// CRC: crc-ImageExchange.md | Test: test-Images.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ImageExchange, NOBODY, RETRY_MS } from './images.ts';
import { FakeRoom } from './fakeroom.ts';
import { BlobStore } from '../store/blobs.ts';
import { MemoryDb } from '../store/db.ts';
import { fakeClock } from '../store/fakes.ts';

test('images by hash', async () => {
  const room = new FakeRoom(), { clock, advance } = fakeClock();
  const page = (tab: string) => {
    const blobs = new BlobStore(new MemoryDb(), async () => ({ w: 1, h: 1 }));
    const images = new ImageExchange(room.link({ tab, browser: `b-${tab}`, sealKey: '' }), blobs, clock);
    return { blobs, images };
  };
  const gm = page('gm'), dana = page('dana');
  const png = (n: number) => new Blob([new Uint8Array([137, 80, 78, 71, n])], { type: 'image/png' });

  // The GM adds one: Dana's page fetches it by hash and keeps it.
  const { blob: a } = await gm.blobs.add(png(1));
  assert.equal(await dana.images.want(a), true);
  assert.ok(await dana.blobs.get(a));
  // Dana adds one: the GM's page has it.
  const { blob: b } = await dana.blobs.add(png(2));
  assert.equal(await gm.images.want(b), true);
  // Ann joins later: Dana's copy answers once the GM has gone, so it's a page that kept it.
  room.online('gm', false);
  const ann = page('ann');
  assert.equal(await ann.images.want(a), true);
  assert.equal(await ann.images.want(b), true);

  // Nobody has it: missing, with why; asked again every 10 s; shows once a page with it is back.
  room.online('gm', true);
  const kept = await gm.blobs.add(png(3));
  room.online('gm', false);
  assert.equal(await ann.images.want(kept.blob), false);
  assert.equal(ann.images.missing.get(kept.blob), NOBODY);
  ann.images.start();
  room.online('gm', true);
  advance(RETRY_MS);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(ann.images.missing.has(kept.blob), false);
  assert.ok(await ann.blobs.get(kept.blob));
  ann.images.stop();
});
