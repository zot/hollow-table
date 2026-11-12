// CRC: crc-Gesture.md | Test: test-Gesture.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gesture, paced, shifty, DRAG_PX, LONG_MS } from './gesture.ts';
import { fakeClock } from '../store/fakes.ts';

const ev = (type: string, x = 0, y = 0, extra: Record<string, unknown> = {}) =>
  Object.assign(new Event(type), { clientX: x, clientY: y, pointerId: 1, button: 0, ...extra });

test('one reading of the pointer', () => {
  const { clock, advance } = fakeClock();
  const el = new EventTarget(), got: string[] = [];
  const stop = gesture(el, { click: () => got.push('click'), shift: () => got.push('shift'), drag: () => got.push('drag') }, clock);
  // The document gets the moves and the release; here there is none, so the element does.
  const press = (extra = {}) => el.dispatchEvent(ev('pointerdown', 10, 10, extra));
  const up = (x = 10, y = 10) => el.dispatchEvent(ev('pointerup', x, y));
  const move = (x: number, y: number) => el.dispatchEvent(ev('pointermove', x, y));

  press(); up();
  press({ shiftKey: true }); up();
  press({ altKey: true }); up();
  press(); advance(LONG_MS); up();
  press(); move(10 + DRAG_PX - 1, 10); up();
  press(); move(10 + DRAG_PX, 10); up();
  assert.deepEqual(got, ['click', 'shift', 'shift', 'shift', 'click', 'drag'], 'a long press is a shift, and never also a click');

  got.length = 0;
  el.dispatchEvent(Object.assign(ev('keydown'), { key: 'Enter' }));
  el.dispatchEvent(Object.assign(ev('keydown'), { key: ' ', shiftKey: true }));
  el.dispatchEvent(Object.assign(ev('keydown'), { key: 'a' }));
  assert.deepEqual(got, ['click', 'shift'], 'Enter clicks, shift+Space shift-clicks, other keys nothing');
  assert.ok(shifty.has(el), 'registered for the quality floor');
  stop();
  assert.ok(!shifty.has(el));
});

test('moves are paced to frames', () => {
  const passes: (() => void)[] = [], got: string[] = [];
  const run = () => passes.shift()!();
  const p = paced<[number, number]>(fn => passes.push(fn), ([x, y]) => got.push(`${x},${y}`));
  p.to([1, 1]); p.to([2, 2]); p.to([3, 3]);
  assert.equal(passes.length, 1);
  assert.deepEqual(got, []);
  run();
  assert.deepEqual(got, ['3,3']);
  p.to([4, 4]);
  assert.equal(passes.length, 1);
  run();
  assert.deepEqual(got, ['3,3', '4,4']);
  p.to([5, 5]); p.cancel(); run();
  assert.deepEqual(got, ['3,3', '4,4']);
  p.to([6, 6]); p.flush();
  assert.deepEqual(got, ['3,3', '4,4', '6,6']);
  run();
  assert.deepEqual(got, ['3,3', '4,4', '6,6']);
});
