// CRC: crc-PoolView.md | Test: test-PoolView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chipFace, insertAt, openSlots, pops, reachFor, type Shown } from './pool.ts';

const none = [false, false, false, false, false, false, false];
const show = (...e: [string, number, string][]): Shown => new Map(e.map(([k, points, place]) => [k, { points, place }]));

test('slots fill the mat', () => {
  // Empty: Bonus, Main, Edge and Stagger fit; Bias, Affliction and Injury are strips at the right.
  assert.deepEqual(openSlots(none), [true, true, true, true, false, false, false]);
  // Injury holding something stays open; the first slot that doesn't fit ends the opening.
  assert.deepEqual(openSlots([false, false, false, false, false, false, true]), [true, true, true, false, false, false, true]);
  // The first N: where Stagger doesn't fit but Bias would, Bias stays a strip all the same.
  assert.deepEqual(openSlots([false, false, false, false, false, false, true], 445), [true, true, true, false, false, false, true]);
  // Every slot holding something is open, even past the mat's width.
  assert.deepEqual(openSlots([true, true, true, true, true, true, true]), [true, true, true, true, true, true, true]);
  // Wide enough for all.
  assert.deepEqual(openSlots(none, 1000), [true, true, true, true, true, true, true]);
});

test('what pops', () => {
  const before = show(['a', 2, 'main'], ['b', 2, 'main'], ['c', 2, 'main'], ['d', 4, 'drawer']);
  assert.deepEqual(pops(undefined, before), new Set(), 'nothing on the first draw');
  assert.deepEqual(pops(undefined, show(['pile:a', 4, 'main'])), new Set(), 'not even a pile that was already there');
  // Three 2s Roll Up into a new 4: it pops. A card's Level changing pops.
  assert.deepEqual(pops(before, show(['e', 4, 'main'], ['d', 6, 'drawer'])), new Set(['e', 'd']));
  // A chip dropped into a slot from elsewhere doesn't pop; a pile that forms does.
  assert.deepEqual(pops(show(['a', 2, 'main']), show(['a', 2, 'main'], ['f', 4, 'main'])), new Set());
  assert.deepEqual(pops(before, show(['pile:a', 4, 'main'], ['d', 4, 'drawer'])), new Set(['pile:a']));
});

test('where a card goes in a drawer', () => {
  // Two rows: A B on the first, C on the second.
  const box = (left: number, top: number) => ({ left, top, right: left + 100, bottom: top + 40 });
  const cards = [box(0, 0), box(110, 0), box(0, 50)];
  assert.equal(insertAt(cards, 10, 20), 0, 'before A');
  assert.equal(insertAt(cards, 90, 20), 1, 'past A’s middle: before B');
  assert.equal(insertAt(cards, 300, 20), 2, 'past the first row: before C');
  assert.equal(insertAt(cards, 90, 70), 3, 'past C: last');
  assert.equal(insertAt([], 5, 5), 0);
});

test('a carry over a strip trades space', () => {
  const T = true, F = false;
  const none = [F, F, F, F, F, F, F];
  // The −2 lifted from Stagger, now empty, over the Bias strip: Stagger pays.
  assert.deepEqual(reachFor(none, 4, 3), [T, T, T, F, T, F, F]);
  // Back over Stagger: it's open again, nothing traded.
  assert.deepEqual(reachFor(none, 3, 3), openSlots(none));
  // From Main, which still holds chips, over Injury: the first empty slot left of Main pays (Bonus).
  assert.deepEqual(reachFor([F, T, F, F, F, F, F], 6, 1), [F, T, T, T, F, F, T]);
  // From elsewhere, over Affliction: the first empty open slot left of it pays (Stagger).
  assert.deepEqual(reachFor(none, 5, null), [T, T, T, F, F, T, F]);
  // Nothing empty to close: the mat grows by that one slot.
  assert.deepEqual(reachFor([T, T, T, T, F, F, F], 4, null), [T, T, T, T, T, F, F]);
});

test('a chip\'s face', () => {
  // R285: a +1 reads "+1" (a red one "−1"); other chips show their points, a red one its sign.
  assert.deepEqual([[1, 1], [-1, 1], [1, 4], [-1, 6]].map(([sign, points]) => chipFace({ sign: sign!, points: points! })), ['+1', '−1', '4', '−6']);
});
