// CRC: crc-RollRow.md | Test: test-RollRow.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Character } from '../model/records.ts';
import { BEAUFORD, DEVREUX, SAM, playtest } from '../store/playtest.ts';
import { aimed, cleared, defendOf, dock, fresh, handStep, intentOf, picked, rollsFor, shown, unaimed, withAction } from './rollrow.ts';

const scene = () => { const g = new Game(); g.load(playtest('Dana', 'Ann')); return g; };

test('docking and starting fresh', () => {
  // R68, R69: a pool's die docks the row there; the same die again starts fresh; private stays.
  const r = dock(null, SAM);
  assert.deepEqual([r.pool, r.action, r.opponent, r.row, r.hand], [SAM, '', null, null, { yellows: 1, bonus: 0 }]);
  const busy = { ...withAction(r, 'Infer'), opponent: DEVREUX, priv: true };
  assert.deepEqual(dock(busy, SAM), { ...fresh(SAM), priv: true });
  assert.equal(dock(busy, BEAUFORD).pool, BEAUFORD);
  assert.deepEqual(cleared(busy), { ...fresh(SAM), priv: true }, 'R78: clearing the Base starts fresh');
});

test('an action, the hand and the row', () => {
  // R76, R82, R276: an action resets the hand, and the row to White unless aiming; R72 a picked row holds.
  let r = picked(dock(null, SAM), 'green');
  r = handStep(handStep(r, 'yellows', 1), 'bonus', -1);
  const a = withAction(r, 'Infer');
  assert.deepEqual([a.action, a.hand, a.row, a.byHand], ['Infer', { yellows: 0, bonus: 0 }, null, false]);
  const aimed = withAction({ ...r, opponent: DEVREUX }, 'Impress');
  assert.deepEqual([aimed.row, aimed.byHand], ['green', true], 'while aiming the row stays');
});

test('what the row shows', () => {
  // R79–R81: Base and Total Influence; the card as written until the Bonus pool adds; the hand on top.
  const g = scene();
  let r = withAction(dock(null, SAM), 'Infer');
  let s = shown(g, r);
  assert.deepEqual([s.label, s.base, s.total, s.yellows, s.bonus, s.row.key], ['Infer', 4, 4, 0, 2, 'white']);
  g.change(w => {
    w.put(ridOf('0000000a'), { kind: 'chip', oid: '0000000a', where: { slot: SAM, name: 'main' }, n: 0, sign: 1, points: 4, rider: false });
    w.put(ridOf('0000000c'), { kind: 'chip', oid: '0000000c', where: { slot: SAM, name: 'bonus' }, n: 0, sign: 1, points: 2, rider: false });
  });
  s = shown(g, r);
  assert.deepEqual([s.total, s.parts.main, s.yellows, s.bonus], [8, 4, 1, 1], 'Bonus pool +2: 2 + 2 regroups to 1d +1');
  r = handStep(r, 'yellows', 1);
  assert.equal(shown(g, r).yellows, 2, 'the hand on top');
  const none = shown(g, dock(null, SAM));
  assert.deepEqual([none.label, none.total, none.yellows, none.bonus], ['', null, 1, 0], 'no action: the hand is the dice');
});

test('who rolls for whom', () => {
  // R68, R71: its owner, or the GM for anyone; nobody for an open character.
  const g = scene(), sam = g.get(ridOf(SAM)) as Character, dev = g.get(ridOf(DEVREUX)) as Character;
  const dana = { name: 'Dana', gm: false }, ann = { name: 'Ann', gm: false }, gm = { name: 'GM', gm: true };
  assert.deepEqual([dana, ann, gm].map(v => rollsFor(v, sam)), [true, false, true]);
  assert.deepEqual([dana, gm].map(v => rollsFor(v, dev)), [false, true]);
  assert.equal(rollsFor(gm, { ...sam, owner: 'open' }), false);
});

test('aiming at an opponent', () => {
  // R83–R85, R88: their Defend plus their pools against your total; the Difference picks the row
  // until one is picked by hand, which holds until you aim again; whether Sam's owner sees them.
  const g = scene(), dev = g.get(ridOf(DEVREUX)) as Character;
  assert.deepEqual(defendOf(dev), { mental: 6, psych: 5 });
  let r = aimed(withAction(dock(null, SAM), 'Infer'), DEVREUX, 'mental');
  let s = shown(g, r);
  assert.deepEqual([s.vs!.name, s.vs!.total, s.vs!.diff, s.vs!.sees, s.row.key], ['Devreux', 6, -2, false, 'white'], 'Dana cannot see Devreux');
  g.change(w => w.put(ridOf('0000000a'), { kind: 'chip', oid: '0000000a', where: { slot: SAM, name: 'main' }, n: 0, sign: 1, points: 6, rider: false }));
  assert.deepEqual([shown(g, r).vs!.diff, shown(g, r).row.key], [4, '+1'], 'live as pools change');
  g.change(w => w.put(ridOf('0000000d'), { kind: 'chip', oid: '0000000d', where: { slot: DEVREUX, name: 'stagger' }, n: 0, sign: -1, points: 4, rider: false }));
  assert.equal(shown(g, r).vs!.total, 2, 'Stagger counts for the opposition');
  r = picked(r, 'red');
  assert.equal(shown(g, r).row.key, 'red', 'a picked row holds');
  r = aimed(r, DEVREUX, 'psych');
  assert.deepEqual([shown(g, r).vs!.total, shown(g, r).row.key], [1, 'green+1'], 'aiming again: the Difference again (psych 5 − 4)');
  r = unaimed(picked(r, 'green'));
  assert.deepEqual([r.opponent, shown(g, r).row.key, shown(g, r).vs], [null, 'green', undefined], 'stopping keeps a picked row');
  assert.equal(shown(g, unaimed(aimed(r, DEVREUX, 'mental'))).row.key, 'white', 'and drops a Difference row');
  const sam = g.get(ridOf(SAM)) as Character;
  assert.equal(shown(g, aimed(withAction(dock(null, DEVREUX), 'Attack'), SAM, 'mental')).vs!.sees, true, "the GM's Devreux sees Sam");
  assert.equal(sam.owner, 'Dana');
});

test('a Roll asks by names', () => {
  // R100: the row goes along only when picked by hand, or set with nobody aimed at.
  const a = withAction(dock(null, SAM), 'Infer');
  assert.deepEqual(intentOf(a), { pool: SAM, action: 'Infer', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 } });
  assert.equal(intentOf(picked(a, 'green')).row, 'green');
  const auto = { ...aimed(a, DEVREUX, 'psych'), row: 'red' };
  assert.equal('row' in intentOf(auto), false, "a Difference row is the GM's page's to pick");
  assert.equal(intentOf(picked(aimed(a, DEVREUX, 'psych'), 'red')).row, 'red');
});
