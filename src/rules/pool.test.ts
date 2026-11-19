// CRC: crc-Pool.md | Test: test-Pool.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, type Chip, type Influence, type Sign } from '../model/records.ts';
import { accepts, rollUp, value, type Item, type Unit } from './pool.ts';

const where = { slot: '00000001', name: 'main' } as const;
let seq = 0;
const mint = () => `m${++seq}`;
const chip = (sign: Sign, points: number, rider = false): Chip =>
  ({ kind: 'chip', oid: mint(), where, n: 0, sign, points, rider });
const card = (name: string, points: number): Influence =>
  ({ kind: 'influence', oid: mint(), home: '00000003', where, n: 0, name, sign: 1, points, used: false, crit: false });

/** A slot's units as drawn: each sign strongest first, a pile as its value in brackets. */
const show = (slot: Item[]) => {
  const units = rollUp(slot), w = (u: Unit) => 'members' in u ? u.points : u.points + (u.kind === 'chip' && u.rider ? 1 : 0);
  const one = (u: Unit) => 'members' in u ? `(${u.sign < 0 ? '−' : ''}${u.points})` : `${u.sign < 0 ? '−' : ''}${u.points}${u.kind === 'chip' && u.rider ? '+1' : ''}`;
  const side = (s: Sign) => units.filter(u => u.sign === s).sort((a, b) => w(b) - w(a)).map(one).join(', ');
  return `[${side(1)}] / [${side(-1)}]`;
};
/** Every chip a slot's units hold, piles opened. */
const members = (u: Unit): Item[] => 'members' in u ? u.members.flatMap(members) : [u];

test('Roll Up', () => {
  // R366, R367: 4, 4, then three 2s, one carrying a +1, act as one 6; every chip is still there.
  const two = chip(1, 2, true), slot = [chip(1, 4), chip(1, 4), two, chip(1, 2), chip(1, 2)];
  assert.equal(show(slot), '[(6)] / []');
  assert.equal(value(slot), 6);
  assert.deepEqual(rollUp(slot).flatMap(members).map(i => i.oid).sort(), slot.map(i => i.oid).sort(), 'nothing merged');
  assert.equal(two.rider, true, 'the +1 stays on its chip, uncounted in the pile');
  assert.equal(value([chip(1, 2, true), chip(1, 2), chip(1, 2)]), 4, 'a pile of three 2s is a 4, its +1 not counted');
  // A fourth 2 stays beside the pile of 4, and riderless chips pile first, so a +1 left out still counts.
  assert.equal(show([chip(1, 2), chip(1, 2), chip(1, 2), chip(1, 2, true)]), '[(4), 2+1] / []');
  // Each sign on its own side.
  assert.equal(show([chip(-1, 4), chip(1, 2)]), '[2] / [−4]');
  // Cards pile, and so do chips and a card together.
  const cards = [card('A', 4), card('B', 4), card('C', 4)], pile = rollUp(cards)[0] as Unit & { members: Unit[] };
  assert.deepEqual([rollUp(cards).length, pile.points, pile.members.map(m => (m as Influence).name)], [1, 6, ['A', 'B', 'C']]);
  assert.equal(value(cards), 6);
  assert.equal(rollUp([chip(1, 2), chip(1, 2), card('D', 2)])[0]!.points, 4);
});

test('a Roll Up is worked out again, the same way every time', () => {
  // R366: a member taken out breaks the pile; the same chips in any order give the same piles.
  const a = chip(-1, 2), b = chip(-1, 2), c = chip(-1, 2), d = chip(-1, 2);
  assert.equal(show([a, b, c]), '[] / [(−4)]');
  assert.equal(show([a, c]), '[] / [−2, −2]');
  const piled = (xs: Item[]) => rollUp(xs).filter(u => 'members' in u).flatMap(members).map(i => i.oid).sort();
  assert.deepEqual(piled([d, c, b, a]), piled([a, b, c, d]));
  // R46: lowering a 4 to a 2 beside two 2s completes a Roll Up.
  assert.equal(show([chip(1, 2), chip(1, 2), { ...chip(1, 4), points: 2 }]), '[(4)] / []');
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
  assert.equal(into({ ...card('Keep the Peace', 4), mot: true }), 'main', 'R463: a Motivation card only into Main');
});
