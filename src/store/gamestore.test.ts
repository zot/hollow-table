// CRC: crc-GameStore.md | Test: test-GameStore.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDb } from './db.ts';
import { GameStore, KEEP_AUTO, LAST, beforeRestoring } from './gamestore.ts';
import { fakeClock, memoryStorage } from './fakes.ts';
import { ridOf, type Character, type Chip, type Image, type Meta, type Receipt, type Tape, type Yards } from '../model/records.ts';
import { BEAUFORD, DEVREUX, PLAYTEST, SAM } from './playtest.ts';

const rolls = (store: GameStore) => (store.game.get('meta') as Meta).rolls;
function roll(store: GameStore) {
  const meta = store.game.get('meta') as Meta, tape = store.game.get('tape') as Tape;
  const receipt: Receipt = { id: `r${meta.rolls + 1}`, at: 1, title: `Devreux #${meta.rolls + 1}`,
    dice: [{ c: 'W', v: 4, added: false, dropped: false }], resolution: '4', level: 'Minor', outcome: 'success' };
  store.game.change(w => {
    w.put('meta', { ...meta, rolls: meta.rolls + 1 });
    w.put('tape', { receipts: [...tape.receipts, receipt] });
  });
}

test('write-through writes only what changed', async () => {
  const db = new MemoryDb(), { clock, advance } = fakeClock();
  const store = new GameStore(db, clock, memoryStorage());
  await store.start();
  const before = db.log.length;
  const g = store.game, devreux = g.get(ridOf(DEVREUX)) as Character, sam = g.get(ridOf(SAM)) as Character;
  g.change(w => w.put(ridOf(DEVREUX), { ...devreux, card: { ...devreux.card, x: devreux.card.x + 50 } }));
  advance(300);
  g.change(w => { w.put(ridOf(SAM), { ...sam, flipped: true }); w.del('o:00000008'); });
  g.change(w => w.put('meta', { round: 0, rolls: 0 }));                      // what's stored: no change
  advance(399);
  await new Promise(r => setImmediate(r));  // let any save already started finish
  assert.equal(db.log.length, before, 'nothing written before the pause is over');
  assert.equal(store.status(), 'Saving…');
  advance(1);
  await store.save();
  assert.equal(db.log.length, before + 1);
  const tx = db.log.at(-1)!;
  assert.equal(tx.puts.length, 2);
  assert.equal(tx.dels.length, 1);
  assert.match(store.status(), /^Saved \d\d:\d\d:\d\d$/);
});

test('checkpoints and restore', async () => {
  const db = new MemoryDb(), { clock, advance } = fakeClock(), storage = memoryStorage();
  let store = new GameStore(db, clock, storage);
  // 1: the first visit makes the playtest game.
  const info = await store.start();
  assert.equal(info.name, PLAYTEST);
  const pieces = () => store.game.all().filter(([rid]) => rid.startsWith('o:'));
  assert.equal(pieces().length, 9);
  assert.equal((store.game.get('meta') as Meta).round, 0);
  assert.deepEqual((store.game.get('yards') as Yards).yards.map(y => y.items.length), [0]);
  assert.equal(pieces().filter(([, r]) => 'kind' in r && r.kind === 'image').length, 0);

  // 2: changes survive reopening.
  const g = store.game, devreux = g.get(ridOf(DEVREUX)) as Character, sam = g.get(ridOf(SAM)) as Character;
  const chip: Chip = { kind: 'chip', oid: '0000000a', where: { slot: BEAUFORD, name: 'main' }, n: 0, sign: 1, points: 4, rider: false };
  const image: Image = { kind: 'image', oid: '0000000b', place: { x: 5, y: 5, z: 1, tilt: 0 }, blob: 'a'.repeat(64), w: 40, h: 30 };
  g.change(w => { w.put(ridOf(DEVREUX), { ...devreux, card: { ...devreux.card, x: 1 } }); w.put(ridOf(chip.oid), chip); w.put(ridOf(image.oid), image); });
  roll(store); roll(store);
  g.change(w => {
    w.put('meta', { ...(g.get('meta') as Meta), round: 2 });
    w.del(ridOf(SAM));
    w.put('yards', { yards: [{ name: 'Graveyard 1', named: false, items: [{ name: 'Sam', records: [sam] }] }] });
  });
  advance(400);
  await store.save();
  const table = JSON.stringify(Object.fromEntries(g.all().sort()));
  store = new GameStore(db, clock, storage);
  await store.start();
  assert.equal(JSON.stringify(Object.fromEntries(store.game.all().sort())), table);

  // 3, 4: a checkpoint, a third roll, then the restore (which checkpoints first).
  const two = await store.checkpoint('Two rolls in', false);
  advance(1000);
  roll(store);
  assert.equal(rolls(store), 3);
  const book = { claims: { Dana: 'browser-1' }, gv: 7, tomb: {} };
  store.game.change(w => w.put('book', book));
  advance(1000);
  await store.restore(two.id);
  assert.equal(rolls(store), 2);
  // The restore reloads every record but writes only those that differ from what's stored.
  assert.deepEqual(db.log.at(-1)!.puts.map(p => p.split('\u0000')[1]).sort(), ['meta', 'tape']);
  assert.deepEqual(store.game.get('book'), book, 'the book is not taken back');
  let cps = await store.checkpoints();
  assert.deepEqual(cps.map(c => c.name), ['Before restoring “Two rolls in”', 'Two rolls in']);

  // 5: the restore is undone by restoring what it made.
  advance(1000);
  await store.restore(cps[0]!.id);
  assert.equal(rolls(store), 3);

  // 6: End, as Register does it.
  advance(1000);
  await store.checkpoint(`End of conflict, round ${(store.game.get('meta') as Meta).round}`, true);
  store.game.change(w => w.put('meta', { ...(store.game.get('meta') as Meta), round: 0 }));
  await store.save();
  assert.equal((store.game.get('meta') as Meta).round, 0);
  cps = await store.checkpoints();
  assert.equal(cps[0]!.name, 'End of conflict, round 2');

  // 7: what the Ledger shows.
  assert.equal(store.current!.name, PLAYTEST);
  assert.match(store.status(), /^Saved \d\d:\d\d:\d\d$/);
  assert.equal(cps.length, 4);
  assert.equal((await store.list()).length, 1);

  // 8: automatic checkpoints keep the newest 20; named ones are all kept.
  for (let i = 0; i < 25; i++) { advance(1000); await store.checkpoint(`auto ${i}`, true); }
  cps = await store.checkpoints();
  const autos = cps.filter(c => c.auto);
  assert.equal(autos.length, KEEP_AUTO);
  assert.equal(autos[0]!.name, 'auto 24');
  assert.equal(autos.at(-1)!.name, 'auto 5');
  assert.deepEqual(cps.filter(c => !c.auto).map(c => c.name), ['Two rolls in']);
});

test('games and copies', async () => {
  const db = new MemoryDb(), { clock, advance } = fakeClock(), storage = memoryStorage();
  const store = new GameStore(db, clock, storage);
  const first = await store.start();
  advance(1000);
  const second = await store.add('Second table');
  await store.open(second.id);
  store.game.change(w => w.put('meta', { round: 3, rolls: 0 }));
  advance(1000);
  await store.open(first.id);
  assert.equal((store.game.get('meta') as Meta).round, 0);
  assert.equal(store.game.all().filter(([rid]) => rid.startsWith('o:')).length, 9);
  advance(1000);
  await store.open(second.id);
  assert.equal((store.game.get('meta') as Meta).round, 3);
  assert.equal(store.game.all().filter(([rid]) => rid.startsWith('o:')).length, 0, 'a new game has no pieces');
  assert.deepEqual((await store.list()).map(g => g.name), ['Second table', PLAYTEST]);

  advance(1000);
  const copy = await store.copyFor('room-1');
  assert.equal(copy.id, 'm-room-1');
  assert.equal(storage.data.get(LAST), second.id, 'the copy is never last');
  assert.deepEqual((await store.list()).map(g => g.name), ['Second table', PLAYTEST], 'nor listed');
});

test("a restore's checkpoint names never nest", () => {
  // R292.
  assert.equal(beforeRestoring('Two rolls in'), 'Before restoring “Two rolls in”');
  assert.equal(beforeRestoring('Before restoring “Two rolls in”'), 'Before undoing “Two rolls in”');
  assert.equal(beforeRestoring('Before undoing “Two rolls in”'), 'Before undoing “Two rolls in”');
});

test('a save that fails says why, and is tried again', async () => {
  // R291.
  const db = new MemoryDb(), { clock, advance } = fakeClock();
  const store = new GameStore(db, clock, memoryStorage());
  await store.start();
  const tx = db.tx.bind(db);
  db.tx = (() => Promise.reject(new Error('the disk is full'))) as typeof db.tx;
  store.game.change(w => w.put('meta', { round: 4, rolls: 0 }));
  advance(400);
  await store.save();
  assert.equal(store.status(), 'Not saved: the disk is full');
  db.tx = tx;
  await store.save();
  assert.match(store.status(), /^Saved \d\d:\d\d:\d\d$/);
  assert.equal(((await store.read(store.current!.id)).records.find(([rid]) => rid === 'meta')![1] as Meta).round, 4);
});
