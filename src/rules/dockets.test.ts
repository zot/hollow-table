// CRC: crc-Dockets.md | Test: test-Dockets.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Docket, PieceRecord, Rid, Sticky } from '../model/records.ts';
import { CORD, PILE_GAP, PILE_STEP, RADIUS, aimed, hull, path, pile, repin, tapeOf, touches, type Box } from './dockets.ts';

const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });

test('the hull and its path', () => {
  // The inner box's corners are inside the outer's hull, so only the outer four stay.
  const t = tapeOf([box(0, 0, 100, 100), box(20, 20, 10, 10)]);
  assert.equal(t.hull.length, 4);
  const d = path(t);
  assert.equal(d.match(/A/g)?.length, 4, 'an arc a corner');
  assert.equal(d.match(/L/g)?.length, 4, 'a line an edge');
  // Two boxes side by side: the outer corners of both, four.
  assert.equal(tapeOf([box(0, 0, 10, 10), box(50, 0, 10, 10)]).hull.length, 4);
  // One point is a circle.
  assert.match(path({ hull: [{ x: 5, y: 5 }], r: 3 }), /^M2,5a3,3 0 1 0 6,0a3,3 0 1 0 -6,0Z$/);
  assert.deepEqual(hull([{ x: 1, y: 1 }]), [{ x: 1, y: 1 }]);
});

test('the touch test', () => {
  const t = tapeOf([box(0, 0, 100, 100)]), reach = RADIUS + CORD / 2;
  assert.equal(touches(t, box(40, 40, 10, 10)), true, 'inside');
  assert.equal(touches(t, box(-50, -50, 300, 300)), true, 'holding it whole');
  assert.equal(touches(t, box(100 + reach - 1, 40, 20, 20)), true, 'on the cord at a side');
  // Off the corner (100, 100) along the diagonal: within the arc's reach, and just past it.
  const d = (reach - 1) / Math.SQRT2, e = (reach + 1) / Math.SQRT2;
  assert.equal(touches(t, box(100 + d, 100 + d, 20, 20)), true, 'round the arc');
  assert.equal(touches(t, box(100 + e, 100 + e, 20, 20)), false, 'just past the arc');
  assert.equal(touches(t, box(500, 500, 10, 10)), false, 'far away');
});

test('crossing shapes', () => {
  // A tall thin tape and a wide thin box across its middle: no corner of either in the other.
  const t = tapeOf([box(0, 0, 4, 400)]);
  assert.equal(touches(t, box(-200, 190, 400, 4)), true);
});

test('the docket on top', () => {
  const tape = tapeOf([box(0, 0, 100, 100)]);
  assert.equal(aimed([{ oid: 'a', z: 3, tape }, { oid: 'b', z: 7, tape }], box(10, 10, 5, 5)), 'b');
  assert.equal(aimed([{ oid: 'a', z: 3, tape }], box(900, 900, 5, 5)), null);
});

test("a tied docket's pile", () => {
  const at = pile(box(100, 100, 120, 40), [{ rid: 'o:a', z: 5 }, { rid: 'o:b', z: 2 }, { rid: 'o:c', z: 9 }]);
  const y = 140 + PILE_GAP;
  assert.deepEqual(at.get('o:b'), { x: 100, y });
  assert.deepEqual(at.get('o:a'), { x: 100 + PILE_STEP, y: y + PILE_STEP });
  assert.deepEqual(at.get('o:c'), { x: 100 + 2 * PILE_STEP, y: y + 2 * PILE_STEP });
});

const place = (x: number, y: number) => ({ x, y, z: 1, tilt: 0 });
const card = { kind: 'character', oid: 'c0000001', owner: 'GM', name: 'Devreux', pool: place(0, 0), card: place(300, 300), flipped: false, gathered: false } as unknown as Character;
const docket: Docket = { kind: 'docket', oid: 'd0000001', place: place(500, 500), name: 'Clues' };
const note = (oid: string, pin: string, x: number, y: number, mine = false): Sticky =>
  ({ kind: 'sticky', oid, place: place(x, y), text: oid, pin: { card: pin, dx: 10, dy: 20 }, ...(mine && { by: 'Sam', mine: true as const }) });

test('paper follows its holder', () => {
  const all: [Rid, PieceRecord][] = [
    ['o:c0000001', card], ['o:d0000001', docket],
    ['o:a0000001', note('a0000001', 'c0000001', 0, 0)],                 // left behind by the card's move
    ['m:a0000002', note('a0000002', 'd0000001', 0, 0, true)],           // a page's own, left behind by the docket's
    ['o:a0000003', note('a0000003', 'd0000001', 510, 520)],             // where it belongs
  ];
  const gm = repin(all, true, () => false);
  assert.deepEqual(gm.map(p => [p.rid, p.rec.place.x, p.rec.place.y]), [['o:a0000001', 310, 320], ['m:a0000002', 510, 520]]);
  assert.deepEqual(repin(all, false, () => false).map(p => p.rid), ['m:a0000002'], "a player's page moves only its own");
  // A gathered card is drawn under its pool, not where its record says: nothing follows it.
  assert.deepEqual(repin([['o:c0000001', { ...card, gathered: true }], all[2]!], true, () => false), []);
});

test('paper whose holder is gone', () => {
  const all: [Rid, PieceRecord][] = [['o:a0000001', note('a0000001', 'd0000009', 40, 50)]];
  const gone = (oid: string) => oid === 'd0000009';
  const [p] = repin(all, true, gone);
  assert.equal(p!.rec.pin, undefined);
  assert.deepEqual([p!.rec.place.x, p!.rec.place.y], [40, 50]);
  assert.deepEqual(repin(all, false, gone), [], "a player's page leaves the table's paper alone");
  assert.deepEqual(repin(all, true, () => false), [], 'a holder merely not here (a "just me" docket elsewhere) keeps it');
});
