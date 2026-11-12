// CRC: crc-Seat.md | Test: test-Seat.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, load, prune, save, seatKey, type Seat } from './seat.ts';
import { memoryStorage } from './fakes.ts';
import { ridOf } from '../model/records.ts';
import { BEAUFORD, DEVREUX, SAM } from './playtest.ts';

test('the seat on its own', () => {
  const storage = memoryStorage();
  const gm: Seat = {
    ...fresh(),
    view: { x: -120, y: 40, zoom: 1.5 },
    roller: { pool: DEVREUX, action: 'Attack', opponent: SAM, defend: 'mental', row: 'green', byHand: true,
      hand: { yellows: 2, bonus: 0 }, dice: [] },
    tapeUp: true, boothill: { cur: 0, open: true },
    open: { used: [DEVREUX, BEAUFORD], piles: [], slots: [`${SAM}:main`], columns: [`${DEVREUX}:injury`, `${BEAUFORD}:bias`] },
  };
  const p2: Seat = { ...fresh(), view: { x: 5, y: 5, zoom: 1 } };
  save(storage, 'a', 'GM', gm);
  save(storage, 'a', 'Player 2', p2);
  assert.deepEqual(load(storage, 'a', 'GM'), gm);
  assert.deepEqual(load(storage, 'a', 'Player 2'), p2);
  assert.deepEqual(load(storage, 'b', 'GM'), fresh());
  assert.deepEqual([...storage.data.keys()].sort(), [seatKey('a', 'GM'), seatKey('a', 'Player 2')]);

  // Blocked storage: a fresh seat, and saving says nothing.
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(load(blocked, 'a', 'GM'), fresh());
  assert.doesNotThrow(() => save(blocked, 'a', 'GM', gm));
  storage.setItem(seatKey('a', 'GM'), '{not json');
  assert.deepEqual(load(storage, 'a', 'GM'), fresh());

  // A restore where Sam and Devreux are gone.
  const left = new Set([ridOf(BEAUFORD)]);
  const pruned = prune(gm, rid => left.has(rid), 1);
  assert.equal(pruned.roller, null);
  assert.deepEqual(pruned.open, { used: [BEAUFORD], piles: [], slots: [], columns: [`${BEAUFORD}:bias`] });
  assert.deepEqual(pruned.view, gm.view);
  // Only the opponent gone: the roller stays, aimed at nobody.
  const aimed = prune(gm, rid => rid !== ridOf(SAM), 1);
  assert.deepEqual([aimed.roller?.pool, aimed.roller?.opponent], [DEVREUX, null]);
});

test('a first visit has no view', () => {
  // R271: the table fits itself until a view is kept; a kept view comes back.
  const storage = memoryStorage();
  assert.equal(fresh().view, null);
  assert.equal(load(storage, 'g', 'GM').view, null);
  save(storage, 'g', 'GM', { ...fresh(), view: { x: 3, y: 4, zoom: 0.5 } });
  assert.deepEqual(load(storage, 'g', 'GM').view, { x: 3, y: 4, zoom: 0.5 });
  storage.setItem(seatKey('g', 'P'), JSON.stringify({ view: { zoom: 2 } }));
  assert.deepEqual(load(storage, 'g', 'P').view, { x: 0, y: 0, zoom: 2 }, 'a partial view is filled in');
});
