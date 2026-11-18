// CRC: crc-Visibility.md | Test: test-Visibility.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Chip, Influence, PieceRecord, Rec, Yards } from '../model/records.ts';
import { canSee, contribution, redact, differs, type Viewer } from './visibility.ts';
import { bury, burialOf, empty } from './yards.ts';
import { DEVREUX, SAM, scene } from '../store/playtest.ts';

// Devreux's Saloon Gossip, tapped into a card loose on the table: its ledger names the Resource.
const gossip: Influence = { kind: 'influence', oid: '0000000d', home: DEVREUX, where: { table: { x: 0, y: 0, z: 0, tilt: 0 } },
  n: 0, name: 'Rumour', sign: 1, points: 2, used: false, crit: false, tap: { ledger: { [`${DEVREUX}:Saloon Gossip`]: 1 }, current: `${DEVREUX}:Saloon Gossip` } };
// Devreux holds a Sig Bias and a Conviction (R341), so its back has secrets too.
const records = [...scene('Dana', 'Ann').map(r => r.kind === 'character' && r.oid === DEVREUX
  ? { ...r, back: { ...r.back, absorb: { ...r.back.absorb, bias: 2 }, damage: { ...r.back.damage, bias: { ...r.back.damage.bias, sig: { name: 'Mistrusts the law', boxes: [], spent: [1] } } }, lasting: { bias: { name: 'Sheriffs lie', points: 3, spent: 1 } } } }
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
    const lasting = Object.values(r.back.lasting ?? {}).map(l => l.name);
    return words([r.front, r.back.notes, ...slots, ...lasting].join('\n')).filter(w => !pub.has(w));
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
        assert.equal(shown.back.lasting, undefined, `${v?.name} sees ${r.oid}'s Conviction or Burden`);
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

test("the world's number is the GM's alone", () => {
  // R348: anyone but the GM learns only whether the tray is set.
  const world: Rec = { set: true, total: 4 };
  assert.deepEqual(redact(world, { name: 'Dana', gm: false }, () => undefined), { set: true, total: 0 });
  assert.deepEqual(redact(world, null, () => undefined), { set: true, total: 0 });
  assert.deepEqual(redact(world, { name: 'GM', gm: true }, () => undefined), world);
  assert.ok(differs(world, { name: 'GM', gm: true }, () => undefined), "sealed for the GM's tabs");
  assert.ok(!differs(world, { name: 'Dana', gm: false }, () => undefined));
});

test('two mats: the private one reaches only its owner and the GM', () => {
  // R358, R378: a chip in a pool is public only when someone other than its character's owner put it
  // there; a card, when its home character has another owner. Sam is Dana's, Devreux the GM's.
  const chip = (slot: string, by?: string): Chip => ({ kind: 'chip', oid: '000000c1', where: { slot, name: 'main' }, n: 0, sign: -1, points: 2,
    rider: false, ...(by && { by }) });
  const [nobody, dana, gm] = VIEWERS as [Viewer, Viewer, Viewer], ann: Viewer = { name: 'Ann', gm: false };
  const gmsOwn = chip(DEVREUX, 'GM'), danas = chip(DEVREUX, 'Dana'), old = chip(DEVREUX), onSam = chip(SAM, 'GM'), samsOwn = chip(SAM, 'Dana');
  assert.deepEqual([gmsOwn, danas, old, onSam, samsOwn].map(c => contribution(c, look)), [false, true, false, true, false]);
  for (const v of [nobody, dana, ann]) assert.equal(redact(gmsOwn, v, look), undefined, "the GM's own chip on Devreux: absent, not face-down");
  assert.equal(redact(old, dana, look), undefined, 'a chip from before has no `by`: private');
  assert.deepEqual(redact(gmsOwn, gm, look), gmsOwn, 'the GM sees the private mat');
  assert.deepEqual([redact(danas, ann, look), redact(onSam, ann, look)], [danas, onSam], 'contributions are public');
  assert.deepEqual([redact(samsOwn, ann, look), redact(samsOwn, dana, look)], [undefined, samsOwn], "Dana's own chip on Sam: hers and the GM's");
  // A card from Devreux in his own pool is private; one from Sam, in Devreux's, a contribution, face-down to Ann.
  const keep = records.find((r): r is Influence => r.kind === 'influence' && r.home === DEVREUX)!;
  assert.equal(redact({ ...keep, where: { slot: DEVREUX, name: 'main' } }, dana, look), undefined);
  const sams = records.find((r): r is Influence => r.kind === 'influence' && r.home === SAM);
  if (sams) {
    const shown = redact({ ...sams, where: { slot: DEVREUX, name: 'main' } }, ann, look) as Influence;
    assert.deepEqual([shown.name, shown.points], ['', sams.points]);
  }
  // A burial keeps out what its viewer may not see.
  const yard: Yards = { yards: [{ name: 'Hill', named: false, items: [{ name: 'x', records: [chars.get(DEVREUX)!, gmsOwn] }] }] };
  assert.deepEqual((redact(yard, dana, look) as Yards).yards[0]!.items[0]!.records.map(r => r.kind), ['character']);
});

test("a roll row is the table's, but not one behind the GM's screen", () => {
  // R381: everyone sees the rows; a privately switched one only the GM.
  const r = { pool: DEVREUX, action: 'Attack', opponent: SAM, defend: 'mental' as const, row: null, byHand: false, hand: { yellows: 0, bonus: 0 } };
  const rows: Rec = { rows: { [DEVREUX]: { ...r, priv: true }, [SAM]: { ...r, pool: SAM } } };
  assert.deepEqual(Object.keys((redact(rows, { name: 'Dana', gm: false }, look) as { rows: object }).rows), [SAM]);
  assert.deepEqual(redact(rows, { name: 'GM', gm: true }, look), rows);
});

test('Stagger is always seen', () => {
  // R377: the GM's own −2 in Devreux's Stagger reaches Dana; the same chip in his Main doesn't.
  const chip = (name: 'stagger' | 'main'): Chip => ({ kind: 'chip', oid: '000000c3', where: { slot: DEVREUX, name }, n: 0, sign: -1, points: 2, rider: false, by: 'GM' });
  const dana: Viewer = { name: 'Dana', gm: false };
  assert.deepEqual(redact(chip('stagger'), dana, look), chip('stagger'));
  assert.equal(redact(chip('main'), dana, look), undefined);
});

test('an NPC card reveals only its shown lines', () => {
  // R389: Devreux's Keep the Peace revealed; every other line blank, the first too.
  const dev = look(DEVREUX)!, peace = '<mot>Keep the Peace +Sig (0)</mot>';
  const shown: Character = { ...dev, shown: [peace] };
  const dana = redact(shown, { name: 'Dana', gm: false }, look) as Character;
  const lines = dana.front.split('\n');
  assert.equal(lines.length, dev.front.split('\n').length, 'the shape is kept');
  assert.deepEqual(lines.filter(l => l), [peace], 'only the revealed line has words');
  assert.equal(lines[0], '', 'the first line holds more than the public name');
  assert.deepEqual(dana.shown, [peace], 'shown holds only revealed words');
  assert.deepEqual(redact(dana, { name: 'Dana', gm: false }, look), dana, 'redacting again changes nothing');
  for (const w of ['Proprietor', 'Preservation', 'Gossip']) assert.ok(!JSON.stringify(dana).includes(w), w);
  assert.deepEqual(redact(shown, { name: 'GM', gm: true }, look), shown, 'the GM sees it all');
});
