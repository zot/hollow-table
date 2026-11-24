// CRC: crc-Drawers.md | Test: test-Drawers.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, type Character, type Chip, type PieceRecord, type Sticky, type TornRoll } from '../model/records.ts';
import { drawerOf, drawers, emptyDesk, filed, inDrawer, search, takeOut } from './drawers.ts';
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
  let d = filed(emptyDesk(), 'npcs', dev, 'Mistress Devreux');
  d = filed(d, 'papers', [sticky], 'Note: shopping');
  assert.deepEqual(inDrawer(d, 'npcs').map(({ k, entry }) => [k, entry.name, entry.records.length]), [[0, 'Mistress Devreux', dev.length]]);
  assert.ok(dev.length > 1 && dev.slice(1).every(r => r.kind === 'influence'), 'with its Influence cards');
  const out = takeOut(d, 0);
  assert.deepEqual(out.records, dev, 'as filed');
  assert.deepEqual(out.desk.desk.map(e => e.name), ['Note: shopping'], 'the rest stays');
  assert.deepEqual(inDrawer(undefined, 'papers'), [], 'no desk: nothing filed');
});

const found = (d: ReturnType<typeof emptyDesk>, q: string) => search(d, q).map(e => e.entry.name);
const at = { x: 0, y: 0, z: 1, tilt: 0 };
const with_ = (oid: string, name: string, front: string): Character => ({ ...char(DEVREUX), oid, name, front });

test('searching the desk', () => {
  let d = emptyDesk();
  d = filed(d, 'npcs', [with_('00000003', 'Devreux', '<head>Devreux</head>\nSkills 3: Savvy')], 'Devreux');
  const note: Sticky = { kind: 'sticky', oid: 'aa000001', place: at, text: 'buy rope\nthe <b>coach</b> left at dawn' };
  d = filed(d, 'papers', [note], 'Note: buy rope');
  d = filed(d, 'characters', [char(SAM)], 'Sam');
  d = filed(d, 'papers', [{ kind: 'docket', oid: 'dd000001', place: at, name: 'Clues' }], 'Docket: Clues');
  assert.deepEqual(found(d, ''), ['Devreux', 'Docket: Clues', 'Note: buy rope', 'Sam']);
  assert.deepEqual(found(d, '  sam '), ['Sam']);
  assert.deepEqual(found(d, 'COACH dawn'), ['Note: buy rope']);
  assert.deepEqual(found(d, 'savvy'), ['Devreux']);
  assert.deepEqual(found(d, 'nobody'), []);
  assert.deepEqual(search(undefined, ''), []);
});

test('names first', () => {
  let d = emptyDesk();
  d = filed(d, 'npcs', [with_('00000010', 'Zeke', 'Zeke')], 'Zeke');
  d = filed(d, 'npcs', [with_('00000011', 'Ann', 'Ann, an amaze of a woman')], 'Ann');
  assert.deepEqual(found(d, 'ze'), ['Zeke', 'Ann']);
});

