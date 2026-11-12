// CRC: crc-TableView.md | Test: test-TableView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushClear } from './table.ts';

const box = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h });

test('a growing drawer pushes what it covers', () => {
  const mat = box(100, 100, 430, 300);              // grown to y 400
  const pieces = [
    { rid: 'o:1', box: box(120, 380, 200, 100) },   // covered at its top: slides to 414
    { rid: 'o:2', box: box(600, 380, 200, 100) },   // beside the mat: stays
    { rid: 'o:3', box: box(120, 420, 200, 100) },   // already clear below: stays
    { rid: 'o:4', box: box(500, 150, 100, 50) },    // overlapping its right edge: slides
  ];
  assert.deepEqual(pushClear(mat, pieces, 14), [{ rid: 'o:1', dy: 34 }, { rid: 'o:4', dy: 264 }]);
});
