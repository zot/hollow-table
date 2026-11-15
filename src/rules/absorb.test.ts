// CRC: crc-Absorb.md | Test: test-Absorb.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, RowName } from '../model/records.ts';
import { fill, free, mildEnds, pages, same, type Page } from './absorb.ts';
import { SAM, scene } from '../store/playtest.ts';

const sam = (): Character => scene().find((r): r is Character => r.kind === 'character' && r.oid === SAM)!;
const withSlot = (c: Character, d: 'bias' | 'affliction' | 'injury', row: RowName, s: Partial<Character['back']['damage']['bias']['min']>): Character =>
  ({ ...c, back: { ...c.back, damage: { ...c.back.damage, [d]: { ...c.back.damage[d], [row]: { ...c.back.damage[d][row], ...s } } } } });
const show = (p: Page) => (['maj', 'sig', 'min', 'mild'] as RowName[]).flatMap(r => Array(p.use[r]).fill(r)).join('+') + (p.overflow ? ` over ${p.overflow}` : '');

// R315: free Slots follow Wis, and a Slot waiting for a name is not free.
test('free Slots follow Wis and what is used', () => {
  const c = sam();
  assert.match(c.front, /Wis 4/);
  assert.deepEqual(free(c, 'bias'), { mild: 1, min: 3, sig: 1, maj: 1 });
  let used = withSlot(c, 'bias', 'min', { name: 'Suspicious', boxes: [true, false] });
  used = withSlot(used, 'bias', 'sig', { naming: { by: 'Beauford', id: 'r1' } });
  assert.deepEqual(free(used, 'bias'), { mild: 1, min: 1, sig: 0, maj: 1 });
});

// R310: every covering set with none to spare, each once (Bill, 11-13).
test('the pages for Sam taking 5', () => {
  assert.deepEqual(pages(sam(), 'mental', 5).map(show),
    ['maj', 'sig+min', 'sig+mild', 'min+min+min', 'min+min+mild']);
});

// Bill, 11-13: "if only a Maj slot remains and they take 1 point of damage, they must use the Maj slot".
test('only a Maj left takes a single point', () => {
  let c = sam();
  c = withSlot(c, 'bias', 'mild', { name: 'a' });
  c = withSlot(c, 'bias', 'min', { name: 'b', boxes: [true, true] });
  c = withSlot(c, 'bias', 'sig', { name: 'c' });
  assert.deepEqual(pages(c, 'mental', 1).map(show), ['maj']);
});

// R310: the column's absorb comes off first; all absorbed is one empty page.
test('absorb comes off first', () => {
  const c = { ...sam(), front: sam().front.replace('Wis 4', 'Wis 5') };
  assert.deepEqual(pages(c, 'mental', 1).map(show), ['']);
  // 2 left: any one Slot covers it, the larger ones too (Bill: "the player can choose any slots").
  assert.deepEqual(pages(c, 'mental', 3).map(show), ['min', 'mild', 'sig', 'maj']);
});

// R311: nothing covers it: every free Slot fills and the rest goes in the Notes.
test('overflow', () => {
  let c = sam();
  for (const row of ['mild', 'sig', 'maj'] as RowName[]) c = withSlot(c, 'injury', row, { name: 'hurt' });
  const [only, ...rest] = pages(c, 'phys', 5);
  assert.equal(rest.length, 0);
  assert.equal(show(only!), 'min over 3');
  const after = fill(c, 'phys', only!, { name: 'Beauford', id: 'r9' });
  assert.deepEqual(after.back.damage.injury.min.naming, { by: 'Beauford', id: 'r9' });
  assert.match(after.back.notes, /Condition: 3 from Beauford's Attack$/);
});

// R312: a row is used in order: the named Slot waits for the attacker's name, then boxes are checked.
test('filling uses a row in order', () => {
  const c = sam(), page = pages(c, 'mental', 3).find(p => show(p) === 'min+min')!;
  const after = fill(c, 'mental', page, { name: 'Beauford', id: 'r2' });
  const min = after.back.damage.bias.min;
  assert.deepEqual(min.naming, { by: 'Beauford', id: 'r2' });
  assert.deepEqual(min.boxes.slice(0, 2), [true, false]);
  assert.equal(min.name, '');
  assert.deepEqual(after.back.damage.bias.sig, c.back.damage.bias.sig);
  assert.deepEqual(after.back.damage.affliction, c.back.damage.affliction);
  assert.equal(after.back.notes, c.back.notes);
  assert.ok(same(page, { use: { mild: 0, min: 2, sig: 0, maj: 0 }, overflow: 0 }));
});

test('Mild Damage ends', () => {
  // R338: every Mild slot emptied, its boxes kept but unchecked, nothing spent, no name waited for;
  // every other row as it was.
  let c = withSlot(sam(), 'bias', 'mild', { name: 'Sore loser', boxes: [true, false], spent: [1] });
  c = withSlot(c, 'injury', 'mild', { naming: { by: 'Beauford', id: 'r1' } });
  c = withSlot(c, 'affliction', 'min', { name: 'Shamed', boxes: [true] });
  const out = mildEnds(c).back.damage;
  assert.deepEqual(out.bias.mild, { name: '', boxes: [false, false], spent: [] });
  assert.deepEqual(out.injury.mild, { name: '', boxes: c.back.damage.injury.mild.boxes.map(() => false), spent: [] });
  assert.deepEqual(out.affliction.min, c.back.damage.affliction.min, 'a Min Affliction stays');
});
