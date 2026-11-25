// CRC: crc-Visibility.md | Test: test-Visibility.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, Chip, Influence, Opinion, PieceRecord, Rec, Sticky, Yards } from '../model/records.ts';
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

test('an NPC card reveals only its shown entries', () => {
  // R394: Devreux's Savvy and Streetwise share their line's label; Keep the Peace; Dead Man's Die under
  // its ITEMS heading, its parenthetical kept back. Every other line blank, the first too.
  const dev = look(DEVREUX)!, shown = ['Skills 3: Savvy', 'Skills 3: Streetwise', 'Keep the Peace +Sig (0)', "Dead Man's Die"];
  const revealed: Character = { ...dev, shown };
  const dana = redact(revealed, { name: 'Dana', gm: false }, look) as Character;
  const lines = dana.front.split('\n');
  assert.equal(lines.length, dev.front.split('\n').length, 'the shape is kept');
  assert.deepEqual(lines.filter(l => l), [
    '<skl>Skills 3: Savvy, Streetwise</skl>', '<mot>Keep the Peace +Sig (0)</mot>', '<head>Items</head>', "Dead Man's Die",
  ], 'only the revealed entries have words');
  assert.equal(lines[0], '', 'the first line holds more than the public name');
  for (const w of ['Proprietor', 'Profession', 'Preservation', 'Gossip', 'Free Token']) assert.ok(!JSON.stringify(dana).includes(w), w);
  assert.deepEqual(dana.shown, shown, 'shown holds only revealed words');
  assert.deepEqual(redact(dana, { name: 'Dana', gm: false }, look), dana, 'redacting again changes nothing');
  assert.deepEqual(redact(revealed, { name: 'GM', gm: true }, look), revealed, 'the GM sees it all');
});

test("an NPC's Info cards reveal only their shown clues", () => {
  // R399: every card keeps its place; only revealed clues keep their words.
  const dev = look(DEVREUX)!, orders = "MOTIVATION: it doesn't like its orders";
  const info = [`ANY: she watches the door\n${orders}\nWHAT IT KNOWS ABOUT TRUDY: she sat up with her`, 'SKILLS: Tracking'];
  const revealed: Character = { ...dev, info, shown: [orders] };
  const dana = redact(revealed, { name: 'Dana', gm: false }, look) as Character;
  assert.deepEqual(dana.info, [`\n${orders}\n`, ''], 'only the revealed clue has words');
  for (const w of ['watches', 'Trudy', 'Tracking']) assert.ok(!JSON.stringify(dana).includes(w), w);
  assert.deepEqual(redact(dana, { name: 'Dana', gm: false }, look), dana, 'redacting again changes nothing');
  assert.equal('info' in (redact(dev, { name: 'Dana', gm: false }, look) as Character), false, 'no Info cards, no field');
});

test('a record reaches a player once revealed, and only what is revealed', () => {
  // R435: nothing shown, nothing sent; a line shown, only it, every other line blank; the GM's whole.
  const rec: Opinion = { kind: 'opinion', oid: '0000000f', holder: 'c0000005', of: SAM, text: 'Reputation +Sig\nGrudge -Min' };
  const dana: Viewer = { name: 'Dana', gm: false }, gm: Viewer = { name: 'GM', gm: true };
  assert.equal(redact(rec, dana, look), undefined);
  const out = { ...rec, shown: ['Grudge -Min'], on: [DEVREUX], name: 'Sam' };
  assert.deepEqual(redact(out, dana, look), { ...out, text: '\nGrudge -Min' });
  assert.deepEqual(redact(out, gm, look), out);
});

test("a flag is seen by all, but not where its Levels came from", () => {
  // R464: a flag on a card a viewer can't read reaches them as its why alone.
  const card: Influence = { kind: 'influence', oid: '0000f1a9', home: DEVREUX, where: 'drawer', n: 0, name: 'Keep the Peace', sign: 1, points: 4,
    used: false, crit: false, tap: { ledger: { [`${DEVREUX}:Self-Preservation`]: 1 }, current: `${DEVREUX}:Self-Preservation` },
    flag: { why: 'A Resource and a Motivation on one card', fed: { [`${DEVREUX}:Self-Preservation`]: 1 } } };
  assert.deepEqual((redact(card, { name: 'Dana', gm: false }, look) as Influence).flag, { why: 'A Resource and a Motivation on one card' });
  assert.deepEqual((redact(card, { name: 'GM', gm: true }, look) as Influence).flag, card.flag);
});

const PLACE = { x: 0, y: 0, z: 0, tilt: 0 };
const toGm: Sticky = { kind: 'sticky', oid: '0000e001', place: PLACE, text: 'Is the mayor lying?', by: 'Sam', to: [] };
const handout: Sticky = { kind: 'sticky', oid: '0000e002', place: PLACE, text: 'A letter, sealed', by: 'GM', to: ['Sam', 'Dana'] };
const who = (n: string | null): Viewer => n === 'GM' ? { name: 'GM', gm: true } : n ? { name: n, gm: false } : null;

test('private paper reaches only who reads it', () => {
  // R501: whole for the GM, its maker and its readers; nothing at all for anyone else.
  const open: Sticky = { kind: 'sticky', oid: '0000e003', place: PLACE, text: 'Shopping', by: 'Sam' };
  const names = ['GM', 'Sam', 'Dana', 'Ann', null];
  const sees = (r: Sticky) => names.map(n => redact(r, who(n), look));
  assert.deepEqual(sees(toGm), [toGm, toGm, undefined, undefined, undefined], "Sam's note to the GM");
  assert.deepEqual(sees(handout), [handout, handout, handout, undefined, undefined], 'the handout to Sam and Dana');
  assert.deepEqual(sees(open), [open, open, open, open, open], 'everyone reads paper with no readers named');
  // R581: a note handed over reaches its new owner's page alone, a player's; the GM's, no player's.
  const handed: Sticky = { ...open, by: 'Dana', handed: true }, gms: Sticky = { ...open, by: 'GM', handed: true };
  assert.deepEqual(sees(handed), [undefined, undefined, handed, undefined, undefined], 'to Dana');
  assert.deepEqual(sees(gms).slice(1), [undefined, undefined, undefined, undefined], 'to the GM');
});

test('a buried private note is left out of Boot Hill', () => {
  // R508: a burial of only unreadable paper isn't listed; in a mixed burial only the paper goes.
  const sam = look(SAM)!, pinned: Sticky = { ...toGm, oid: '0000e004', pin: { card: SAM, dx: 0, dy: 0 } };
  const y: Yards = { yards: [{ name: 'Graveyard 1', named: false, items: [
    { name: 'Note: Is the mayor lying?', records: [toGm] }, { name: 'Sam Diamond', records: [sam, pinned] }] }] };
  assert.deepEqual(redact(y, who('GM'), look), y, 'the GM sees both whole');
  const dana = redact(y, who('Dana'), look) as Yards;
  assert.deepEqual(dana.yards[0]!.items.map(b => [b.name, b.records.map(r => r.oid)]), [['Sam Diamond', [SAM]]], 'Dana sees Sam alone');
});
