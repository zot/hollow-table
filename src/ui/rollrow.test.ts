// CRC: crc-RollRow.md | Test: test-RollRow.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { WORLD, ridOf, type Character, type Influence } from '../model/records.ts';
import { row as rowFor } from '../rules/odds.ts';
import { BEAUFORD, DEVREUX, SAM, playtest } from '../store/playtest.ts';
import { aimed, cleared, defendOf, dock, fresh, handStep, intentOf, picked, rollsFor, shown, unaimed, withAction, typeOf, typed, defendBase, waits, onceCard } from './rollrow.ts';

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
  assert.deepEqual(intentOf(a), { pool: SAM, action: 'Infer', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 }, type: 'infer' });
  assert.equal(intentOf(picked(a, 'green')).row, 'green');
  const auto = { ...aimed(a, DEVREUX, 'psych'), row: 'red' };
  assert.equal('row' in intentOf(auto), false, "a Difference row is the GM's page's to pick");
  assert.equal(intentOf(picked(aimed(a, DEVREUX, 'psych'), 'red')).row, 'red');
});

test('the roll type', () => {
  // R320: the label's words preselect it; a label that doesn't say starts at what was chosen last, else `?`.
  assert.deepEqual(['Mental Atk', 'Psych Atk', 'Phys Attack', 'Physical Atk', 'Req', 'Request', 'Infer', 'Impress', 'Create Influence', 'Shoot', 'Attack']
    .map(typeOf), ['mental', 'psych', 'phys', 'phys', 'request', 'request', 'infer', 'impress', 'influence', null, null]);
  const base = dock(null, SAM);
  assert.equal(withAction(base, 'Shoot').type, '?');
  assert.equal(withAction(base, 'Shoot', undefined, 'phys').type, 'phys', 'remembered');
  assert.equal(withAction(base, 'Infer', undefined, 'skill').type, 'infer', "the label's word comes first");
  // R316: the alternative clicked names the roll and picks its type; it goes in the intent.
  const req = withAction(base, 'Mental Atk / Req', 'Req');
  assert.deepEqual([req.type, intentOf(req).alt, intentOf(req).action], ['request', 'Req', 'Mental Atk / Req']);
  assert.equal(withAction(base, 'Mental Atk / Req').type, 'mental', 'with no alternative, the first');
  // R306: turning a roll to `?` stops aiming; an Attack goes at its own Defend, a Phys Attack at none.
  const atk = aimed(withAction(base, 'Mental Atk / Req', 'Mental Atk'), DEVREUX, 'mental');
  assert.equal(typed(atk, '?').opponent, null);
  const def = { mental: 6, psych: 5 };
  assert.deepEqual([defendBase(atk, def), defendBase(typed(atk, 'psych'), def), defendBase(typed(atk, 'phys'), def),
    defendBase({ ...typed(atk, 'infer'), defend: 'psych' }, def)], [6, 5, 0, 5]);
});

test('aimed at what was pointed at', () => {
  // R326, R328: a pointed aim holds its name; the next aim without one drops it; shown() takes the base from it.
  const g = scene();
  const r = aimed(withAction(dock(null, BEAUFORD), 'Infer'), SAM, 'mental', { act: 'Shoot' });
  assert.deepEqual(intentOf(r).against, { act: 'Shoot' });
  assert.equal(shown(g, r).vs!.words, 'Shoot 4');
  const again = aimed(r, SAM, 'psych');
  assert.equal(again.against, undefined);
  assert.equal(shown(g, again).vs!.words, undefined);
  // R336, R337: a Skill pointed at adds the target's attribute the action uses: Cha, none, Int.
  const b = g.get(ridOf(BEAUFORD)) as Character;
  g.change(w => w.put(ridOf(BEAUFORD), { ...b, front: `${b.front}\n<act>Shoot: 3, +1 (no att)</act>\n<act>Recall: 3, +1 (Int)</act>` }));
  const at = (action: string) => shown(g, aimed(withAction(dock(null, BEAUFORD), action), SAM, 'mental', { skl: 'Investigation' })).vs!.words;
  assert.deepEqual(['Infer', 'Shoot', 'Recall'].map(at), ['Investigation 2 + Cha 2', 'Investigation 2', 'Investigation 2 + Int 2']);
});

test('the world as opposition', () => {
  // R345, R346: a roll with an action waits until it is aimed; a `?` one can't be; plain dice don't wait.
  const r = dock(null, SAM), infer = withAction(r, 'Infer'), atWorld = aimed(infer, WORLD, 'mental');
  assert.equal(waits(r), null, 'plain dice roll as set');
  assert.match(waits(infer)!, /^Aim it first/);
  assert.equal(waits(atWorld), null);
  assert.match(waits(typed(infer, '?'))!, /^Say what this roll is/);
  assert.equal(typed(atWorld, '?').opponent, null, 'turning to ? stops aiming at the world too');
  assert.equal(intentOf(atWorld).vs, WORLD);
  // R350: the tray's number and nothing else; only the GM's own character sees it.
  const game = scene();
  game.change(w => w.put('world', { set: true, total: 3 }));
  const s = shown(game, atWorld);
  assert.deepEqual(s.vs && [s.vs.oid, s.vs.name, s.vs.total, s.vs.diff, s.vs.sees], [WORLD, 'the world', 3, s.total! - 3, false]);
  const dev = shown(game, aimed(typed(withAction(dock(null, DEVREUX), 'Attack'), 'phys'), WORLD, 'mental'));
  assert.equal(dev.vs?.sees, true, "Devreux is the GM's");
  // Live until the roll: the GM changing the number moves the row.
  game.change(w => w.put('world', { set: true, total: s.total! + 6 }));
  assert.equal(shown(game, atWorld).row.key, rowFor(-6).key);
  assert.equal(shown(game, picked(atWorld, 'green')).row.key, 'green', 'unless picked by hand');
});

test('a variant suffers its Influence as a card in Main', () => {
  // R352: Beauford's Tricky -Min, typed by Mental Atk, puts one Tricky -Min card (2 points) in his Main.
  const game = scene(), ids = ['000000f1', '000000f2'], mint = () => ids.shift()!;
  const plain = withAction(dock(null, BEAUFORD), 'Mental Atk / Req', 'Mental Atk'), tricky = withAction(plain, 'Tricky -Min', 'Mental Atk');
  assert.equal(onceCard(game, null, plain, mint), null, 'a plain action suffers nothing');
  const before = shown(game, plain).total!;
  game.change(onceCard(game, plain, tricky, mint)!);
  const card = game.get(ridOf('000000f1')) as Influence;
  assert.deepEqual([card.name, card.sign, card.points, card.where, card.once, card.home], ['Tricky', -1, 2, { slot: BEAUFORD, name: 'main' }, true, BEAUFORD]);
  assert.equal(onceCard(game, tricky, tricky, mint), null, 'choosing it again keeps the one card');
  // R355: the row names the variant and is typed by the alternative; its total suffers the 2.
  const s = shown(game, tricky);
  assert.deepEqual([s.label, tricky.type, s.total], ['Tricky -Min', 'mental', before - 2]);
  // R353: leaving it, by another action or a cleared Base, takes the card away.
  game.change(onceCard(game, tricky, cleared(tricky), mint)!);
  assert.equal(game.get(ridOf('000000f1')), undefined);
});
