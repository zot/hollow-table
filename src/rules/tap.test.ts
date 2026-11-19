// CRC: crc-Tap.md | Test: test-Tap.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Damage, Influence, Opinion, RowName } from '../model/records.ts';
import { marks, parse } from '../text/marks.ts';
import { MIXED, PLAIN, USED, allowFlag, feed, kill, leftOf, mayTap, mildGone, recharge, rechargeMotives, tap, undoFlag, unfeed, type Holder, type Tapped } from './tap.ts';
import { levelName } from './influence.ts';
import { connection } from './connections.ts';
import { BEAUFORD, DEVREUX, SAM, scene } from '../store/playtest.ts';

/** The Levels a source of this character has left, asked as a glyph asks. */
const left = (c: Character, rest: string) => leftOf(oid => (oid === c.oid ? c : undefined), `${c.oid}:${rest}`);

/** A table of characters that takes each tap's changes. */
function table() {
  const chars = new Map(scene().filter((r): r is Character => r.kind === 'character').map(c => [c.oid, c]));
  const look = (oid: string) => chars.get(oid);
  const take = (t: Tapped | null): Influence | null => {
    for (const c of t?.changed ?? []) chars.set(c.oid, c as Character);
    return t?.card ?? null;
  };
  const resources = (oid: string) => marks(parse(chars.get(oid)!.front), 'res').map(m => m.text).join(', ');
  return { chars, look, take, resources };
}
const show = (c: Influence) =>
  `${c.name} ${c.sign < 0 ? '−' : '+'}${levelName(c.points)} ${JSON.stringify(c.tap?.ledger ?? {})}`;
const where = { table: { x: 0, y: 0, z: 0, tilt: 0 } };
/** A plain card, written in Devreux's drawer: no tap behind it. */
const written = (oid: string): Influence => ({ kind: 'influence', oid, home: DEVREUX, where: 'drawer', n: 9, name: 'Grit', sign: 1, points: 2, used: false, crit: false });

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

test('flagged taps and refunds', () => {
  // R461: a Resource fed into a plain card feeds it, flagged for the GM, and the card remembers it was plain.
  const t = table();
  const plain = written('p1'), inPool = { ...plain, where: { slot: DEVREUX, name: 'main' as const } };
  const fedPlain = t.take(feed(t.look, inPool, `${DEVREUX}:Money`, 'x'))!;
  assert.deepEqual([fedPlain.oid, fedPlain.points, fedPlain.flag], [plain.oid, plain.points + 2, { why: PLAIN, fed: { [`${DEVREUX}:Money`]: 1 }, plain: true }]);
  // (Devreux's Money is spent out by now: the next tap is Sam's.)
  const beside = t.take(tap(t.look, `${SAM}:Money`, inPool.where, 'c2'))!;
  assert.equal(show(beside), `Money +Min ${JSON.stringify({ [`${SAM}:Money`]: 1 })}`);

  // R462: a used card is fed itself, flagged, not a new card beside it.
  const used = { ...beside, used: true };
  const fedUsed = t.take(feed(t.look, used, undefined, 'c3'))!;
  assert.deepEqual([fedUsed.oid, fedUsed.points, fedUsed.flag?.why], [used.oid, 4, USED]);

  const lc = `${BEAUFORD}:Liquid Courage`;
  const card = t.take(tap(t.look, lc, where, 'c4'))!;
  assert.equal(t.resources(BEAUFORD), 'Money +Min, Liquid Courage +Sig');
  for (const c of kill(t.look, card)) t.chars.set(c.oid, c as Character);
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
  // R463, R261, R262: a Main Pool Influence of its sign; the Motivation spends into its parentheses
  // and recharges at a scene's end; only Motivations feed the card.
  const t = table(), dev = () => t.chars.get(DEVREUX)!, mots = () => marks(parse(dev().front), 'mot').map(m => m.text).join(', ');
  assert.equal(mots(), 'Keep the Peace +Sig (0), Self-Preservation +Sig (0), Old Sympathy for Sparkers +Min (0)');
  assert.equal(tap(t.look, `${DEVREUX}:Keep the Peace`, where, 'c1'), null, 'spent out until the scene ends');
  t.chars.set(DEVREUX, rechargeMotives(dev()));
  assert.equal(mots(), 'Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers +Min');
  const card = t.take(tap(t.look, `${DEVREUX}:Keep the Peace`, where, 'c1'))!;
  assert.deepEqual([card.mot, card.sign, card.points, card.damage], [true, 1, 2, undefined]);
  assert.match(mots(), /^Keep the Peace \+Sig \(\+Min\),/);
  // R463: a Resource and a Motivation on one card is the GM's call: fed, and flagged.
  const mixed = feed(t.look, card, `${DEVREUX}:Money`, 'x')!;
  assert.deepEqual([mixed.card.points, mixed.card.flag?.why], [4, MIXED], 'a Resource feeds a Motivation card, flagged');
  const fed = t.take(feed(t.look, card, `${DEVREUX}:Self-Preservation`, 'x'))!;
  assert.equal(fed.flag, undefined, 'Motivations together: no flag');
  assert.equal(fed.points, 4);
  assert.match(mots(), /Self-Preservation \+Sig \(\+Min\)/);
  for (const c of kill(t.look, fed)) t.chars.set(c.oid, c as Character);
  assert.equal(mots(), 'Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers +Min', 'a refund back to full');
  const money = t.take(tap(t.look, `${SAM}:Money`, where, 'c2'))!;
  assert.equal(feed(t.look, money, `${DEVREUX}:Keep the Peace`, 'x')!.card.flag?.why, MIXED, 'a Motivation feeds a Resource card, flagged');
});

test('the GM rules on a flag: allow keeps the tap, undo gives the flagged Levels back', () => {
  // R464.
  const t = table();
  const plain = written('p2');
  const before = t.resources(DEVREUX);
  const fedPlain = t.take(feed(t.look, plain, `${DEVREUX}:Money`, 'x'))!;
  assert.notEqual(t.resources(DEVREUX), before);
  assert.equal(allowFlag(fedPlain).flag, undefined, 'allowed: the flag goes, the tap stays');
  assert.equal(allowFlag(fedPlain).points, fedPlain.points);
  const back = t.take(undoFlag(t.look, fedPlain))!;
  assert.deepEqual(back, plain, 'undone: the plain card as it was');
  assert.equal(t.resources(DEVREUX), before, 'and the Resource as it was');
  // A tap fed before the flag keeps its own Levels.
  const money = t.take(tap(t.look, `${SAM}:Money`, where, 'c9'))!;
  const used = t.take(feed(t.look, { ...money, used: true }, undefined, 'x'))!;
  const undone = t.take(undoFlag(t.look, used))!;
  assert.deepEqual([undone.points, undone.flag, undone.tap?.ledger], [2, undefined, { [`${SAM}:Money`]: 1 }]);
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

// R343: a named Conviction taps into a Bias card worth its Levels, and End recharges it.
test('tapping a Conviction', () => {
  const t = table(), sam = () => t.chars.get(SAM)!;
  t.chars.set(SAM, { ...sam(), back: { ...sam().back, lasting: { bias: { name: 'Cheats win', points: 7, spent: 0 } } } });
  assert.equal(left(sam(), 'bias/lasting'), 3, 'Maj: 3 Levels');
  const card = t.take(tap(t.look, `${SAM}:bias/lasting`, where, 'c1'))!;
  assert.deepEqual([card.name, card.damage, card.sign], ['Cheats win', 'bias', -1]);
  assert.equal(sam().back.lasting!.bias!.spent, 1);
  assert.equal(left(sam(), 'bias/lasting'), 2);
  assert.equal(recharge(sam()).back.lasting!.bias!.spent, 0);
  // Unnamed, or a Burden the card doesn't have, is no source.
  t.chars.set(SAM, { ...sam(), back: { ...sam().back, lasting: { bias: { name: '', points: 7, spent: 0 } } } });
  assert.equal(tap(t.look, `${SAM}:bias/lasting`, where, 'c2'), null);
  assert.equal(tap(t.look, `${SAM}:affliction/lasting`, where, 'c2'), null);
  assert.equal(tap(t.look, `${SAM}:injury/lasting`, where, 'c2'), null);
});

// R344: at End a card loses what Mild slots (or their boxes) gave it, and goes if that was all.
test('what Mild gave goes at End', () => {
  const card = (ledger: Record<string, number>, current: string, points: number): Influence => ({ kind: 'influence', oid: 'c1', home: SAM,
    where: 'drawer', n: 0, name: 'Sore loser', sign: -1, points, used: false, crit: false, damage: 'bias', tap: { ledger, current } });
  const mild = `${SAM}:bias/mild`, box = `${SAM}:bias/mild#1`, sig = `${SAM}:bias/sig`;
  assert.equal(mildGone(card({ [mild]: 1 }, mild, 2)), null);
  assert.equal(mildGone(card({ [mild]: 1, [box]: 1 }, box, 4)), null, 'a Mild box is Mild too');
  assert.deepEqual(mildGone(card({ [sig]: 2, [mild]: 1, [box]: 1 }, mild, 8))!.tap, { ledger: { [sig]: 2 }, current: sig });
  assert.equal(mildGone(card({ [sig]: 2, [mild]: 1, [box]: 1 }, sig, 8))!.points, 4);
  assert.equal(mildGone(card({ [sig]: 0, [mild]: 1 }, mild, 2)), null, 'nothing left from the rest');
  const plain = card({ [sig]: 1 }, sig, 2), unfed = { ...plain, tap: undefined };
  assert.equal(mildGone(plain), plain, 'no Mild: the same card');
  assert.equal(mildGone(unfed), unfed, 'a plain card');
  // A Min slot is not Mild, though it's worth the same.
  assert.equal(mildGone(card({ [`${SAM}:bias/min`]: 1 }, `${SAM}:bias/min`, 2))!.points, 2);
});

test('tapping an Opinion', () => {
  // R433, R434: a record's line taps as a Motivation does, into a `mot` card named for the NPC.
  const dev = scene().find(r => r.oid === DEVREUX) as Character;
  const holders = new Map<string, Holder>([[DEVREUX, dev], ['e0000001', { kind: 'opinion', oid: 'e0000001', holder: 'c0000005', of: SAM,
    text: 'Reputation +Sig\nProfessional Respect (Tact) +Min' } satisfies Opinion]]);
  const look = (oid: string) => holders.get(oid), rec = () => holders.get('e0000001') as Opinion;
  const take = (t: Tapped | null) => { for (const h of t?.changed ?? []) holders.set(h.oid, h); return t?.card ?? null; };
  const src = `${DEVREUX}:oe0000001/Reputation`, where = { table: { x: 0, y: 0, z: 0, tilt: 0 } };
  const card = take(tap(look, src, where, 'c1'))!;
  assert.deepEqual([card.name, card.mot, card.sign, card.home, card.points], ['Devreux: Reputation', true, 1, DEVREUX, 2]);
  assert.equal(rec().text.split('\n')[0], 'Reputation +Sig (+Min)');
  assert.equal(connection(rec().text), 2, 'R434: the Connection counts the fixed Level');
  const fed = take(feed(look, card, undefined, 'c2'))!;
  assert.equal(rec().text.split('\n')[0], 'Reputation +Sig (0)');
  assert.equal(leftOf(look, src), 0);
  const back = take(unfeed(look, fed))!;
  assert.equal(rec().text.split('\n')[0], 'Reputation +Sig (+Min)');
  const refunds = kill(look, back);
  assert.deepEqual(refunds.map(h => h.oid), ['e0000001']);
  for (const h of refunds) holders.set(h.oid, h);
  assert.equal(rec().text, 'Reputation +Sig\nProfessional Respect (Tact) +Min');
  const pr = take(tap(look, `${DEVREUX}:oe0000001/Professional Respect (Tact)`, where, 'c3'))!;
  assert.equal(pr.name, 'Devreux: Professional Respect (Tact)');
  assert.equal(mayTap({ name: 'Dana', gm: false }, dev, 'oe0000001/Reputation'), false, 'R432: only the GM');
  assert.equal(mayTap({ name: 'GM', gm: true }, dev, 'oe0000001/Reputation'), true);
});
