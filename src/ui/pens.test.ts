// CRC: crc-Pens.md | Test: test-Pens.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locate, parse, read, serialize, type Pos } from '../text/marks.ts';
import { apply, offered, places } from './pens.ts';

const at = (line: number, run: number, offset: number): Pos => ({ line, run, offset });

test('a pen marks a selection', () => {
  const lines = parse('Money +Maj and more');
  assert.equal(serialize(apply(lines, at(0, 0, 0), at(0, 0, 10), 'res')), '<res>Money +Maj</res> and more');
  assert.equal(serialize(apply(lines, at(0, 0, 10), at(0, 0, 0), 'res')), '<res>Money +Maj</res> and more');
  const two = parse('Money +Maj\nAmmo +Sig');
  assert.equal(apply(two, at(0, 0, 2), at(1, 0, 3), 'res'), two);
  // Ends on two lines are a selection, not a caret, even at the same run and offset by a mark.
  const marked = parse('<res>Money +Maj</res> a\n<res>Ammo +Sig</res> b');
  assert.equal(apply(marked, at(0, 1, 0), at(1, 1, 0), 'act'), marked);
});

test('any pen on marked text unmarks it', () => {
  const lines = parse('Res: <res>Money +Maj</res>');
  assert.equal(serialize(apply(lines, at(0, 1, 3), at(0, 1, 3), 'act')), 'Res: Money +Maj');
  assert.equal(serialize(apply(lines, at(0, 1, 0), at(0, 1, 5), 'res')), 'Res: Money +Maj');
  // A bare caret at the mark's edge, just after it (where a pen leaves the caret) or just before it.
  assert.equal(serialize(apply(lines, at(0, 2, 0), at(0, 2, 0), 'act')), 'Res: Money +Maj');
  assert.equal(serialize(apply(lines, at(0, 0, 5), at(0, 0, 5), 'act')), 'Res: Money +Maj');
});

test('a bare caret marks its run', () => {
  assert.equal(serialize(apply(parse('  Infer: 4, +2  '), at(0, 0, 5), at(0, 0, 5), 'act')), '  <act>Infer: 4, +2</act>  ');
  const lines = parse('a <res>Money +Maj</res> b');
  assert.equal(apply(lines, at(0, 0, 1), at(0, 2, 1), 'act'), lines);
  assert.equal(apply(parse('   '), at(0, 0, 1), at(0, 0, 1), 'act').length, 1);
  assert.equal(serialize(apply(parse('   '), at(0, 0, 1), at(0, 0, 1), 'act')), '   ');
});

test('the offered pen', () => {
  const lines = parse([
    'Infer: 4, +2', '<head>Resources</head>', 'Money +Maj', '<head>Notes</head>', 'Ammo +Sig', 'x <act>A: 1, +1</act>',
  ].join('\n'));
  assert.deepEqual([0, 2, 4, 5, 9].map(i => offered(lines, i)), ['act', 'res', null, null, null]);
});

test('the rest make room', () => {
  // Action offered 25 down: Resource takes the top place; at 30 it is still clear; the rest step past.
  assert.deepEqual(places(5, 0, 25, 25), [25, 0, 50, 75, 100]);
  assert.deepEqual(places(5, 0, 30, 25), [30, 0, 55, 80, 105]);
  assert.deepEqual(places(5, 1, 60, 25), [0, 60, 25, 85, 110]);
  // No pen overlaps another.
  for (const at of [-40, 0, 12, 37, 140]) for (let k = 0; k < 5; k++) {
    const ys = places(5, k, at, 25).sort((a, b) => a - b);
    ys.slice(1).forEach((y, i) => assert.ok(y - ys[i]! >= 25, `k ${k} at ${at}: ${ys}`));
  }
});

// A node tree shaped the way MarkedText.render draws, with only what read and locate touch.
type Fake = { nodeType: number; tagName?: string; className?: string; childNodes: Fake[]; textContent: string; contains(n: unknown): boolean };
const txt = (s: string): Fake => ({ nodeType: 3, childNodes: [], textContent: s, contains(n) { return n === this; } });
const elt = (tagName: string, kids: Fake[], className = ''): Fake => ({
  nodeType: 1, tagName, className, childNodes: kids,
  get textContent() { return kids.map(k => k.textContent).join(''); },
  contains(n) { return n === this || kids.some(k => k.contains(n)); },
});

const after = txt(', more'), inMark = txt('Money +Maj'), third = txt('third line');
const empty = elt('DIV', [elt('BR', [])]);
const first = elt('DIV', [txt('Res: '), elt('SPAN', [inMark], 'res'), after]);
const root = elt('DIV', [first, empty, elt('DIV', [third])]);

test('locating a selection', () => {
  const loc = (n: Fake, o: number) => locate(root as unknown as HTMLElement, n as unknown as Node, o);
  assert.deepEqual(loc(after, 3), at(0, 2, 3));
  assert.deepEqual(loc(inMark, 4), at(0, 1, 4));
  assert.deepEqual(loc(empty, 0), at(1, 0, 0));
  assert.deepEqual(loc(third, 6), at(2, 0, 6));
  // After a line's last child, where a pen leaves the caret.
  assert.deepEqual(loc(first, 3), at(0, 2, 6));
  assert.equal(loc(txt('elsewhere'), 0), null);
});

test('an empty line is one line', () => {
  assert.equal(serialize(read(root as unknown as HTMLElement)), 'Res: <res>Money +Maj</res>, more\n\nthird line');
});
