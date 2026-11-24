// CRC: crc-Drawers.md | Test: test-Drawers.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, type Character, type Chip, type PieceRecord, type Sticky, type TornRoll } from '../model/records.ts';
import { deskNext, deskPrev, deskRename, desksOf, drawerOf, drawers, emptyDesk, filed, inDrawer, search, takeOut } from './drawers.ts';
import { burialOf } from './yards.ts';
import { DEVREUX, SAM, scene } from '../store/playtest.ts';

const records = scene('Dana', 'Ann');
const char = (oid: string) => records.find((r): r is Character => r.kind === 'character' && r.oid === oid)!;

test('what files where, and filing and taking out', () => {
  // R521, R522: by kind and owner, on the GM's page and on a player's.
  const at = { x: 0, y: 0, z: 0, tilt: 0 };
  const open: Character = { ...char(SAM), oid: '0000c001', owner: OPEN };
  const sticky: Sticky = { kind: 'sticky', oid: '0000e001', place: at, text: 'shopping' };
  const chip: Chip = { kind: 'chip', oid: '0000e002', where: { table: at }, n: 0, sign: 1, points: 2, rider: false };
  const roll: TornRoll = { kind: 'tornroll', oid: '0000e003', place: at, receipts: [] };
  const pieces: PieceRecord[] = [char(DEVREUX), char(SAM), open, sticky, chip, roll];
  assert.deepEqual(pieces.map(p => drawerOf(p, true)), ['npcs', 'characters', 'characters', 'papers', null, null], "the GM's desk");
  assert.deepEqual(pieces.map(p => drawerOf(p, false)), [null, null, null, 'papers', null, null], "a player's: paper only");
  assert.deepEqual(drawers(true), ['characters', 'npcs', 'papers']);
  assert.deepEqual(drawers(false), ['papers']);
  // R523, R527: filed at the end of its drawer with what a burial takes; taken out as filed.
  const dev = burialOf(char(DEVREUX), records);
  let d = filed(emptyDesk(), 0, 'npcs', dev, 'Mistress Devreux');
  d = filed(d, 0, 'papers', [sticky], 'Note: shopping');
  assert.deepEqual(inDrawer(d, 0, 'npcs').map(({ k, entry }) => [k, entry.name, entry.records.length]), [[0, 'Mistress Devreux', dev.length]]);
  assert.ok(dev.length > 1 && dev.slice(1).every(r => r.kind === 'influence'), 'with its Influence cards');
  const out = takeOut(d, 0, 0);
  assert.deepEqual(out.records, dev, 'as filed');
  assert.deepEqual(out.desk.desks[0]!.items.map(e => e.name), ['Note: shopping'], 'the rest stays');
  assert.deepEqual(inDrawer(emptyDesk(), 0, 'papers'), [], 'no desk: nothing filed');
});

const found = (d: ReturnType<typeof emptyDesk>, q: string) => search(d, q).map(e => e.entry.name);
const at = { x: 0, y: 0, z: 1, tilt: 0 };
const with_ = (oid: string, name: string, front: string): Character => ({ ...char(DEVREUX), oid, name, front });

test('searching the desk', () => {
  let d = emptyDesk();
  d = filed(d, 0, 'npcs', [with_('00000003', 'Devreux', '<head>Devreux</head>\nSkills 3: Savvy')], 'Devreux');
  const note: Sticky = { kind: 'sticky', oid: 'aa000001', place: at, text: 'buy rope\nthe <b>coach</b> left at dawn' };
  d = filed(d, 0, 'papers', [note], 'Note: buy rope');
  d = filed(d, 0, 'characters', [char(SAM)], 'Sam');
  d = filed(d, 0, 'papers', [{ kind: 'docket', oid: 'dd000001', place: at, name: 'Clues' }], 'Docket: Clues');
  assert.deepEqual(found(d, ''), ['Devreux', 'Docket: Clues', 'Note: buy rope', 'Sam']);
  assert.deepEqual(found(d, '  sam '), ['Sam']);
  assert.deepEqual(found(d, 'COACH dawn'), ['Note: buy rope']);
  assert.deepEqual(found(d, 'savvy'), ['Devreux']);
  assert.deepEqual(found(d, 'nobody'), []);
  assert.deepEqual(search(emptyDesk(), ''), []);
});

test('names first', () => {
  let d = emptyDesk();
  d = filed(d, 0, 'npcs', [with_('00000010', 'Zeke', 'Zeke')], 'Zeke');
  d = filed(d, 0, 'npcs', [with_('00000011', 'Ann', 'Ann, an amaze of a woman')], 'Ann');
  assert.deepEqual(found(d, 'ze'), ['Zeke', 'Ann']);
});

test("the GM's desks, browsed as graveyards", () => {
  const names = (b: { desk: ReturnType<typeof emptyDesk>; cur: number }) => [b.desk.desks.map(x => x.name || '·').join(), b.cur];
  // R551: › past the last makes "Desk N", one past the highest; not past an empty, nameless one.
  assert.deepEqual(names(deskNext(emptyDesk(), 0)), ['Desk 1', 0], 'nothing past an empty nameless one');
  const first = filed(emptyDesk(), 0, 'papers', [{ kind: 'sticky', oid: 'aa000001', place: at, text: 'x' }], 'Note: x');
  let b = deskNext(first, 0);
  assert.deepEqual(names(b), ['Desk 1,Desk 2', 1]);
  assert.deepEqual(names(deskNext(b.desk, b.cur)), ['Desk 1,Desk 2', 1], 'no third past an empty nameless one');
  b = deskRename(b.desk, 1, ' Act 2 ');
  assert.deepEqual(names(b), ['Desk 1,Act 2', 1]);
  b = { desk: filed(b.desk, 1, 'npcs', [char(DEVREUX)], 'Devreux'), cur: 1 };
  b = deskNext(b.desk, b.cur);
  assert.deepEqual(names(b), ['Desk 1,Act 2,Desk 2', 2], 'numbered past the highest Desk N');
  // Left empty and nameless, it goes; named or holding something, it stays; the only one is kept.
  assert.deepEqual(names(deskPrev(b.desk, 2)), ['Desk 1,Act 2', 1]);
  const erased = deskRename(b.desk, 1, '');
  assert.deepEqual(names(erased), ['Desk 1,·,Desk 2', 1], 'erased but not empty: kept, nameless');
  assert.deepEqual(names(deskPrev(emptyDesk(), 0)), ['Desk 1', 0]);
  assert.deepEqual(names(deskRename(emptyDesk(), 0, '')), ['·', 0], 'the only one is kept');
  // R556: search reads every desk, with each entry's desk.
  const two = filed(b.desk, 0, 'papers', [{ kind: 'sticky', oid: 'aa000002', place: at, text: 'Devreux owes' }], 'Note: Devreux owes');
  assert.deepEqual(search(two, 'devreux').map(e => [e.entry.name, e.at, e.k]), [['Devreux', 1, 0], ['Note: Devreux owes', 0, 1]]);
});

test('a desk from before reads as one desk', () => {
  // R550: one list of entries, as #65 saved it, is "Desk 1".
  const old = { desk: [{ drawer: 'npcs' as const, name: 'Devreux', records: [char(DEVREUX)] }] };
  const d = desksOf(old);
  assert.deepEqual(d.desks.map(x => [x.name, x.named, x.items.length]), [['Desk 1', false, 1]]);
  assert.deepEqual(desksOf(undefined), emptyDesk());
  assert.deepEqual(desksOf({ desks: [] }), emptyDesk());
});

