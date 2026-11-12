// CRC: crc-Tap.md | Test: test-Tap.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Damage, Influence, RowName } from '../model/records.ts';
import { marks, parse } from '../text/marks.ts';
import { feed, kill, left, mayTap, recharge, rechargeMotives, tap, unfeed, type Tapped } from './tap.ts';
import { levelName } from './influence.ts';
import { BEAUFORD, DEVREUX, SAM, scene } from '../store/playtest.ts';

/** A table of characters that takes each tap's changes. */
function table() {
  const chars = new Map(scene().filter((r): r is Character => r.kind === 'character').map(c => [c.oid, c]));
  const look = (oid: string) => chars.get(oid);
  const take = (t: Tapped | null): Influence | null => {
    for (const c of t?.changed ?? []) chars.set(c.oid, c);
    return t?.card ?? null;
  };
  const resources = (oid: string) => marks(parse(chars.get(oid)!.front), 'res').map(m => m.text).join(', ');
  return { chars, look, take, resources };
}
const show = (c: Influence) =>
  `${c.name} ${c.sign < 0 ? '−' : '+'}${levelName(c.points)} ${JSON.stringify(c.tap?.ledger ?? {})}`;
const where = { table: { x: 0, y: 0, z: 0, tilt: 0 } };

test('the ledger', () => {
  const t = table(), r1 = `${SAM}:Money`, r2 = `${SAM}:Ammo`;
  const L = (a: number, b?: number) => JSON.stringify(b === undefined ? { [r1]: a } : { [r1]: a, [r2]: b });
  let card = t.take(tap(t.look, r1, where, 'c1'))!;                                   // 1
  assert.equal(show(card), `Money +Min ${L(1)}`);
  assert.equal(t.resources(SAM), 'Money +Sig, Ammo +Sig');
  card = t.take(feed(t.look, card, undefined, 'x'))!;                                 // 2
  assert.equal(show(card), `Money +Sig ${L(2)}`);
  assert.equal(t.resources(SAM), 'Money +Min, Ammo +Sig');
  card = t.take(unfeed(t.look, card))!;                                               // 3
  assert.equal(show(card), `Money +Min ${L(1)}`);
  assert.equal(t.resources(SAM), 'Money +Sig, Ammo +Sig');
  card = t.take(feed(t.look, card, r2, 'x'))!;                                        // 4
  assert.equal(show(card), `Money +Sig ${L(1, 1)}`);
  assert.equal(t.resources(SAM), 'Money +Sig, Ammo +Min');
  card = t.take(feed(t.look, card, undefined, 'x'))!;                                 // 5
  assert.equal(show(card), `Money +Maj ${L(1, 2)}`);
  assert.equal(t.resources(SAM), 'Money +Sig, Ammo +0');
  assert.equal(feed(t.look, card, undefined, 'x'), null);                             // 6
  for (let i = 0; i < 3; i++) card = t.take(unfeed(t.look, card)) ?? card;            // 7
  assert.equal(show(card), `Money +Min ${L(1, 0)}`);
  assert.equal(t.resources(SAM), 'Money +Sig, Ammo +Sig');
});

test('refusals and refunds', () => {
  const t = table();
  const plain = scene().find((r): r is Influence => r.kind === 'influence' && r.name === 'Keep the Peace')!;
  const inPool = { ...plain, where: { slot: DEVREUX, name: 'main' as const } };
  assert.equal(feed(t.look, inPool, `${DEVREUX}:Money`, 'x'), null);
  const beside = t.take(tap(t.look, `${DEVREUX}:Money`, inPool.where, 'c2'))!;
  assert.equal(show(beside), `Money +Min ${JSON.stringify({ [`${DEVREUX}:Money`]: 1 })}`);

  const used = { ...beside, used: true };
  const fresh = t.take(feed(t.look, used, undefined, 'c3'))!;
  assert.equal(fresh.oid, 'c3');
  assert.deepEqual(fresh.where, used.where);
  assert.equal(fresh.points, 2);

  const lc = `${BEAUFORD}:Liquid Courage`;
  const card = t.take(tap(t.look, lc, where, 'c4'))!;
  assert.equal(t.resources(BEAUFORD), 'Money +Min, Liquid Courage +Sig');
  for (const c of kill(t.look, card)) t.chars.set(c.oid, c);
  assert.equal(t.resources(BEAUFORD), 'Money +Min, Liquid Courage +Maj');
  assert.deepEqual(kill(t.look, { ...card, used: true }), []);
});

/** Sam with these Damage slots filled in: `{'bias/sig': ['Uncertain', 1]}` names the slot and checks 1 box. */
function damaged(t: ReturnType<typeof table>, slots: Record<string, [string, number]>) {
  const sam = t.chars.get(SAM)!;
  const damage = structuredClone(sam.back.damage);
  for (const [at, [name, checked]] of Object.entries(slots)) {
    const [d, r] = at.split('/') as [Damage, RowName];
    damage[d][r] = { name, boxes: Array<boolean>(checked).fill(true), spent: [] };
  }
  t.chars.set(SAM, { ...sam, back: { ...sam.back, damage } });
}

test('Damage slots', () => {
  const t = table();
  // A box can be checked only once its slot has a name (PieceView); here the slot is named and checked.
  damaged(t, { 'bias/sig': ['Uncertain', 1] });
  const r4 = `${SAM}:bias/sig`, r5 = `${SAM}:bias/sig#1`;
  let card = t.take(tap(t.look, r4, where, 'c5'))!;
  assert.equal(show(card), `Uncertain −Min ${JSON.stringify({ [r4]: 1 })}`);
  assert.equal(card.damage, 'bias');
  card = t.take(feed(t.look, card, undefined, 'x'))!;
  assert.equal(show(card), `Uncertain −Sig ${JSON.stringify({ [r4]: 2 })}`);
  assert.deepEqual(t.chars.get(SAM)!.back.damage.bias.sig.spent, [2]);       // the slot shows −2
  assert.equal(feed(t.look, card, undefined, 'x'), null);                     // a Sig slot holds 2
  card = t.take(feed(t.look, card, r5, 'x'))!;                                // the box: its own 2, same name
  assert.equal(show(card), `Uncertain −Maj ${JSON.stringify({ [r4]: 2, [r5]: 1 })}`);
  assert.deepEqual(t.chars.get(SAM)!.back.damage.bias.sig.spent, [2, 1]);
  assert.deepEqual(recharge(t.chars.get(SAM)!).back.damage.bias.sig.spent, []);
  // An unnamed slot, or an unchecked box, is no source.
  assert.equal(tap(t.look, `${SAM}:injury/sig`, where, 'c9'), null);
  assert.equal(tap(t.look, `${SAM}:bias/sig#2`, where, 'c9'), null);
});

test('only <res> marks on the front are sources', () => {
  const t = table(), sam = t.chars.get(SAM)!;
  t.chars.set(SAM, { ...sam, front: `${sam.front}\n<inf>Luck +Sig</inf>\n<inj>Broken Leg -Sig</inj>` });
  assert.equal(tap(t.look, `${SAM}:Luck`, where, 'c6'), null);
  assert.equal(tap(t.look, `${SAM}:Broken Leg`, where, 'c6'), null);
  assert.notEqual(tap(t.look, `${SAM}:Money`, where, 'c7'), null);
});

test('a box draws on its own column and row', () => {
  const t = table();
  damaged(t, { 'bias/mild': ['Jumpy', 1], 'bias/sig': ['Uncertain', 1], 'injury/sig': ['Broken Leg', 1] });
  const src = `${SAM}:injury/sig#1`;
  const card = t.take(tap(t.look, src, where, 'c8'))!;
  assert.deepEqual([show(card), card.damage], [`Broken Leg −Min ${JSON.stringify({ [src]: 1 })}`, 'injury']);
  const d = t.chars.get(SAM)!.back.damage;
  assert.deepEqual([d.injury.sig.spent, d.bias.sig.spent, d.bias.mild.spent], [[0, 1], [], []]);
});

test('a card takes only its own kind', () => {
  const t = table();
  damaged(t, { 'bias/sig': ['Uncertain', 0], 'affliction/sig': ['Ashamed', 0], 'injury/sig': ['Broken Leg', 0] });
  const bias = t.take(tap(t.look, `${SAM}:bias/sig`, where, 'b'))!;
  const money = t.take(tap(t.look, `${SAM}:Money`, where, 'm'))!;
  assert.deepEqual([
    feed(t.look, bias, `${SAM}:injury/sig`, 'x'),
    feed(t.look, bias, `${SAM}:affliction/sig`, 'x'),
    feed(t.look, bias, `${SAM}:Ammo`, 'x'),
    feed(t.look, money, `${SAM}:bias/sig`, 'x'),
  ], [null, null, null, null]);
  assert.equal(money.damage, undefined);
  // Anyone may tap any character's Damage (R212): the rules never ask who.
  assert.notEqual(feed(t.look, bias, undefined, 'x'), null);
});

test('what a source has left', () => {
  // R250: a glyph fades when its source has no Levels left.
  const t = table(), sam = () => t.chars.get(SAM)!;
  assert.equal(left(sam(), 'Ammo'), 2);
  const card = t.take(tap(t.look, `${SAM}:Ammo`, where, 'c1'))!;
  t.take(feed(t.look, card, undefined, 'x'));
  assert.equal(left(sam(), 'Ammo'), 0);
  assert.equal(left(sam(), 'Money'), 3);
  assert.equal(left(sam(), 'Nothing'), 0);
  assert.equal(left(sam(), 'injury/sig'), 0);                 // an unnamed slot
  damaged(t, { 'bias/sig': ['Uncertain', 1] });
  assert.equal(left(sam(), 'bias/sig'), 2);
  assert.equal(left(sam(), 'bias/sig#1'), 2);
  assert.equal(left(sam(), 'bias/sig#2'), 0);                 // an unchecked box
});

test('tapping a Motivation', () => {
  // R260, R261, R262: a Main Pool Influence of its sign; the Motivation spends into its parentheses
  // and recharges at a scene's end; only Motivations feed the card.
  const t = table(), dev = () => t.chars.get(DEVREUX)!, mots = () => marks(parse(dev().front), 'mot').map(m => m.text).join(', ');
  assert.equal(mots(), 'Keep the Peace +Sig (0), Self-Preservation +Sig (0), Old Sympathy for Sparkers +Min (0)');
  assert.equal(tap(t.look, `${DEVREUX}:Keep the Peace`, where, 'c1'), null, 'spent out until the scene ends');
  t.chars.set(DEVREUX, rechargeMotives(dev()));
  assert.equal(mots(), 'Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers +Min');
  const card = t.take(tap(t.look, `${DEVREUX}:Keep the Peace`, where, 'c1'))!;
  assert.deepEqual([card.mot, card.sign, card.points, card.damage], [true, 1, 2, undefined]);
  assert.match(mots(), /^Keep the Peace \+Sig \(\+Min\),/);
  assert.equal(feed(t.look, card, `${DEVREUX}:Money`, 'x'), null, 'a Resource does not feed a Motivation card');
  const fed = t.take(feed(t.look, card, `${DEVREUX}:Self-Preservation`, 'x'))!;
  assert.equal(fed.points, 4);
  assert.match(mots(), /Self-Preservation \+Sig \(\+Min\)/);
  for (const c of kill(t.look, fed)) t.chars.set(c.oid, c);
  assert.equal(mots(), 'Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers +Min', 'a refund back to full');
  const money = t.take(tap(t.look, `${SAM}:Money`, where, 'c2'))!;
  assert.equal(feed(t.look, money, `${DEVREUX}:Keep the Peace`, 'x'), null, 'a Motivation does not feed a Resource card');
});

test('who may tap', () => {
  // R259: your own Resources only (or the GM); anyone's Motivations and Damage.
  const t = table();
  damaged(t, { 'bias/sig': ['Uncertain', 0] });
  const sam = t.chars.get(SAM)!, dev = rechargeMotives(t.chars.get(DEVREUX)!);
  const dana = { name: sam.owner, gm: false }, other = { name: 'Someone', gm: false }, gm = { name: 'GM', gm: true };
  assert.deepEqual([dana, other, gm, null].map(v => mayTap(v, sam, 'Money')), [true, false, true, false]);
  assert.deepEqual([dana, other, null].map(v => mayTap(v, dev, 'Keep the Peace')), [true, true, true]);
  assert.deepEqual([dana, other].map(v => mayTap(v, dev, 'Money')), [false, false]);
  assert.equal(mayTap(other, sam, 'bias/sig'), true, 'Damage: anyone (R212)');
  assert.equal(mayTap(gm, sam, 'Nothing'), false, 'no such source');
});
