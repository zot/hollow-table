// CRC: crc-Desktops.md | Test: test-Desktops.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN, ridFor, type Character, type Desk, type Docket, type PieceRecord, type Rid, type Sticky } from '../model/records.ts';
import { setOut, travelers } from './desktops.ts';
import { emptyDesk } from './drawers.ts';
import { BEAUFORD, DEVREUX, SAM, scene } from '../store/playtest.ts';

const at = (x: number, y: number) => ({ x, y, z: 1, tilt: 0 });
const base = scene('Dana', 'Ann');
const char = (oid: string) => base.find((r): r is Character => r.kind === 'character' && r.oid === oid)!;
const note = (oid: string, by: string | undefined, pin?: string): Sticky =>
  ({ kind: 'sticky', oid, place: at(10, 10), text: oid, ...(by && { by }), ...(pin && { pin: { card: pin, dx: 1, dy: 1 } }) });

test('who travels', () => {
  const open: Character = { ...char(SAM), oid: '0000c001', name: 'Waiting', owner: OPEN };
  const docket: Docket = { kind: 'docket', oid: 'dd000001', place: at(0, 0), name: 'Sam\'s', by: 'Dana' };
  const extra: PieceRecord[] = [open, docket,
    note('a0000001', 'Dana', DEVREUX),        // a player's note on an NPC: travels, it's hers
    note('a0000002', 'GM', SAM),              // the GM's note on a PC: travels with the PC
    note('a0000003', 'GM', 'dd000001'),       // the GM's note in a player's docket: travels with it
    note('a0000004', 'GM'),                   // the GM's handout lying loose: stays
    note('a0000005', undefined, DEVREUX)];    // paper from before on an NPC: stays
  const all = [...base, ...extra], go = travelers(all);
  const kinds = (pred: (r: PieceRecord) => boolean) => all.filter(pred).every(r => go.has(r.oid));
  assert.ok([SAM, BEAUFORD, '0000c001'].every(o => go.has(o)), "players' and open characters");
  assert.ok(!go.has(DEVREUX), 'not an NPC');
  assert.ok(kinds(r => r.kind === 'influence' && [SAM, BEAUFORD].includes(r.home)), 'their Influence cards');
  assert.ok(!all.some(r => r.kind === 'influence' && r.home === DEVREUX && go.has(r.oid) && !(typeof r.where === 'object' && 'slot' in r.where && [SAM, BEAUFORD].includes(r.where.slot))), "the NPC's cards stay");
  assert.ok(['dd000001', 'a0000001', 'a0000002', 'a0000003'].every(o => go.has(o)));
  assert.ok(!go.has('a0000004') && !go.has('a0000005'));
  assert.ok(!all.some(r => (r.kind === 'connections' || r.kind === 'reference') && go.has(r.oid)), 'nor the Connection Table');
});

const recs = (rs: PieceRecord[]): [Rid, PieceRecord][] => rs.map(r => [ridFor(r), r]);
const apply = (all: PieceRecord[], c: NonNullable<ReturnType<typeof setOut>>) => {
  const m = new Map(recs(all));
  for (const d of c.dels) m.delete(d);
  for (const p of c.puts) m.set(p.rid, p.rec as PieceRecord);
  return [...m.values()];
};

test('setting out and back', () => {
  let desk: Desk = { desks: [...emptyDesk().desks, { name: 'Desk 2', named: false, items: [] }] };
  let table = base;
  // R559: out to Desk 2: the NPC leaves the table into Desk 1's desktop; Sam stays. R593: so does this
  // page's reference sheet, its own.
  const sheet: PieceRecord = { kind: 'reference', oid: '0000f001', place: at(0, 0), which: 'quick' };
  const c = setOut(desk, recs([...table, sheet]), 1)!;
  assert.ok(c.dels.includes(`o:${DEVREUX}`) && !c.dels.includes(`o:${SAM}`));
  assert.ok(!c.dels.includes('m:0000f001') && !c.desk.desks[0]!.top!.some(r => r.oid === '0000f001'), 'the sheet stays on the table');
  assert.ok(!c.dels.some(d => (table.find(r => ridFor(r) === d)?.kind === 'connections')), 'the Connection Table stays');
  assert.equal(c.desk.out, 1);
  assert.ok(c.desk.desks[0]!.top!.some(r => r.oid === DEVREUX));
  assert.deepEqual(c.desk.desks[0]!.spots![SAM]!.pool, char(SAM).pool, "Sam's place on Desk 1 kept");
  desk = c.desk;
  table = apply(table, c);
  assert.ok(!table.some(r => r.oid === DEVREUX) && table.some(r => r.oid === SAM));
  // Sam is moved on Desk 2's desktop.
  table = table.map(r => (r.oid === SAM && r.kind === 'character' ? { ...r, pool: at(900, 900), card: at(900, 1100), gathered: false } : r));
  // R559: back to Desk 1: Devreux returns as he was, and Sam goes back to where he lay there.
  const back = setOut(desk, recs(table), 0)!;
  table = apply(table, back);
  assert.deepEqual(table.find(r => r.oid === DEVREUX), char(DEVREUX));
  const sam = table.find((r): r is Character => r.oid === SAM && r.kind === 'character')!;
  assert.deepEqual([sam.pool, sam.card, sam.gathered], [char(SAM).pool, char(SAM).card, char(SAM).gathered]);
  assert.deepEqual(back.desk.desks[1]!.spots![SAM]!.pool, at(900, 900), "Desk 2 keeps Sam's place there");
  assert.equal(back.desk.desks[0]!.top, undefined, 'Desk 1 laid out: no desktop kept');
  assert.equal(setOut(back.desk, recs(table), 0), null, 'already set out');
});
