// CRC: crc-MarkReader.md | Test: test-MarkReader.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, defend, influence, offer, spend } from './readmarks.ts';

test('action lines', () => {
  const rows: [string, string, number, number, number][] = [
    ['Mental Atk / Req: 5, 2d+3', 'Mental Atk / Req', 5, 2, 3],
    ['Mental Atk / Req: 2, +2', 'Mental Atk / Req', 2, 0, 2],
    ['Mental Atk / Req: 5, 1d', 'Mental Atk / Req', 5, 1, 0],
    ['Tricky -Min: 5, 2d', 'Tricky -Min', 5, 2, 0],
    ['Shoot: 4, +2 (unfr, x 2)', 'Shoot', 4, 0, 2],
    ['Attack: 4 (Suasion, Charm), +1', 'Attack', 4, 0, 1],
    ['Attack: -1, -1', 'Attack', -1, 0, -1],
    ['With Finesse: 4, 1d+1', 'With Finesse', 4, 1, 1],
    ['Attack: 1, +0', 'Attack', 1, 0, 0],
    ['Infer: 4, +2', 'Infer', 4, 0, 2],
  ];
  for (const [text, label, base, yellows, bonus] of rows) assert.deepEqual(action(text), { label, base, yellows, bonus }, text);
  for (const text of ['Defend: mental 2 / psych 4', 'Defend: 6 / 5', 'Sparked: 46  Grains: 14', 'Slots: Mild, Min ×3, Sig, Maj']) {
    assert.equal(action(text), null, text);
  }
});

test('Influence and Defend', () => {
  assert.deepEqual(influence('Money +Maj'), { name: 'Money', sign: 1, level: 'Maj' });
  assert.deepEqual(influence('Uncertain −Sig'), { name: 'Uncertain', sign: -1, level: 'Sig' });
  assert.deepEqual(influence('Distrust'), { name: 'Distrust', sign: null, level: null });
  assert.deepEqual(defend('2'), { mental: 2, psych: 2 });
  assert.deepEqual(defend('mental 2 / psych 4'), { mental: 2, psych: 4 });
  assert.deepEqual(defend('6 / 5'), { mental: 6, psych: 5 });
});

test('offers and spending', () => {
  assert.equal(offer('Infer: 4, +2'), 'act');
  assert.equal(offer('Money +Maj', 'Resources'), 'res');
  assert.equal(offer('Money +Maj', 'Items'), null);
  assert.equal(spend('Money +Maj (bank)', 1), 'Money +Sig (bank)');
});
