// CRC: crc-Odds.md | Test: test-Odds.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Chip, Sign, SlotName } from '../model/records.ts';
import { bonus, opposition, row, total, type Dice } from './odds.ts';
import { pools } from './pool.ts';
import { action } from './readmarks.ts';

const ME = '00000001';
let seq = 0;
const chip = (name: SlotName, sign: Sign, points: number): Chip =>
  ({ kind: 'chip', oid: `c${++seq}`, where: { slot: ME, name }, n: 0, sign, points, rider: false });
const dice = (d: Dice) => `${d.yellows}d ${d.bonus < 0 ? '−' : '+'}${Math.abs(d.bonus)}`;

test('totals', () => {
  const p = pools(ME, [chip('main', 1, 4), chip('edge', 1, 2), chip('bias', -1, 2), chip('affliction', -1, 2),
    chip('injury', -1, 2), chip('stagger', -1, 6), chip('bonus', 1, 4)]);
  assert.equal(total(4, p).total, 4);
  assert.equal(opposition(2, p).total, -4);
});

test('every Difference row', () => {
  const cases: [number, string][] = [
    [-10, 'outclassed'], [-9, 'red-1'], [-7, 'red-1'], [-6, 'red'], [-5, 'red'], [-4, '-1'], [-3, '-1'],
    [-2, 'white'], [2, 'white'], [3, '+1'], [4, '+1'], [5, 'green'], [6, 'green'], [7, 'green+1'], [9, 'green+1'],
    [10, 'outclass'],
  ];
  for (const [d, key] of cases) assert.equal(row(d).key, key, String(d));
});

test('Success Bonus', () => {
  const infer = action('Infer: 4, +2')!;
  const slot: Chip[] = [];
  const pool = () => pools(ME, slot);
  let hand = { yellows: 0, bonus: 0 };
  const now = (a = infer) => dice(bonus(a, pool().bonus, hand));

  assert.equal(now(), '0d +2');                                       // 1
  slot.push(chip('bonus', 1, 2));
  assert.equal(now(), '1d +1');                                       // 2
  const four = chip('bonus', 1, 4);
  slot.push(four);
  assert.equal(now(), '2d +0');                                       // 3
  hand = { yellows: 1, bonus: 0 };
  assert.equal(now(), '3d +0');                                       // 4
  slot.splice(slot.indexOf(four), 1);
  assert.equal(now(), '2d +1');                                       // 5
  const minus = chip('bonus', -1, 4);
  slot.push(minus);
  assert.equal(now(), '1d +0');                                       // 6
  slot.push(chip('main', 1, 4), chip('edge', 1, 2), chip('bias', -1, 2), chip('stagger', -1, 6));
  const t = total(infer.base, pool());
  assert.equal(t.total, 8);                                           // 7
  assert.deepEqual(t.parts, { base: 4, main: 4, edge: 2, bias: -2, affliction: 0, injury: 0 });
  assert.equal(now(), '1d +0');
  slot[slot.indexOf(minus)] = { ...minus, points: 6 };
  assert.equal(now(), '1d −2');                                       // 8
  const mental = action('Mental Atk / Req: 2, +2')!;
  hand = { yellows: 0, bonus: 0 };
  assert.equal(total(mental.base, pool()).total, 6);                  // 9
  assert.equal(now(mental), '0d −2');
  slot.length = 0;
  assert.equal(now(action('Big Lie: 5, 2d+3')!), '2d +3');            // 10
});
