// CRC: crc-Bar.md | Test: test-Supplies.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter, newChip, newHowTo, newSticky, newText } from './supplies.ts';
import { graveName } from './yards.ts';

test('what a supply makes', () => {
  // R287: its middle at the pointer; R34: a character's pool above its card, gathered, its maker's.
  const c = newCharacter('00000010', { name: 'Dana', gm: false }, { x: 500, y: 400 });
  assert.deepEqual([c.owner, c.card.x, c.card.y, c.gathered, c.pool.y < c.card.y], ['Dana', 285, 242, true, true]);
  assert.equal(newCharacter('00000011', { name: 'GM', gm: true }, { x: 0, y: 0 }).owner, 'GM');
  assert.deepEqual([newSticky('00000012', { x: 115, y: 75 }).place.x, newText('00000013', { x: 0, y: 0 }).text], [0, 'Write here']);
  assert.equal(newHowTo('00000014', { x: 0, y: 0 }).which, 'howto');
  const chip = newChip('00000015', -1, 1, { x: 21, y: 21 });
  assert.deepEqual([chip.sign, chip.points, chip.where], [-1, 1, { table: { x: 0, y: 0, z: 0, tilt: 0 } }]);
});

test('what a burial is called', () => {
  // R290.
  const c = newCharacter('00000010', null, { x: 0, y: 0 });
  assert.equal(graveName({ ...c, name: 'Sam' }), 'Sam');
  assert.equal(graveName({ ...c, name: '  ' }), 'Nameless');
  assert.equal(graveName({ ...newSticky('00000012', { x: 0, y: 0 }), text: "\n<head>Find: How did Trudy get infected? And why</head>\nmore" }), 'Note: Find: How did Trudy get infe');
  assert.equal(graveName(newSticky('00000012', { x: 0, y: 0 })), 'Note: …');
  assert.equal(graveName(newText('00000013', { x: 0, y: 0 })), 'Writing: Write here');
  const r = { id: 'a', at: 1, title: 'Sam, roll 3', dice: [], resolution: '', level: '', outcome: '' };
  assert.equal(graveName({ kind: 'tornroll', oid: '00000016', place: { x: 0, y: 0, z: 0, tilt: 0 }, receipts: [r, r] }), 'Tape: 2 rolls, last Sam, roll 3');
});
