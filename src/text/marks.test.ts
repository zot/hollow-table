// CRC: crc-MarkedText.md | Test: test-MarkedText.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mark, marks, parse, serialize, setMark, unmark } from './marks.ts';
import { scene } from '../fixtures/scene.ts';

test('round trip over real text', () => {
  const faces = scene().flatMap(r => r.kind === 'character'
    ? [r.front, r.back.notes]
    : r.kind === 'sticky' ? [r.text] : []);
  const odd = [
    '<b>bold</b> and <script>x</script>', '<act class="x">A: 1, +1</act>', '<res>Money +Maj',
    'a < b & c > d', '&amp; &lt;act&gt;', '', '\n\n', 'trailing\n', '<act></act>', '<act>a</act><act>b</act>',
    '<act>one\ntwo</act>', '</act><act>', '<act>x <res>y</res></act>', '<<act>>x</act>>',
  ];
  for (const s of [...faces, ...odd]) assert.equal(serialize(parse(s)), s, JSON.stringify(s));
});

test('the closed set', () => {
  const lines = parse('<act>A: 1, +1</act> <act class="x">…</act> <b>bold</b> <script>x</script> <bias>x</bias> <res>unclosed');
  assert.deepEqual(marks(lines), [{ line: 0, run: 0, mark: 'act', text: 'A: 1, +1' }]);
  assert.deepEqual(lines[0]!.slice(1), [' <act class="x">…</act> <b>bold</b> <script>x</script> <bias>x</bias> <res>unclosed']);
});

test('edits touch only their mark', () => {
  const src = 'Res: <res>Money +Maj</res>, <res>Ammo +Sig</res> left';
  const lines = parse(src);
  const ammo = marks(lines, 'res')[1]!;
  assert.equal(serialize(setMark(lines, ammo, 'Ammo +Min')), 'Res: <res>Money +Maj</res>, <res>Ammo +Min</res> left');

  const plainRun = { line: 0, run: 4, start: 1, end: 5 }; // ' left' → 'left'
  assert.equal(serialize(mark(lines, plainRun, 'inf')), 'Res: <res>Money +Maj</res>, <res>Ammo +Sig</res> <inf>left</inf>');
  assert.equal(serialize(unmark(lines, marks(lines)[0]!)), 'Res: Money +Maj, <res>Ammo +Sig</res> left');
  assert.deepEqual(unmark(lines, marks(lines)[0]!)[0]![0], 'Res: Money +Maj, ');
  // A range that leaves its text run, or text that would close its own mark, changes nothing.
  assert.equal(mark(lines, { line: 0, run: 0, start: 0, end: 9 }, 'act'), lines);
  assert.equal(setMark(lines, ammo, 'x</res>y'), lines);
  assert.equal(serialize(parse(src)), src);
});
