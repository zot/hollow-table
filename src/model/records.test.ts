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

  const sam = records[0] as Character, rid = ridOf(sam.oid);
  const roll: TornRoll = { kind: 'tornroll', oid: '0000000c', place: sam.pool, receipts: [{ id: 'r1', at: 1, title: 'Sam #1',
    dice: [{ c: 'W', v: 4, added: false, dropped: false }], resolution: '4', level: 'Minor', outcome: 'Success' }] };
  assert.ok(check(ridOf(roll.oid), roll));
  const inf = records.find((r): r is Influence => r.kind === 'influence')!;
  assert.ok(check(ridOf(inf.oid), { ...inf, damage: 'injury' }));
  assert.ok(inf.mot && check(ridOf(inf.oid), inf), 'R260: a Motivation card');
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
