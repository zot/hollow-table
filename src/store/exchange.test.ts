// CRC: crc-Exchange.md | Test: test-Exchange.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDb } from './db.ts';
import { BlobStore } from './blobs.ts';
import { GameStore } from './gamestore.ts';
import { BadFile, exportGame, fileName, importGame, type GameFile } from './exchange.ts';
import { ridOf, type Image, type Meta } from '../model/records.ts';
import { PLAYTEST } from './playtest.ts';
import { fakeClock, memoryStorage } from './fakes.ts';

async function playtestGame() {
  const db = new MemoryDb(), { clock, advance } = fakeClock();
  const store = new GameStore(db, clock, memoryStorage()), blobs = new BlobStore(db, async () => ({ w: 40, h: 30 }));
  await store.start();
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 9, 9, 9])], { type: 'image/png' });
  const { blob, w, h } = await blobs.add(png);
  const image: Image = { kind: 'image', oid: '0000000b', place: { x: 0, y: 0, z: 1, tilt: 0 }, blob, w, h };
  store.game.change(w => w.put(ridOf(image.oid), image));
  for (let i = 1; i <= 4; i++) {
    store.game.change(w => w.put('meta', { round: 0, rolls: i <= 2 ? i : 2 }));
    advance(1000);
    await store.checkpoint(`Checkpoint ${i}`, false);
  }
  return { store, blobs, blob };
}

test('export and import round trip', async () => {
  const { store, blobs, blob } = await playtestGame();
  const { filename, text } = await exportGame(store, blobs, store.current!.id);
  assert.equal(filename, 'The-11-08-playtest.glimmer.json');
  const file = JSON.parse(text) as GameFile;
  assert.equal(file.checkpoints.length, 4);
  assert.deepEqual(Object.keys(file.blobs), [blob], 'the image once');
  assert.equal((file.records.meta as Meta).rolls, 2);

  const made = await importGame(store, blobs, text);
  assert.equal(made.name, `${PLAYTEST} (imported)`);
  const original = await store.read(store.current!.id), copy = await store.read(made.id);
  assert.deepEqual(Object.fromEntries(copy.records), Object.fromEntries(original.records));
  assert.equal(copy.checkpoints.length, 4);
  assert.deepEqual((await store.list()).map(g => g.name).sort(), [PLAYTEST, `${PLAYTEST} (imported)`]);

  // Into a browser that has never seen it: the image comes along, and the name is free.
  const db = new MemoryDb(), { clock } = fakeClock();
  const elsewhere = new GameStore(db, clock, memoryStorage()), theirBlobs = new BlobStore(db, async () => ({ w: 1, h: 1 }));
  const fresh = await importGame(elsewhere, theirBlobs, text);
  assert.equal(fresh.name, PLAYTEST);
  assert.ok(await theirBlobs.get(blob));
});

test('a bad file is refused whole', async () => {
  const { store, blobs, blob } = await playtestGame();
  const { text } = await exportGame(store, blobs, store.current!.id);
  const games = (await store.list()).length;

  const badRecord = JSON.parse(text) as GameFile;
  badRecord.records.meta = { round: -1, rolls: 0 };
  await assert.rejects(importGame(store, blobs, JSON.stringify(badRecord)), BadFile);

  const badImage = JSON.parse(text) as GameFile;
  badImage.blobs[blob] = 'data:image/png;base64,' + btoa('not the same bytes');
  await assert.rejects(importGame(store, blobs, JSON.stringify(badImage)), BadFile);

  assert.equal((await store.list()).length, games, 'no game created');
});

test('the file is named after the game, punctuation as dashes', () => {
  // R292.
  assert.equal(fileName('The 11-08 playtest'), 'The-11-08-playtest.glimmer.json');
  assert.equal(fileName('Sam\'s game: part 2!'), 'Sam-s-game-part-2.glimmer.json');
  assert.equal(fileName('¿Qué?'), 'Qué.glimmer.json');
  assert.equal(fileName('!!!'), 'game.glimmer.json');
});
