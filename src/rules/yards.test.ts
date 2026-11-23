// CRC: crc-Yards.md | Test: test-Yards.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Hill, PieceRecord, Rec, Rid, Sticky, TornRoll, Yards } from '../model/records.ts';
import { bury, burialOf, buryInfo, buryOwn, empty, exhume, exhumeOwn, forgetOwnIn, lastCard, ownIn, ownTorn, withInfo, forget, forgetAll, next, prev, raised, rename, type Browse } from './yards.ts';
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
  // R119: and with what lies in its pool's slots: Beauford's Stagger chip.
  assert.deepEqual(burialOf(piece(BEAUFORD), all).map(r => r.oid), [BEAUFORD, '00000007']);
});

test('a burial comes up under the pointer, with everything on it', () => {
  // R120: a character by its pool, grabbed near its top left; its card and pinned paper move with it.
  const sam = piece(SAM), all = burialOf(sam, records), up = raised(all, { x: 1000, y: 800 }, 77);
  const c = up[0] as Character;
  assert.deepEqual([c.pool.x, c.pool.y, c.pool.z], [970, 786, 77]);
  assert.deepEqual([c.card.x - c.pool.x, c.card.y - c.pool.y], [sam.card.x - sam.pool.x, sam.card.y - sam.pool.y]);
  const dx = c.pool.x - sam.pool.x, dy = c.pool.y - sam.pool.y;
  for (const [i, r] of up.entries()) if ('place' in r) {
    const was = (all[i] as Extract<PieceRecord, { place: unknown }>).place;
    assert.deepEqual([r.place.x - was.x, r.place.y - was.y, r.place.z], [dx, dy, 77]);
  }
  // Anything else by its own place, grabbed 20, 14 in.
  const note = records.find(r => r.kind === 'sticky')!;
  const [n] = raised([note], { x: 100, y: 50 }, 3) as Extract<PieceRecord, { place: unknown }>[];
  assert.deepEqual([n!.place.x, n!.place.y, n!.place.z], [80, 36, 3]);
  assert.deepEqual(raised([], { x: 0, y: 0 }, 1), []);
});

test('an Info card is buried with its place and words, and comes back there', () => {
  // R403: buried named after its NPC; R405: exhumed it gives back the card; withInfo puts it at its
  // place, or last when fewer remain. R404: the newest whose NPC is here.
  const c = scene().find((r): r is Character => r.kind === 'character' && r.oid === DEVREUX)!;
  let y = buryInfo(empty(), 0, 'Devreux', { oid: DEVREUX, k: 1, text: 'ANY: old' }, '0000aaaa');
  y = buryInfo(y, 0, ' ', { oid: SAM, k: 0, text: 'ANY: Sam' }, '0000bbbb');
  assert.deepEqual(y.yards[0]!.items.map(b => b.name), ['Devreux: Info card', 'Nameless: Info card']);
  assert.deepEqual(lastCard(y, 0, () => true), { yard: 0, item: 1 });
  assert.deepEqual(lastCard(y, 0, b => b.info?.oid === DEVREUX), { yard: 0, item: 0 });
  assert.equal(lastCard(y, 0, () => false), null);
  const dug = exhume(y, 0, { yard: 0, item: 0 });
  assert.deepEqual(dug.info, { oid: DEVREUX, k: 1, text: 'ANY: old' });
  assert.deepEqual(dug.records, []);
  assert.deepEqual(withInfo({ ...c, info: ['a', 'b'] }, dug.info!), { character: { ...c, info: ['a', 'ANY: old', 'b'] }, k: 1 });
  assert.deepEqual(withInfo({ ...c, info: undefined }, dug.info!), { character: { ...c, info: ['ANY: old'] }, k: 0 });
  assert.equal('info' in exhume(empty(), 0, { yard: 0, item: 0 }), false);
});

const roll = (oid: string, title: string): TornRoll => ({ kind: 'tornroll', oid, place: { x: 0, y: 0, z: 0, tilt: 0 },
  receipts: [{ id: oid, at: 1, title, dice: [], resolution: '', level: '', outcome: '' }] });

test("this page's own burials, in the graveyard they went to", () => {
  // R488, R489
  const y: Yards = { yards: [{ name: 'Graveyard 1', named: false, items: [] }, { name: 'Saloon', named: true, items: [] }] };
  let h: Hill = { hill: [] };
  h = buryOwn(h, 'Saloon', [roll('a0000001', 'one')], 'Tape: 1 rolls, last one');
  h = buryOwn(h, 'Gone', [roll('a0000002', 'two')], 'Tape: 1 rolls, last two');
  h = buryOwn(h, 'Graveyard 1', [roll('a0000003', 'three')], 'Tape: 1 rolls, last three');
  assert.deepEqual(ownIn(h, y, 1), [0], "Saloon's own");
  assert.deepEqual(ownIn(h, y, 0), [1, 2], "the first: its own, and the one whose graveyard is gone");
  const dug = exhumeOwn(h, 0);
  assert.equal((dug.records[0] as TornRoll).receipts[0]!.title, 'one');
  assert.equal(dug.hill.hill.length, 2);
  assert.deepEqual(forgetOwnIn(h, y, 0).hill.map(o => o.yard), ['Saloon'], 'emptying the first leaves Saloon\'s');
});

test('torn rolls shared before become the GM\'s own', () => {
  // R487
  const sticky: Sticky = { kind: 'sticky', oid: '00000008', place: { x: 0, y: 0, z: 0, tilt: 0 }, text: 'hi' };
  const old = roll('0000000f', 'on the table');
  const all: [Rid, Rec][] = [['o:00000008', sticky], ['o:0000000f', old]];
  const y: Yards = { yards: [
    { name: 'Graveyard 1', named: false, items: [{ name: 'Note: hi', records: [sticky] }, { name: 'Tape: 1 rolls', records: [roll('00000010', 'buried')] }] },
    { name: 'Saloon', named: true, items: [{ name: 'Tape: 1 rolls', records: [roll('00000011', 'there')] }] }] };
  const { puts, dels } = ownTorn(all, y, undefined);
  assert.deepEqual(dels, ['o:0000000f']);
  const put = new Map(puts);
  assert.ok(put.has('yards') && put.has('hill'), 'the buried tapes leave the shared Boot Hill');
  assert.deepEqual(put.get('t:0000000f'), old, 'moved under t:');
  assert.deepEqual((put.get('yards') as Yards).yards.map(g => g.items.map(b => b.name)), [['Note: hi'], []], 'the sticky stays shared');
  assert.deepEqual((put.get('hill') as Hill).hill.map(o => [o.yard, (o.burial.records[0] as TornRoll).receipts[0]!.title]),
    [['Graveyard 1', 'buried'], ['Saloon', 'there']]);
  const again = ownTorn([['o:00000008', sticky], ['t:0000000f', old]], put.get('yards') as Yards, put.get('hill') as Hill);
  assert.deepEqual(again, { puts: [], dels: [] }, 'a second pass has nothing to move');
});
