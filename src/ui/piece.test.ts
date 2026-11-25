// CRC: crc-PieceView.md | Test: test-PieceView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editLasting, frontOrder, readersOf, skillIndents, toggleCheck, withReaders } from './piece.ts';
import { parse, serialize } from '../text/marks.ts';
import { ridFor, type Character, type Sticky } from '../model/records.ts';
import { SAM, scene } from '../store/playtest.ts';

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

// R342: a Conviction's name and points are written in place; with neither, and no name waited for, it is gone.
test('editing a Conviction', () => {
  const sam = scene().find(r => r.kind === 'character' && r.oid === SAM) as Character;
  const one = editLasting(sam, 'bias', { name: 'Cheats win', points: 7 });
  assert.deepEqual(one.back.lasting, { bias: { name: 'Cheats win', points: 7, spent: 0 } });
  assert.deepEqual(editLasting(one, 'bias', { points: 2 }).back.lasting?.bias?.points, 2, 'Recovery lowers it');
  assert.equal('lasting' in editLasting(editLasting(one, 'bias', { name: '' }), 'bias', { points: 0 }).back, false, 'blank, it is gone');
  const waiting = { ...sam, back: { ...sam.back, lasting: { affliction: { name: '', points: 2, spent: 0, naming: { by: 'Beauford', id: 'r1' } } } } };
  assert.ok(editLasting(waiting, 'affliction', { points: 0 }).back.lasting?.affliction, 'still waiting for its name');
});

test("a note's readers by its fold, and its readers changed", () => {
  // R505: everyone who reads it but the viewer, the GM as "GM"; "me" for `mine` paper.
  const place = { x: 0, y: 0, z: 0, tilt: 0 }, gm = { name: 'GM', gm: true }, sam = { name: 'Sam', gm: false }, dana = { name: 'Dana', gm: false };
  const note: Sticky = { kind: 'sticky', oid: '0000e001', place, text: 'Is the mayor lying?', by: 'Sam' };
  const handout: Sticky = { ...note, by: 'GM', to: ['Sam', 'Dana'] };
  assert.deepEqual(readersOf(note, sam), [], 'everyone reads it: no tags');
  assert.deepEqual(readersOf({ ...note, to: [] }, sam), ['GM'], "Sam's note to the GM, on Sam's page");
  assert.deepEqual(readersOf({ ...note, to: [] }, gm), ['Sam'], '...and on the GM\'s');
  assert.deepEqual(readersOf(handout, gm), ['Sam', 'Dana'], "the handout on the GM's page");
  assert.deepEqual(readersOf(handout, sam), ['GM', 'Dana'], "...and on Sam's");
  assert.deepEqual(readersOf({ ...note, mine: true }, sam), ['me'], 'just me');
  assert.deepEqual(readersOf(handout, dana), ['GM', 'Sam']);
  assert.deepEqual(readersOf({ ...handout, to: [] }, gm), ['me'], "the GM's note to no one but the GM");
  // R499, R500: rewritten for new readers; `mine` moves it to m:.
  assert.deepEqual(withReaders(handout, 'all'), { ...note, by: 'GM' }, 'everyone: no `to`');
  assert.deepEqual(withReaders(note, 'gm'), { ...note, to: [] });
  assert.equal(ridFor(withReaders(note, 'me')), 'm:0000e001', 'just me is the page\'s own');
  assert.deepEqual(withReaders(withReaders(note, 'me'), ['Ann']), { ...note, to: ['Ann'] }, 'no `mine` left over');
  // R577: paper without a maker is the GM's: picking its readers writes its owner.
  const { by: _by, ...old } = note;
  assert.deepEqual(withReaders(old, 'gm'), { ...old, by: 'GM', to: [] }, 'the GM picks for paper from before');
  assert.deepEqual(readersOf({ ...note, handed: true }, dana), ['me'], 'a note handed over, on its way');
});
