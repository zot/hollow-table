// CRC: crc-Tray.md | Test: test-Tray.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldFrom } from './tray.ts';

test('what the GM types in the tray', () => {
  // R347: a whole number sets the world; a blank clears it; anything else changes nothing.
  assert.deepEqual(worldFrom('4'), { set: true, total: 4 });
  assert.deepEqual(worldFrom(' 12 '), { set: true, total: 12 });
  assert.deepEqual(worldFrom('0'), { set: true, total: 0 }, 'Opposition 0 is a number, not a blank');
  assert.deepEqual(worldFrom('−2'), { set: true, total: -2 });
  assert.deepEqual(worldFrom(''), { set: false, total: 0 });
  for (const bad of ['four', '2.5', '1e3', '4 + 2', '10000']) assert.equal(worldFrom(bad), null, bad);
});
