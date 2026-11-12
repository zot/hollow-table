// CRC: crc-PoolView.md | Test: test-PoolActions.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { PLAYER_OIDS, ridOf, type Chip, type Influence, type Oid, type Rec, type SlotName } from '../model/records.ts';
import {
  addLoose, cardClick, chipClick, feedFrom, killCard, mergeTap, minter, restoreUsed, riderClick, slotItems, tapOut, toDrawer, toSlot,
  toTable, vanish, writeCard, type Change,
} from './actions.ts';
import { BEAUFORD, DEVREUX, SAM, playtest } from '../store/playtest.ts';

function table() {
  const game = new Game();
  game.load(playtest());
  const mint = minter(game, true);
  const run = (c: Change | null) => { assert.ok(c, 'something to do'); game.change(c!); };
  const chip = (points: number, sign: 1 | -1 = 1, where: Chip['where'] = { table: { x: 0, y: 0, z: 0, tilt: 0 } }, rider = false): Chip => {
    const c: Chip = { kind: 'chip', oid: mint(), where, n: 0, sign, points, rider };
    game.change(w => w.put(ridOf(c.oid), c));
    return c;
  };
  const slot = (owner: Oid, name: SlotName) => slotItems(game, owner, name).map(i => `${i.sign < 0 ? '−' : ''}${i.points}${i.kind === 'chip' && i.rider ? '+1' : ''}`).sort();
  const get = (oid: Oid) => game.get(ridOf(oid)) as Rec | undefined;
  return { game, mint, run, chip, slot, get };
}

test('chips in slots', () => {
  const t = table();
  for (const p of [4, 4, 4]) t.run(toSlot(t.game, ridOf(t.chip(p).oid), SAM, 'main', t.mint));
  assert.deepEqual(t.slot(SAM, 'main'), ['6'], 'three 4s roll up');
  const one = t.chip(1, 1, { slot: SAM, name: 'edge' });
  t.run(chipClick(t.game, ridOf(one.oid), false, t.mint));
  assert.deepEqual(t.slot(SAM, 'edge'), ['2'], 'a +1 clicked makes a 2');
  t.run(chipClick(t.game, ridOf(one.oid), true, t.mint));
  assert.deepEqual(t.slot(SAM, 'edge'), ['1'], 'a 2 shift-clicked makes a +1');
  t.run(chipClick(t.game, ridOf(one.oid), true, t.mint));
  assert.deepEqual(t.slot(SAM, 'edge'), [], 'a +1 shift-clicked is gone');
  // Lowering completes a Roll Up: 4, 4 and a 6 lowered to 4.
  for (const p of [4, 4]) t.run(toSlot(t.game, ridOf(t.chip(p).oid), BEAUFORD, 'main', t.mint));
  const six = t.chip(6);
  t.run(toSlot(t.game, ridOf(six.oid), BEAUFORD, 'main', t.mint));
  t.run(chipClick(t.game, ridOf(six.oid), true, t.mint));
  assert.deepEqual(t.slot(BEAUFORD, 'main'), ['6']);
  t.run(addLoose(t.game, SAM, 'bonus', true, t.mint));
  assert.deepEqual(t.slot(SAM, 'bonus'), ['−1']);
  const ridden = t.chip(2, 1, { slot: SAM, name: 'bonus' }, true);
  assert.equal(riderClick(t.game, ridOf(ridden.oid), false), null, 'a click on a rider does nothing');
  t.run(riderClick(t.game, ridOf(ridden.oid), true));
  assert.equal((t.get(ridden.oid) as Chip).rider, false);
});

test('cards, drawers and the kill box', () => {
  const t = table();
  const card = t.get('00000004') as Influence;   // Devreux's Keep the Peace +Sig
  const biased: Influence = { ...card, oid: t.mint(), damage: 'bias' };
  t.game.change(w => w.put(ridOf(biased.oid), biased));
  assert.equal(toSlot(t.game, ridOf(biased.oid), DEVREUX, 'main', t.mint), null, 'a Bias card goes only into Bias');
  assert.ok(toSlot(t.game, ridOf(card.oid), DEVREUX, 'bias', t.mint), 'a plain card goes anywhere');
  t.run(toSlot(t.game, ridOf(card.oid), DEVREUX, 'main', t.mint));
  assert.deepEqual((t.get(card.oid) as Influence).where, { slot: DEVREUX, name: 'main' });
  t.run(toTable(t.game, ridOf(card.oid), { x: 5, y: 5, z: 1, tilt: 0 }));
  assert.equal((t.get(card.oid) as Influence).where, 'drawer', 'a plain card dropped elsewhere goes home');
  t.run(toDrawer(t.game, ridOf(card.oid), SAM));
  assert.equal((t.get(card.oid) as Influence).home, SAM, "another character's drawer makes it theirs");
  t.run(cardClick(t.game, ridOf(card.oid), true, t.mint));
  t.run(cardClick(t.game, ridOf(card.oid), true, t.mint) ?? (() => undefined));
  assert.equal((t.get(card.oid) as Influence).points, 2, 'cards stop at Min');
  t.run(writeCard(SAM, -1, 'Grudge', t.mint));
  const grudge = t.game.all().map(([, r]) => r).find((r): r is Influence => 'kind' in r && r.kind === 'influence' && r.name === 'Grudge')!;
  assert.deepEqual([grudge.sign, grudge.points, grudge.where], [-1, 2, 'drawer']);
  t.run(killCard(t.game, ridOf(grudge.oid)));
  assert.equal(t.get(grudge.oid), undefined);
  const used: Influence = { ...grudge, oid: t.mint(), where: 'used', used: true };
  t.game.change(w => w.put(ridOf(used.oid), used));
  t.run(restoreUsed(t.game, ridOf(used.oid)));
  assert.deepEqual([(t.get(used.oid) as Influence).where, (t.get(used.oid) as Influence).used], ['drawer', false]);
  const loose = t.chip(2);
  t.run(vanish(t.game, ridOf(loose.oid)));
  assert.equal(t.get(loose.oid), undefined);
});

test('taps from glyphs', () => {
  const t = table();
  const resources = () => (t.get(SAM) as { front: string }).front.match(/<res>[^<]*<\/res>/g)!.join(' ');
  t.run(tapOut(t.game, `${SAM}:Money`, { table: { x: 1, y: 1, z: 1, tilt: 0 } }, t.mint));
  const made = t.game.all().map(([, r]) => r).find((r): r is Influence => 'kind' in r && r.kind === 'influence' && !!r.tap)!;
  assert.equal(made.points, 2);
  t.run(feedFrom(t.game, ridOf(made.oid), `${SAM}:Ammo`, t.mint));
  assert.equal((t.get(made.oid) as Influence).points, 4, 'another glyph dropped on it feeds it');
  t.run(toTable(t.game, ridOf(made.oid), { x: 9, y: 9, z: 1, tilt: 0 }));
  assert.ok(typeof (t.get(made.oid) as Influence).where === 'object', 'a tap may wait loose');
  t.run(cardClick(t.game, ridOf(made.oid), true, t.mint));
  const before = resources();
  t.run(killCard(t.game, ridOf(made.oid)));
  assert.notEqual(resources(), before, 'killing it refunds its sources');
  assert.match(resources(), /Money \+Maj.*Ammo \+Sig/);
});

test('a tap merges into a resource-made card', () => {
  const t = table();
  const money = () => (t.get(SAM) as { front: string }).front.match(/<res>Money[^<]*<\/res>/)![0];
  const taps = () => t.game.all().map(([, r]) => r).filter((r): r is Influence => 'kind' in r && r.kind === 'influence' && !!r.tap);
  const at = { table: { x: 1, y: 1, z: 1, tilt: 0 } };
  t.run(tapOut(t.game, `${SAM}:Money`, at, t.mint));
  const [a] = taps();
  t.run(tapOut(t.game, `${SAM}:Money`, at, t.mint));
  const b = taps().find(x => x.oid !== a!.oid)!;
  assert.equal(money(), '<res>Money +Min</res>', 'two taps spent two Levels');
  t.run(mergeTap(t.game, ridOf(b.oid), ridOf(a!.oid), t.mint));
  assert.equal(t.get(b.oid), undefined, 'the carried card is gone');
  assert.equal((t.get(a!.oid) as Influence).points, 4, 'its Level is in the card it merged into');
  assert.equal(money(), '<res>Money +Min</res>', 'and spent once, not twice');
  assert.equal(mergeTap(t.game, ridOf(a!.oid), ridOf(a!.oid), t.mint), null, 'not into itself');
  // A card carrying two Levels from one source gives both.
  const ammo = () => (t.get(SAM) as { front: string }).front.match(/<res>Ammo[^<]*<\/res>/)![0];
  t.run(tapOut(t.game, `${SAM}:Ammo`, at, t.mint));
  const c = taps().find(x => x.oid !== a!.oid)!;
  t.run(feedFrom(t.game, ridOf(c.oid), `${SAM}:Ammo`, t.mint));
  assert.equal(ammo(), '<res>Ammo +0</res>');
  t.run(mergeTap(t.game, ridOf(c.oid), ridOf(a!.oid), t.mint));
  assert.equal((t.get(a!.oid) as Influence).points, 8, 'both Levels arrive');
  assert.equal(ammo(), '<res>Ammo +0</res>', 'each spent once');
});

test('new oids', () => {
  const t = table();
  const gm = minter(t.game, true), a = gm(), b = gm();
  assert.equal(parseInt(b, 16), parseInt(a, 16) + 1, 'the GM counts up');
  assert.ok(parseInt(a, 16) < PLAYER_OIDS);
  const player = minter(t.game, false, () => 0.5)();
  assert.ok(parseInt(player, 16) >= PLAYER_OIDS, "a player's are in the players' range");
});
