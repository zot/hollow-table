// CRC: crc-Tape.md | Test: test-Tape.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Receipt, Tape } from '../model/records.ts';
import { mayChoose, retitled, torn } from './tape.ts';
import { mayName, mayTake, nameWords } from './tape.ts';

const receipt = (id: string, by: string, crit?: Receipt['crit']): Receipt =>
  ({ id, at: 1, title: `roll ${id}`, by, dice: [], resolution: '', level: '', outcome: '', ...(crit && { crit }) });

test('the tape: titles, tearing, and who chooses a CRIT', () => {
  const tape: Tape = { receipts: [receipt('a', 'Dana'), receipt('b', 'GM')] };
  // R317: a title edited on the tape, the rest untouched.
  assert.deepEqual(retitled(tape, 'b', 'The big one').receipts.map(r => r.title), ['roll a', 'The big one']);
  // R113: the whole roll comes off as one piece.
  const t = torn(tape, '0000000f', { x: 5, y: 6, z: 0, tilt: 0 });
  assert.deepEqual([t.kind, t.oid, t.receipts.length, t.place.x], ['tornroll', '0000000f', 2, 5]);
  // R97: the rolling character's owner, or the GM, until it is locked.
  const crit = receipt('c', 'Dana', { max: 26, dbl: 30, chosen: 'dbl', locked: false });
  const dana = { name: 'Dana', gm: false }, ann = { name: 'Ann', gm: false }, gm = { name: 'GM', gm: true };
  assert.deepEqual([dana, ann, gm, null].map(v => mayChoose(v, crit)), [true, false, true, false]);
  assert.equal(mayChoose(gm, { ...crit, crit: { ...crit.crit!, locked: true } }), false, 'locked stays');
  assert.equal(mayChoose(gm, receipt('d', 'Dana')), false, 'no CRIT, nothing to choose');
});

test('who takes an Attack, and who names it', () => {
  // R308: Take shows for the target's owner and the GM, until taken; R313: names for whoever rolled it and the GM.
  const r = { id: 'x', at: 0, title: 't', by: 'Ann', dice: [], resolution: '', level: '', outcome: 'Success 7',
    attack: { target: '00000001', name: 'Sam', from: 'Beauford', kind: 'mental' as const, result: 7 } };
  const dana = { name: 'Dana', gm: false }, ann = { name: 'Ann', gm: false }, gm = { name: 'GM', gm: true };
  assert.deepEqual([mayTake(dana, r, 'Dana'), mayTake(ann, r, 'Dana'), mayTake(gm, r, 'Dana'), mayTake(null, r, 'Dana')], [true, false, true, false]);
  assert.equal(mayTake(dana, { ...r, attack: { ...r.attack, taken: true } }, 'Dana'), false, 'taken');
  const waiting = { ...r, attack: { ...r.attack, taken: true, waiting: [{ damage: 'bias' as const, row: 'min' as const }] } };
  assert.deepEqual([mayName(ann, waiting), mayName(dana, waiting), mayName(gm, waiting), mayName(ann, r)], [true, false, true, false]);
  assert.equal(nameWords('Sam', 'bias', 'min'), "Name Sam's Minor Bias");
});
