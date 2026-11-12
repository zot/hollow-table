// CRC: crc-Yards.md | Test: test-Yards.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, PieceRecord, Yards } from '../model/records.ts';
import { bury, burialOf, empty, exhume, forget, forgetAll, next, prev, rename, type Browse } from './yards.ts';
import { BEAUFORD, DEVREUX, SAM, scene } from '../store/playtest.ts';

const records = scene();
const piece = (oid: string) => records.find(r => r.oid === oid)! as Character;
const show = ({ yards, cur }: Browse) => yards.yards.map((g, i) =>
  `${i === cur ? '*' : ''}${g.name || 'Unnamed graveyard'}[${g.items.map(b => b.name).join(', ')}]`).join(', ');
const put = (b: Browse, oid: string): Browse => ({ yards: bury(b.yards, b.cur, burialOf(piece(oid), records), piece(oid).name), cur: b.cur });
const fresh = (): Browse => ({ yards: empty(), cur: 0 });

test('graveyards', () => {
  let b = put(fresh(), SAM);                                                    // 1
  assert.equal(show(b), '*Graveyard 1[Sam]');

  const two: Yards = { yards: [{ name: 'Graveyard 2', named: false, items: [{ name: 'x', records: [] }] }] };
  b = { yards: two, cur: 0 };                                                   // 2
  assert.equal(show(b), '*Graveyard 2[x]');
  b = next(b.yards, b.cur);                                                     // 3
  assert.equal(show(b), 'Graveyard 2[x], *Graveyard 3[]');
  b = prev(b.yards, b.cur);                                                     // 4
  b = next(b.yards, b.cur);
  assert.equal(show(b), 'Graveyard 2[x], *Graveyard 3[]');

  b = put(fresh(), SAM);                                                        // 5
  b = next(b.yards, b.cur);
  assert.equal(show(b), 'Graveyard 1[Sam], *Graveyard 2[]');
  assert.equal(show(next(b.yards, b.cur)), show(b));
  b = put(b, BEAUFORD);                                                         // 6
  assert.equal(show(b), 'Graveyard 1[Sam], *Graveyard 2[Beauford]');
  b = rename(b.yards, b.cur, 'Old timers');
  b = prev(b.yards, b.cur);                                                     // 7
  const out = exhume(b.yards, b.cur, { yard: 0, item: 0 });
  assert.equal(out.records[0]!.oid, SAM);
  assert.equal(show(out), '*Old timers[Beauford]');
  b = next(out.yards, out.cur);                                                 // 8
  assert.equal(show(b), 'Old timers[Beauford], *Graveyard 1[]');
  b = prev(b.yards, b.cur);
  assert.equal(show(b), '*Old timers[Beauford]');
  for (let i = 0; i < 3; i++) b = prev(next(b.yards, b.cur).yards, 1);           // 9
  b = next(b.yards, b.cur);
  assert.equal(show(b), 'Old timers[Beauford], *Graveyard 1[]');
  b = prev(b.yards, b.cur);
  const left = exhume(b.yards, b.cur, { yard: 0, item: 0 });                    // 10
  assert.equal(show(left), '*Old timers[]');
  b = rename(left.yards, left.cur, '');                                         // 11
  assert.equal(show(b), '*Unnamed graveyard[]');
});

test('deleting forever', () => {
  const note: PieceRecord = records.find(r => r.kind === 'sticky')!;
  let b = put(put(fresh(), SAM), BEAUFORD);                                     // 1
  b = { ...b, yards: bury(b.yards, b.cur, [note], 'Note: Find: How did Trudy…') };
  assert.equal(show(b), '*Graveyard 1[Sam, Beauford, Note: Find: How did Trudy…]');
  // 2, 3: the arming and its 3 s revert are BootHillView's; the rules only delete.
  b = forget(b.yards, b.cur, { yard: 0, item: 0 });                             // 4
  assert.equal(show(b), '*Graveyard 1[Beauford, Note: Find: How did Trudy…]');
  b = forgetAll(b.yards, b.cur);                                                // 5
  assert.equal(show(b), '*Graveyard 1[]');
});

test('a character is buried with its cards and what is pinned to it', () => {
  const pinned: PieceRecord = { kind: 'sticky', oid: '0000000b', place: { x: 0, y: 0, z: 0, tilt: 0 }, text: 'x', pin: { card: DEVREUX, dx: 1, dy: 1 } };
  const all = [...records, pinned];
  assert.deepEqual(burialOf(piece(DEVREUX), all).map(r => r.oid), [DEVREUX, '00000004', '00000005', '00000006', '0000000b']);
});
