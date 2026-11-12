// CRC: crc-Build.md | R196, R201
// The page's entry point. The table, store and network attach here as their layers land; with
// `?test` the page exposes one object, `window.hollow`, for Playwright, and nothing otherwise.

import { BlobStore, type Size } from './store/blobs.ts';
import { IdbDb } from './store/db.ts';
import { GameStore, type Clock } from './store/gamestore.ts';

declare const HOLLOW_STAMP: string;

const clock: Clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: h => clearTimeout(h as number) };

async function measure(blob: Blob): Promise<Size> {
  const image = await createImageBitmap(blob);
  const size = { w: image.width, h: image.height };
  image.close();
  return size;
}

async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage);
  const blobs = new BlobStore(db, measure);
  await store.start();
  addEventListener('pagehide', () => { void store.save(); });
  return { stamp: HOLLOW_STAMP, store, blobs };
}

const ready = main();
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: unknown }).hollow = { stamp: HOLLOW_STAMP, ready };
}
