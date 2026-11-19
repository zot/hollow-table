// CRC: crc-Records.md | Test: test-Records.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPS, check, ridOf, type Character, type Influence, type TornRoll } from './records.ts';
import { scene } from '../store/playtest.ts';

test('check takes the scene and refuses the malformed', () => {
  const records = scene();
  for (const r of records) assert.ok(check(ridOf(r.oid), r), r.oid);
  assert.ok(check('meta', { round: 0, rolls: 0 }));
  assert.ok(check('yards', { yards: [{ name: 'Graveyard 1', named: false, items: [{ name: 'Sam', records }] }] }));
  // R403, R406: a buried Info card, and as a player gets it; a card's place is a small number.
  const info = { oid: '00000003', k: 0, text: 'ANY: she watches the door' };
  assert.ok(check('yards', { yards: [{ name: '', named: false, items: [{ name: 'Devreux: Info card', records: [], info, gm: '0000aaaa' }] }] }));
  assert.ok(check('yards', { yards: [{ name: '', named: false, items: [{ name: 'GM card', records: [], gm: '0000aaaa' }] }] }));
  assert.ok(!check('yards', { yards: [{ name: '', named: false, items: [{ name: 'x', records: [], info: { ...info, k: -1 } }] }] }));

  const sam = records[0] as Character, rid = ridOf(sam.oid);
  const roll: TornRoll = { kind: 'tornroll', oid: '0000000c', place: sam.pool, receipts: [{ id: 'r1', at: 1, title: 'Sam #1',
    dice: [{ c: 'W', v: 4, added: false, dropped: false }], resolution: '4', level: 'Minor', outcome: 'Success' }] };
  assert.ok(check(ridOf(roll.oid), roll));
  const inf = records.find((r): r is Influence => r.kind === 'influence')!;
  assert.ok(check(ridOf(inf.oid), { ...inf, damage: 'injury' }));
  assert.ok(inf.mot && check(ridOf(inf.oid), inf), 'R463: a Motivation card');
  // R341, R340: a Conviction and a Burden, one waiting for its name; a receipt waiting on one.
  const lasting = { bias: { name: 'Cheats win', points: 7, spent: 1 }, affliction: { name: '', points: 2, spent: 0, naming: { by: 'Beauford', id: 'r1' } } };
  assert.ok(check(rid, { ...sam, back: { ...sam.back, lasting } }));
  const attack = { target: sam.oid, name: 'Sam', from: 'Beauford', kind: 'mental', result: 5, taken: true, waiting: [{ damage: 'bias', row: 'lasting' }] };
  assert.ok(check(ridOf(roll.oid), { ...roll, receipts: [{ ...roll.receipts[0]!, attack }] }));
  const sticky = records.find(r => r.kind === 'sticky')!;
  assert.ok(check(ridOf(sticky.oid), { ...sticky, big: false }));   // R248
  const { flipped: _gone, ...missing } = sam;
  const faults: [string, unknown][] = [
    [rid, { ...sam, script: '<img onerror>' }],
    [rid, missing],
    [rid, { ...sam, flipped: 'yes' }],
    [ridOf('0000000f'), sam],
    [rid, { ...sam, name: 'x'.repeat(CAPS.name + 1) }],
    [rid, { ...sam, back: { ...sam.back, damage: { ...sam.back.damage, bias: { ...sam.back.damage.bias, sig: { name: '', boxes: [], spent: [-1] } } } } }],
    [rid, { ...sam, back: { ...sam.back, damage: { ...sam.back.damage, stagger: sam.back.damage.bias } } }],
    [rid, { ...sam, back: { ...sam.back, absorb: { ...sam.back.absorb, bias: -1 } } }],
    [rid, { ...sam, back: { ...sam.back, lasting: { injury: { name: 'x', points: 2, spent: 0 } } } }],
    [rid, { ...sam, back: { ...sam.back, lasting: { bias: { name: 'x', points: -1, spent: 0 } } } }],
    [ridOf(inf.oid), { ...inf, damage: 'main' }],
    [ridOf(roll.oid), { ...roll, receipts: [{ ...roll.receipts[0]!, dice: [{ c: 'W', v: 7, added: false, dropped: false }] }] }],
    [rid, { ...sam, kind: 'trap' }],
    [ridOf(sticky.oid), { ...sticky, big: 'yes' }],
    [ridOf(inf.oid), { ...inf, mot: false }],
    ['tape2', { receipts: [] }],
    [rid, [sam]],
    [rid, Object.assign(new (class Character {})(), sam)],
  ];
  faults.forEach(([k, v], i) => assert.equal(check(k, v), false, `fault ${i}`));
});

test("the world's record", () => {
  // R347: a set flag and a whole number; anything else is refused whole.
  assert.ok(check('world', { set: true, total: 4 }));
  assert.ok(check('world', { set: false, total: 0 }));
  for (const bad of [{ set: 'yes', total: 4 }, { set: true, total: 1.5 }, { set: true }, { total: 4 }, { set: true, total: 4, secret: 1 }])
    assert.ok(!check('world', bad), JSON.stringify(bad));
});

test('a card an action suffers', () => {
  // R362: `once` is the one value it may have.
  const card = { kind: 'influence', oid: '000000f1', home: '00000002', where: { slot: '00000002', name: 'main' }, n: 0, name: 'Tricky',
    sign: -1, points: 2, used: false, crit: false };
  assert.ok(check(ridOf('000000f1'), { ...card, once: true }));
  assert.ok(!check(ridOf('000000f1'), { ...card, once: false }));
});

test("a card's revealed entries and Info cards", () => {
  // R391: `shown` is a list of revealed entries, each its label and text, absent when none.
  const dev = scene().find((r): r is Character => r.kind === 'character' && r.name === 'Devreux')!;
  const rid = ridOf(dev.oid);
  assert.ok(check(rid, { ...dev, shown: ['Keep the Peace +Sig (0)', 'Skills 3: Savvy'] }));
  assert.ok(!check(rid, { ...dev, shown: [7] }), 'a line is its text, not its number');
  assert.ok(!check(rid, { ...dev, shown: 'Keep the Peace' }));
  // R400: Info cards are texts.
  assert.ok(check(rid, { ...dev, info: ['ANY: she watches the door', ''] }));
  assert.ok(!check(rid, { ...dev, info: [['ANY']] }));
});
