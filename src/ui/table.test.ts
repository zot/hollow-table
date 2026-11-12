// CRC: crc-TableView.md | Test: test-TableView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZOOM_MIN, fitView, pushClear } from './table.ts';

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

test('a first visit fits the table', () => {
  // R271: centred, at most full size, 20 px a side and 14 px from the top.
  const big = fitView({ left: 0, top: 0, right: 1880, bottom: 990 }, { w: 1000, h: 800 });
  assert.equal(big.zoom, 960 / 1880);
  assert.equal(Math.round(big.x), 20);
  assert.equal(big.y, 14);
  const small = fitView({ left: 100, top: 50, right: 300, bottom: 150 }, { w: 1000, h: 800 });
  assert.deepEqual(small, { x: 300, y: -36, zoom: 1 }, 'never larger than full size; its box centred');
  assert.equal(fitView({ left: 0, top: 0, right: 100000, bottom: 100 }, { w: 1000, h: 800 }).zoom, ZOOM_MIN, 'never below the least zoom');
});
