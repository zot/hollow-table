// CRC: crc-Visibility.md | Test: test-Visibility.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Influence, PieceRecord, Rec } from '../model/records.ts';
import { canSee, redact, differs, type Viewer } from './visibility.ts';
import { bury, burialOf, empty } from './yards.ts';
import { DEVREUX, SAM, scene } from '../store/playtest.ts';

// Devreux's Saloon Gossip, tapped into a card loose on the table: its ledger names the Resource.
const gossip: Influence = { kind: 'influence', oid: '0000000d', home: DEVREUX, where: { table: { x: 0, y: 0, z: 0, tilt: 0 } },
  n: 0, name: 'Rumour', sign: 1, points: 2, used: false, crit: false, tap: { ledger: { [`${DEVREUX}:Saloon Gossip`]: 1 }, current: `${DEVREUX}:Saloon Gossip` } };
// Devreux holds a Sig Bias, so its back has a secret too.
const records = [...scene('Dana', 'Ann').map(r => r.kind === 'character' && r.oid === DEVREUX
  ? { ...r, back: { ...r.back, absorb: { ...r.back.absorb, bias: 2 }, damage: { ...r.back.damage, bias: { ...r.back.damage.bias, sig: { name: 'Mistrusts the law', boxes: [], spent: [1] } } } } }
  : r), gossip];
const chars = new Map(records.filter((r): r is Character => r.kind === 'character').map(c => [c.oid, c]));
const look = (oid: string) => chars.get(oid);
const VIEWERS: Viewer[] = [null, { name: 'Dana', gm: false }, { name: 'GM', gm: true }];

const words = (s: string) => s.split(/[^\p{L}]+/u).filter(w => w.length >= 4);

/** Every string a record carries, keys included, except the public ones: kinds, owners and characters' names. */
function strings(r: unknown, key = ''): string[] {
  if (typeof r === 'string') return ['kind', 'oid', 'home', 'owner', 'blob', 'charname'].includes(key) ? [] : [r];
  if (Array.isArray(r)) return r.flatMap(x => strings(x));
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>;
    return Object.entries(o).flatMap(([k, v]) => [k, ...strings(v, o.kind === 'character' && k === 'name' ? 'charname' : k)]);
  }
  return [];
}

/** The secret words of a piece: its sheet for a character, its name for an Influence card. */
function secrets(r: PieceRecord): string[] {
  if (r.kind === 'character') {
    const pub = new Set(words(r.name));
    const slots = Object.values(r.back.damage).flatMap(c => Object.values(c).map(s => s.name));
    return words([r.front, r.back.notes, ...slots].join('\n')).filter(w => !pub.has(w));
  }
  return r.kind === 'influence' ? words([r.name, ...Object.keys(r.tap?.ledger ?? {})].join(' ')) : [];
}
const owner = (r: PieceRecord) => r.kind === 'character' ? r : r.kind === 'influence' ? look(r.home) : undefined;

test('no secret survives redaction', () => {
  const yards = bury(empty(), 0, burialOf(chars.get(DEVREUX)!, records), 'Devreux');
  for (const v of VIEWERS) {
    for (const r of records) {
      const o = owner(r);
      const seen = strings(redact(r, v, look)).join(' ');
      if (o && !canSee(v, o)) for (const w of secrets(r)) assert.ok(!seen.includes(w), `${v?.name} sees "${w}" of ${r.oid}`);
      // A hidden back says nothing about its Damage: no names, nothing spent, no box checked.
      if (r.kind === 'character' && !canSee(v, r)) {
        const shown = redact(r, v, look) as Character;
        const slots = Object.values(shown.back.damage).flatMap(c => Object.values(c));
        assert.ok(slots.every(s => !s.name && !s.spent.length && !s.boxes.some(b => b)), `${v?.name} sees ${r.oid}'s Damage`);
        assert.ok(Object.values(shown.back.absorb).every(n => n === 0), `${v?.name} sees ${r.oid}'s absorb`);
      }
      if (v?.gm) assert.deepEqual(redact(r, v, look), r);
    }
    // A burial is redacted record by record.
    const buried = strings(redact(yards, v, () => undefined)).join(' ');
    if (!v?.gm) for (const r of yards.yards[0]!.items[0]!.records) for (const w of secrets(r)) assert.ok(!buried.includes(w), w);
  }
  assert.ok(secrets(chars.get(DEVREUX)!).length > 10);
  assert.equal(differs(chars.get(SAM)!, VIEWERS[1]!, look), true);
  assert.equal(differs(chars.get(SAM)!, null, look), false);
});

test('what stays public', () => {
  const keep = records.find((r): r is Influence => r.kind === 'influence' && r.name === 'Keep the Peace')!;
  const inStagger: Influence = { ...keep, where: { slot: SAM, name: 'stagger' } };
  const dana = VIEWERS[1]!;
  const seen = redact(inStagger, dana, look) as Influence;
  assert.deepEqual([seen.points, seen.name], [4, '']);
  const dev = redact(chars.get(DEVREUX)!, dana, look) as Character;
  assert.deepEqual([dev.name, dev.pool, dev.card], ['Devreux', chars.get(DEVREUX)!.pool, chars.get(DEVREUX)!.card]);
  assert.equal(dev.front.split('\n').length, chars.get(DEVREUX)!.front.split('\n').length);   // its shape
  assert.equal((redact(keep, dana, look) as Influence).points, 0);                            // face-down in the drawer
  const rec: Rec = { round: 2, rolls: 5 };
  assert.equal(redact(rec, dana, look), rec);
});
