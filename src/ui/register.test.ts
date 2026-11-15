// CRC: crc-Register.md | Test: test-Register.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Character, type Influence, type Meta } from '../model/records.ts';
import { SAM, playtest } from '../store/playtest.ts';
import { ROUND_MAX, ended, stepped } from './register.ts';

test('the Round runs from 0 to 99', () => {
  // R115, R284.
  const m: Meta = { round: 0, rolls: 0 };
  assert.equal(stepped(m, -1).round, 0);
  assert.equal(stepped({ ...m, round: 98 }, 1).round, 99);
  assert.equal(stepped({ ...m, round: ROUND_MAX }, 1).round, 99);
});

test('End ends the Conflict', () => {
  // R117, R99, R338, R344: Round 0, Damage recharged, Mild slots emptied, used piles emptied (plain cards home, taps gone), used
  // marks cleared, CRIT! cards gone wherever they are.
  const g = new Game();
  g.load(playtest('Dana', 'Ann'));
  const card = (oid: string, extra: Partial<Influence>): Influence => ({ kind: 'influence', oid, home: SAM, where: 'drawer', n: 0, name: oid,
    sign: 1, points: 2, used: false, crit: false, ...extra });
  g.change(w => {
    w.put('meta', { ...(g.get('meta') as Meta), round: 4 });
    const sam = g.get(ridOf(SAM)) as Character;
    w.put(ridOf(SAM), { ...sam, back: { ...sam.back, damage: { ...sam.back.damage, bias: { ...sam.back.damage.bias,
      sig: { name: 'Uncertain', boxes: [], spent: [2] }, mild: { name: 'Sore loser', boxes: [true], spent: [] } } } } });
    w.put(ridOf('000000a1'), card('000000a1', { where: 'used', used: true }));
    w.put(ridOf('000000a2'), card('000000a2', { where: 'used', used: true, tap: { ledger: { x: 1 }, current: 'x' } }));
    w.put(ridOf('000000a3'), card('000000a3', { where: { slot: SAM, name: 'main' }, used: true }));
    w.put(ridOf('000000a4'), card('000000a4', { where: { slot: SAM, name: 'main' }, crit: true }));
    // R344: a Mild tap never rolled, on the table; one fed by Mild and a Sig Bias, in a slot.
    const tapped = (ledger: Record<string, number>, current: string) => ({ tap: { ledger, current }, damage: 'bias' as const, sign: -1 as const });
    w.put(ridOf('000000a5'), card('000000a5', { where: { table: { x: 0, y: 0, z: 0, tilt: 0 } }, ...tapped({ [`${SAM}:bias/mild`]: 1 }, `${SAM}:bias/mild`) }));
    w.put(ridOf('000000a6'), card('000000a6', { where: { slot: SAM, name: 'bias' }, points: 6,
      ...tapped({ [`${SAM}:bias/sig`]: 2, [`${SAM}:bias/mild`]: 1 }, `${SAM}:bias/mild`) }));
  });
  g.change(ended(g));
  const at = (oid: string) => g.get(ridOf(oid)) as Influence | undefined;
  assert.equal((g.get('meta') as Meta).round, 0);
  assert.deepEqual((g.get(ridOf(SAM)) as Character).back.damage.bias.sig.spent, []);
  // R338: the Mild slot emptied, the Sig Bias kept.
  const bias = (g.get(ridOf(SAM)) as Character).back.damage.bias;
  assert.deepEqual([bias.mild.name, bias.mild.boxes, bias.sig.name], ['', [false], 'Uncertain']);
  assert.deepEqual([at('000000a1')!.where, at('000000a1')!.used], ['drawer', false], 'a plain card goes home');
  assert.equal(at('000000a2'), undefined, 'a tap in the used pile is spent and gone');
  assert.deepEqual([at('000000a3')!.where, at('000000a3')!.used], [{ slot: SAM, name: 'main' }, false], 'used marks cleared');
  assert.equal(at('000000a4'), undefined, 'CRIT! cleared');
  assert.equal(at('000000a5'), undefined, 'a Mild tap goes, rolled or not');
  const mixed = at('000000a6')!;
  assert.deepEqual([mixed.points, mixed.tap, mixed.where], [4, { ledger: { [`${SAM}:bias/sig`]: 2 }, current: `${SAM}:bias/sig` }, { slot: SAM, name: 'bias' }],
    'a mixed card keeps what the Sig Bias gave');
});
