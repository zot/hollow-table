// CRC: crc-MarkReader.md | Test: test-MarkReader.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, adjust, attributes, defend, influence, motiveLeft, offer, spend, unadjusted } from './readmarks.ts';

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

test('a Motivation spends into its parentheses', () => {
  // R261: the written Level stays; the Levels left follow it, gone again when back to full.
  assert.equal(adjust('Keep the Peace +Sig', 1), 'Keep the Peace +Sig (+Min)');
  assert.equal(adjust('Keep the Peace +Sig (+Min)', 1), 'Keep the Peace +Sig (0)');
  assert.equal(adjust('Keep the Peace +Sig (0)', 1), null);
  assert.equal(adjust('Keep the Peace +Sig (0)', -1), 'Keep the Peace +Sig (+Min)');
  assert.equal(adjust('Keep the Peace +Sig (+Min)', -1), 'Keep the Peace +Sig');
  assert.equal(adjust('Keep the Peace +Sig', -1), 'Keep the Peace +Sig', 'never past full');
  assert.equal(adjust('Paranoia -Maj', 1), 'Paranoia -Maj (-Sig)');
  assert.equal(adjust('Keep the Peace (good for business) +Sig', 1), 'Keep the Peace (good for business) +Sig (+Min)');
  assert.deepEqual(['Faith +Min', 'Faith +Maj (+Min)', 'Faith +Maj (0)', 'Faith +Maj (−Sig)'].map(motiveLeft), [1, 1, 0, 2]);
  assert.equal(unadjusted('Faith +Maj (0)'), 'Faith +Maj');
  assert.equal(influence('Keep the Peace +Sig (0)')?.name, 'Keep the Peace');
});

test('a Motivation line is offered the Motivation pen', () => {
  // R258: `Name ±Level` under a Motivations heading, either sign.
  assert.equal(offer('Be Left Alone +Sig', 'Motivations'), 'mot');
  assert.equal(offer('Sparkers Are Trouble -Min', 'Motivation'), 'mot');
  assert.equal(offer('Money +Maj', 'Resources'), 'res');
  assert.equal(offer('Be Left Alone', 'Motivations'), null);
});

test('attributes', () => {
  // R267: `Name N` pairs, read from an `<att>` mark; a plain line of two or more is offered the pen.
  assert.deepEqual(attributes('Cha 2   Int 2   Wis 4'), { Cha: 2, Int: 2, Wis: 4 });
  assert.deepEqual(attributes('Con −1  Wis 10'), { Con: -1, Wis: 10 });
  assert.equal(offer('Cha 3   Int 1   Wis 3'), 'att');
  assert.equal(offer('Saloon Proprietor, Rank 3'), null);
  assert.equal(offer('Sparked: 46  Grains: 14'), null);
  assert.equal(offer('Wis 4'), null, 'one pair is not an attribute line');
});
