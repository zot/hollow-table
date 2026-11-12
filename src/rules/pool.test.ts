// CRC: crc-Pool.md | Test: test-Pool.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, type Chip, type Influence, type Sign } from '../model/records.ts';
import { accepts, order, rollUp, value, type Item, type Unit } from './pool.ts';

const where = { slot: '00000001', name: 'main' } as const;
let seq = 0;
const mint = () => `m${++seq}`;
const chip = (sign: Sign, points: number, rider = false): Chip =>
  ({ kind: 'chip', oid: mint(), where, n: 0, sign, points, rider });
const card = (name: string, points: number): Influence =>
  ({ kind: 'influence', oid: mint(), home: '00000003', where, n: 0, name, sign: 1, points, used: false, crit: false });

/** Drop items into a slot one at a time, applying each Roll Up as it happens. */
function drop(slot: Item[], ...items: Item[]): Item[] {
  for (const i of items) {
    slot = [...slot, i];
    const plan = rollUp(slot, mint);
    slot = [...slot.filter(x => !plan.remove.includes(x.oid)), ...plan.add];
  }
  return slot;
}
const show = (slot: Item[]) => {
  const { pos, neg } = order(slot);
  const one = (i: Item) => `${i.sign < 0 ? '−' : ''}${i.points}${i.kind === 'chip' && i.rider ? '+1' : ''}`;
  return `[${pos.map(one).join(', ')}] / [${neg.map(one).join(', ')}]`;
};

test('Roll Up', () => {
  // 1: 4, 4, 2, a +1 onto that 2, then 2, 2.
  let slot = drop([], chip(1, 4), chip(1, 4));
  const two = chip(1, 2);
  slot = drop(slot, two);
  slot = slot.map(i => i === two ? { ...two, rider: true } : i);
  slot = drop(slot, chip(1, 2), chip(1, 2));
  assert.equal(show(slot), '[6] / []');

  // 2: a 2+1, then three 2s one at a time; the third arrival rolls up and spends the +1.
  slot = drop([], chip(1, 2, true), chip(1, 2), chip(1, 2));
  assert.equal(show(slot), '[4] / []');
  slot = drop(slot, chip(1, 2));
  assert.equal(show(slot), '[4, 2] / []');

  // 3: each sign stacks on its own side.
  assert.equal(show(drop([], chip(-1, 4), chip(1, 2))), '[2] / [−4]');

  // 4: three equal cards pile, nothing merged.
  const cards = [card('A', 4), card('B', 4), card('C', 4)];
  let plan = rollUp(cards, mint);
  assert.deepEqual([plan.remove, plan.add], [[], []]);
  assert.equal(plan.units.length, 1);
  const pile = plan.units[0] as Unit & { members: Unit[] };
  assert.equal(pile.points, 6);
  assert.deepEqual(pile.members.map(m => (m as Influence).name), ['A', 'B', 'C']);
  assert.equal(value(cards), 6);

  // 5: two chips and a card of one value pile, never merge.
  plan = rollUp([chip(1, 2), chip(1, 2), card('D', 2)], mint);
  assert.deepEqual([plan.remove, plan.add], [[], []]);
  assert.equal(plan.units[0]!.points, 4);
});

test('best minus worst', () => {
  assert.equal(value([chip(1, 4), chip(1, 2), chip(-1, 2), chip(-1, 6)]), -2);
  assert.equal(value([chip(1, 4), chip(1, 2), chip(-1, 2)]), 2);
  assert.equal(value([]), 0);
});

test('a Damage card goes only into its own slot', () => {
  const into = (i: Item) => SLOTS.filter(s => accepts(s, i)).join(' ');
  assert.equal(into({ ...card('Uncertain', 2), sign: -1, damage: 'bias' }), 'bias');
  assert.equal(into({ ...card('Broken Leg', 2), sign: -1, damage: 'injury' }), 'injury');
  assert.equal(into(card('Money', 2)), SLOTS.join(' '));
  assert.equal(into(chip(-1, 2)), SLOTS.join(' '));
});
