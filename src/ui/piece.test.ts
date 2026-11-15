// CRC: crc-PieceView.md | Test: test-PieceView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontOrder, skillIndents, toggleCheck } from './piece.ts';
import { parse, serialize } from '../text/marks.ts';

test('a column brought to the front leads', () => {
  // R253: the rest follow in turn, so bringing the second forward each time cycles through all three.
  assert.deepEqual(frontOrder(null), ['bias', 'affliction', 'injury']);
  assert.deepEqual(frontOrder('affliction'), ['affliction', 'injury', 'bias']);
  assert.deepEqual(frontOrder('injury'), ['injury', 'bias', 'affliction']);
  let order = frontOrder(null);
  const led: string[] = [order[0]!];
  for (let k = 0; k < 3; k++) { order = frontOrder(order[1]!); led.push(order[0]!); }
  assert.deepEqual(led, ['bias', 'affliction', 'injury', 'bias']);
});

test("a Field's Skills line up as printed", () => {
  // R331: every Skill under a Field indents and a ✓ hangs (Bill, 11-14: always, check or not); a
  // Skills line, or a Skill with no Field above, stays flush.
  const front = ['<skl>Stray</skl>', '<fld>Snakeoil Salesman 3 (5XP)</fld>', '<skl>Rhetoric (Salesman) (x2)</skl>',
    '<skl>✓ Rationalization 4</skl>', '<fld>Private Investigator 2 (5XP)</fld>', '<skl>Investigation (x2)</skl>',
    '<skl>Skills 1: Tact</skl>'].join('\n');
  assert.deepEqual([...skillIndents(front)], [[2, 'pad'], [3, 'hang'], [5, 'pad']]);
});

test("a Field Skill's check toggles", () => {
  // R335: an indented Field Skill gains a ✓ at the start of its text, and loses it again; a Skills
  // line, a Skill with no Field above, and a line that isn't there are left alone.
  const front = ['<skl>Stray</skl>', '<fld>Private Investigator 2 (5XP)</fld>', '<skl>Investigation (x2)</skl>',
    '<skl>✓ Rationalization 4</skl>', '<skl>Skills 1: Tact</skl>'].join('\n');
  const lines = parse(front), at = (out: ReturnType<typeof parse>, k: number) => serialize(out).split('\n')[k];
  const checked = toggleCheck(lines, 2);
  assert.equal(at(checked, 2), '<skl>✓ Investigation (x2)</skl>');
  assert.equal(serialize(toggleCheck(checked, 2)), front, 'toggled again, as written');
  assert.equal(at(toggleCheck(lines, 3), 3), '<skl>Rationalization 4</skl>');
  for (const k of [0, 4, 99]) assert.equal(toggleCheck(lines, k), lines, `line ${k} is left alone`);
});
