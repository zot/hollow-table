// CRC: crc-Dice.md | Test: test-Dice.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelName, roll, type Rng } from './dice.ts';
import { ADV, row } from './odds.ts';

/** A random source that rolls exactly these faces, in order. */
function faces(...vs: number[]): Rng {
  let i = 0;
  return () => {
    const v = vs[i++];
    if (v === undefined) throw new Error('rolled more dice than the test gave');
    return (v - 1) / 6;
  };
}
const ROW = (key: string) => ADV.find(r => r.key === key)!;

test('resolution', () => {
  // White, then Green or Red, then Blue: each row as the book gives.
  const cases: [string, number[], string, number | null][] = [
    ['white', [3, 2], 'cost', 3],
    ['white', [2, 2], 'failure', 2],
    ['white', [4, 2], 'success', 4],
    ['green', [2, 5, 2], 'success', 5],         // the higher
    ['green+1', [1, 2, 2], 'cost', 3],          // higher, then +1
    ['+1', [2, 2], 'cost', 3],
    ['-1', [4, 2], 'cost', 3],
    ['red', [5, 2, 2], 'failure', 2],           // the lower
    ['red-1', [5, 5, 2], 'success', 4],         // lower, then −1
    ['outclass', [1, 2], 'success', null],      // automatic: White still rolled, decides nothing
    ['outclassed', [6, 2], 'failure', null],
  ];
  for (const [key, vs, outcome, resolved] of cases) {
    const r = roll(ROW(key), 0, 0, faces(...vs));
    assert.deepEqual([r.outcome, r.resolved], [outcome, resolved], key + ' ' + vs.join(','));
  }
  assert.equal(row(0).key, 'white');
});

test('exploding and the Failure rule', () => {
  // A Success; Blue 6, then the added Yellows 6, 6 and 2: three added.
  let r = roll(ROW('white'), 0, 0, faces(4, 6, 6, 6, 2));
  assert.equal(r.dice.filter(d => d.added).length, 3);
  assert.equal(r.result, 20);
  // A Failure with two Yellows and +3: the Yellows dropped, the bonus ignored.
  r = roll(ROW('white'), 2, 3, faces(2, 4, 6, 6));
  assert.equal(r.outcome, 'failure');
  assert.deepEqual(r.dice.filter(d => d.c === 'Y').map(d => d.dropped), [true, true]);
  assert.equal(r.dice.length, 4);  // a dropped 6 adds nothing
  assert.equal(r.result, 4);
  // A Success with −9: the floor at zero.
  r = roll(ROW('white'), 0, -9, faces(5, 3));
  assert.deepEqual([r.result, r.level], [0, 'no noticeable effect']);
});

test('CRIT', () => {
  // Outclassed with White 6, Blue 5 and a Yellow: a Success, its Yellow kept.
  let r = roll(ROW('outclassed'), 1, 0, faces(6, 5, 3));
  assert.equal(r.outcome, 'success');
  assert.equal(r.dice.find(d => d.c === 'Y')!.dropped, false);
  assert.deepEqual(r.crit, { max: 12, dbl: 16, chosen: 'dbl', locked: false });   // 5+3 = 8, doubled 16 beats 12
  assert.equal(r.result, 16);
  // Red row, Red shows 1, White 6, Blue 6 (which explodes into a 1): still a Success.
  r = roll(ROW('red'), 0, 2, faces(6, 1, 6, 1));
  assert.equal(r.outcome, 'success');
  // Result dice 6 + 1 + bonus 2 = 9: maximize is 6 + 6 + 2 = 14, double 18.
  assert.deepEqual(r.crit, { max: 14, dbl: 18, chosen: 'dbl', locked: false });
  // Low dice and a big bonus: maximize wins. Blue 5, Yellows 1, 1, bonus +4: result 11, max 6×3+4 = 22, double 22: max.
  r = roll(ROW('white'), 2, 4, faces(6, 5, 1, 1));
  assert.deepEqual(r.crit, { max: 22, dbl: 22, chosen: 'max', locked: false });
  r = roll(ROW('white'), 3, 0, faces(6, 5, 1, 1, 1));
  assert.deepEqual([r.crit!.max, r.crit!.dbl, r.crit!.chosen, r.result], [24, 16, 'max', 24]);
});

test('Level names', () => {
  const at = [0, 1, 4, 5, 9, 10, 14, 15, 19, 20].map(levelName);
  assert.deepEqual(at, ['no noticeable effect', 'Minor', 'Minor', 'Significant', 'Significant', 'Major', 'Major',
    'Extreme', 'Extreme', 'Exquisite']);
});
