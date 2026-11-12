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
  // R117, R99: Round 0, Damage recharged, used piles emptied (plain cards home, taps gone), used
  // marks cleared, CRIT! cards gone wherever they are.
  const g = new Game();
  g.load(playtest('Dana', 'Ann'));
  const card = (oid: string, extra: Partial<Influence>): Influence => ({ kind: 'influence', oid, home: SAM, where: 'drawer', n: 0, name: oid,
    sign: 1, points: 2, used: false, crit: false, ...extra });
  g.change(w => {
    w.put('meta', { ...(g.get('meta') as Meta), round: 4 });
    const sam = g.get(ridOf(SAM)) as Character;
    w.put(ridOf(SAM), { ...sam, back: { ...sam.back, damage: { ...sam.back.damage, bias: { ...sam.back.damage.bias, sig: { name: 'Uncertain', boxes: [], spent: [2] } } } } });
    w.put(ridOf('000000a1'), card('000000a1', { where: 'used', used: true }));
    w.put(ridOf('000000a2'), card('000000a2', { where: 'used', used: true, tap: { ledger: { x: 1 }, current: 'x' } }));
    w.put(ridOf('000000a3'), card('000000a3', { where: { slot: SAM, name: 'main' }, used: true }));
    w.put(ridOf('000000a4'), card('000000a4', { where: { slot: SAM, name: 'main' }, crit: true }));
  });
  g.change(ended(g));
  const at = (oid: string) => g.get(ridOf(oid)) as Influence | undefined;
  assert.equal((g.get('meta') as Meta).round, 0);
  assert.deepEqual((g.get(ridOf(SAM)) as Character).back.damage.bias.sig.spent, []);
  assert.deepEqual([at('000000a1')!.where, at('000000a1')!.used], ['drawer', false], 'a plain card goes home');
  assert.equal(at('000000a2'), undefined, 'a tap in the used pile is spent and gone');
  assert.deepEqual([at('000000a3')!.where, at('000000a3')!.used], [{ slot: SAM, name: 'main' }, false], 'used marks cleared');
  assert.equal(at('000000a4'), undefined, 'CRIT! cleared');
});
