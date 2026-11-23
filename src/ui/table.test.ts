// CRC: crc-TableView.md | Test: test-TableView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZOOM_MAX, ZOOM_MIN, fitView, pinchView, pushClear } from './table.ts';

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

test('a pinch is a sheet stuck to the fingers', () => {
  // Fingers 200 apart about (300, 200), the table point (200, 150) under their midpoint.
  const v = { x: 100, y: 50, zoom: 1 }, a0 = { x: 200, y: 200 }, b0 = { x: 400, y: 200 };
  const p = (a: [number, number], b: [number, number]) => pinchView(v, a0, b0, { x: a[0], y: a[1] }, { x: b[0], y: b[1] });
  assert.deepEqual(p([100, 200], [500, 200]), { x: -100, y: -100, zoom: 2 }, 'twice as far apart: twice the zoom, about the midpoint');
  assert.deepEqual(p([230, 190], [430, 190]), { x: 130, y: 40, zoom: 1 }, 'moved together: a pan');
  assert.deepEqual(p([300, 100], [300, 300]), v, 'turned about their midpoint: nothing (no rotation)');
  assert.deepEqual(p([200, 200], [2200, 200]), { x: 700, y: -175, zoom: ZOOM_MAX }, 'at the limit the zoom stops and the midpoint still pans');
  assert.equal(p([200, 200], [205, 200]).zoom, ZOOM_MIN);
  assert.deepEqual(pinchView(v, a0, a0, { x: 310, y: 200 }, { x: 330, y: 220 }), { x: 220, y: 60, zoom: 1 }, 'from no spacing: no zoom, only the pan');
});
