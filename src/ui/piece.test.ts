// CRC: crc-PieceView.md | Test: test-PieceView.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontOrder } from './piece.ts';

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
