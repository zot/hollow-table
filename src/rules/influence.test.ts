// CRC: crc-Influence.md | Test: test-Influence.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Chip, Influence, Sign } from '../model/records.ts';
import { levelName, lowerCard, lowerChip, raiseChip, rider } from './influence.ts';

const where = { slot: '00000001', name: 'edge' } as const;
const chip = (oid: string, sign: Sign, points: number, r = false): Chip => ({ kind: 'chip', oid, where, n: 0, sign, points, rider: r });
const show = (c: Chip | null) => c === null ? '' : `${c.sign < 0 ? '−' : c.points === 1 ? '+' : ''}${c.points}${c.rider ? '+1' : ''}`;

test('the chip cycle', () => {
  // 1, 2: a click on empty slot space makes a loose +1, a shift-click a −1 (PoolView); here, chips.
  let pos: Chip | null = chip('a', 1, 1);
  const neg = chip('b', -1, 1);
  assert.equal(show(pos), '+1');
  assert.equal(show(neg), '−1');
  pos = raiseChip(pos);                       // 3
  assert.equal(show(pos), '2');
  pos = raiseChip(pos);                       // 4
  assert.equal(show(pos), '4');
  pos = lowerChip(lowerChip(pos)!);           // 5: 4 → 2 → +1
  assert.equal(show(pos), '+1');
  pos = lowerChip(pos!);                      // 6
  assert.equal(pos, null);
  assert.equal(show(neg), '−1');

  let ridden = chip('c', 1, 4, true);         // 7
  assert.equal(show(ridden), '4+1');
  ridden = rider(ridden, false);              // 8
  assert.equal(show(ridden), '4+1');
  ridden = rider(ridden, true);               // 9
  assert.equal(show(ridden), '4');
});

test('cards stop at Min', () => {
  let card: Influence = { kind: 'influence', oid: 'd', home: '00000003', where: 'drawer', n: 0, name: 'Keep the Peace',
    sign: 1, points: 4, used: false, crit: false };
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) { card = lowerCard(card); seen.push(levelName(card.points)); }
  assert.deepEqual(seen, ['Min', 'Min', 'Min']);
});
