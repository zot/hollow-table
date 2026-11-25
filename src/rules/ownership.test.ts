// CRC: crc-Ownership.md | Test: test-Ownership.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character, PieceRecord, Rid, Sticky } from '../model/records.ts';
import { click, handOver, handsOver, mayChange, mayWrite, shiftClick, takeHanded, type Result } from './ownership.ts';
import { canSee, type Viewer } from './visibility.ts';
import { BEAUFORD, DEVREUX, SAM, scene } from '../store/playtest.ts';

const P1: Viewer = { name: 'Player 1', gm: false }, P2: Viewer = { name: 'Player 2', gm: false };
const GM: Viewer = { name: 'GM', gm: true };

test('the die', () => {
  const chars = new Map(scene().filter((r): r is Character => r.kind === 'character').map(c => [c.oid, c]));
  const press = (oid: string, v: Viewer, shift = false): Result => {
    const c = chars.get(oid)!, r = shift ? shiftClick(v, c) : click(v, c);
    if ('owner' in r) chars.set(oid, { ...c, owner: r.owner });
    return r;
  };
  const owner = (oid: string) => chars.get(oid)!.owner;

  assert.ok('refused' in press(DEVREUX, P1));                                    // 1
  assert.equal(owner(DEVREUX), 'GM');
  assert.equal(canSee(P1, chars.get(DEVREUX)!), false);
  press(DEVREUX, GM, true);                                                       // 2
  assert.equal(owner(DEVREUX), 'open');
  assert.ok([P1, P2, null].every(v => canSee(v, chars.get(DEVREUX)!)));
  press(DEVREUX, P2);                                                             // 3
  assert.equal(owner(DEVREUX), 'Player 2');
  assert.deepEqual(press(DEVREUX, P2), { dock: true });                           // 4
  assert.ok('refused' in press(DEVREUX, P1));                                     // 5
  assert.equal(owner(DEVREUX), 'Player 2');
  press(DEVREUX, P2, true);                                                       // 6
  assert.equal(owner(DEVREUX), 'open');
  press(DEVREUX, GM);                                                             // 7
  assert.equal(owner(DEVREUX), 'GM');
  assert.deepEqual(press(SAM, P1), { dock: true });                               // 8
  assert.deepEqual(press(SAM, GM), { dock: true });
  assert.equal(owner(SAM), 'Player 1');
  press(SAM, GM, true);                                                           // 9
  press(SAM, GM);
  assert.equal(owner(SAM), 'GM');
  assert.ok('refused' in shiftClick(P1, chars.get(BEAUFORD)!));
});

test("the GM's check", () => {
  const [sam, beau] = scene('Dana', 'Ann') as Character[];
  const pregen: Character = { ...beau!, oid: '0000000a', owner: 'open', name: 'Pregen' };
  const dana: Viewer = { name: 'Dana', gm: false };
  const moved = (c: Character): Character => ({ ...c, pool: { ...c.pool, x: c.pool.x + 10 } });
  assert.deepEqual([
    mayChange(dana, sam, moved(sam!)),
    mayChange(dana, beau, moved(beau!)),
    mayChange(dana, pregen, moved(pregen)),
    mayChange(dana, sam, { ...sam!, owner: 'Ann' }),
  ], [true, false, true, false]);
  assert.equal(mayChange(GM, beau, { ...beau!, owner: 'Dana' }), true);
});

test('who writes a character', () => {
  // R567: the owner and the GM; an open one, the GM alone.
  const all = scene(), char = (oid: string) => all.find((r): r is Character => r.kind === 'character' && r.oid === oid)!;
  const sam = char(SAM), devreux = char(DEVREUX), open: Character = { ...sam, owner: 'open' };
  assert.deepEqual([sam, devreux, open].map(c => mayWrite(GM, c)), [true, true, true], 'the GM writes all');
  assert.deepEqual([sam, devreux, open].map(c => mayWrite(P1, c)), [sam.owner === P1.name, false, false], 'Player 1 writes their own alone');
  assert.deepEqual([sam, devreux, open].map(c => mayWrite(P2, c)), [false, false, false]);
  assert.equal(mayWrite(null, sam), false);
});


const AT = { x: 0, y: 0, z: 0, tilt: 0 };
const note = (more: Partial<Sticky>): Sticky => ({ kind: 'sticky', oid: '0000f001', place: AT, text: 'a note', ...more });

test('handing a note over', () => {
  // R579: the new owner leaves its readers; everyone's stays everyone's; the giver no longer reads it.
  assert.deepEqual(handOver(note({ by: 'Sam' }), 'Dana'), note({ by: 'Dana' }), 'everyone still reads it');
  assert.deepEqual(handOver(note({ by: 'Sam', to: ['Dana', 'Ann'] }), 'Dana'), note({ by: 'Dana', to: ['Ann'] }), 'Ann still does, Sam no longer');
  assert.deepEqual(handOver(note({ by: 'Sam', to: [] }), 'GM'), note({ by: 'GM', to: [] }), 'a note to the GM, given to the GM');
  assert.deepEqual(handOver(note({ by: 'GM', to: ['Sam'] }), 'Dana'), note({ by: 'Dana', to: ['Sam'] }), "the GM's handout to Sam, given to Dana");
  assert.deepEqual(handOver(note({ text: 'from before' }), 'Sam'), note({ text: 'from before', by: 'Sam' }), 'paper without a maker');
  // R581: a "just me" note becomes the new owner's, on its way as `handed`.
  assert.deepEqual(handOver(note({ by: 'Sam', mine: true }), 'Dana'), note({ by: 'Dana', handed: true }), "Sam's own, to Dana");
  assert.deepEqual(handOver(note({ by: 'GM', to: [] }), 'Sam'), note({ by: 'Sam', handed: true }), "the GM's own, to Sam");
});

test('a page takes what is handed to it', () => {
  // R581: a player's under `m:` as `mine`; the GM's as a note to no one; nobody else's.
  const all: [Rid, PieceRecord][] = [['o:0000f001', note({ by: 'Dana', handed: true })], ['o:0000f002', { ...note({ by: 'GM', handed: true }), oid: '0000f002' }],
    ['o:0000f003', { ...note({ by: 'Dana', to: [] }), oid: '0000f003' }]];
  assert.deepEqual(takeHanded(all, 'Dana'), [{ from: 'o:0000f001', rid: 'm:0000f001', rec: note({ by: 'Dana', mine: true }) }], 'Dana takes hers');
  assert.deepEqual(takeHanded(all, 'GM'), [{ from: 'o:0000f002', rid: 'o:0000f002', rec: { ...note({ by: 'GM', to: [] }), oid: '0000f002' } }], "the GM's page the GM's");
  assert.deepEqual(takeHanded(all, 'Sam'), [], 'Sam nothing');
});

test('what the GM\'s page takes as a hand-over', () => {
  // R582: by its owner, exactly as handOver writes it; with no copy, a handed note for someone else.
  const sams = note({ by: 'Sam', to: ['Dana'] });
  assert.ok(handsOver(sams, handOver(sams, 'Dana'), 'Sam'), 'Sam gives his');
  assert.ok(!handsOver(sams, handOver(sams, 'Dana'), 'Dana'), "Dana can't give Sam's");
  assert.ok(!handsOver(sams, { ...handOver(sams, 'Dana'), to: ['Sam'] }, 'Sam'), 'nor keep a way to read it');
  assert.ok(!handsOver(sams, sams, 'Sam'), 'no change of owner, no hand-over');
  assert.ok(handsOver(undefined, note({ by: 'Dana', handed: true }), 'Sam'), 'his "just me" note, handed to Dana');
  assert.ok(!handsOver(undefined, note({ by: 'Dana' }), 'Sam'), 'not paper made in her name');
  assert.ok(!handsOver(undefined, note({ by: 'Sam', handed: true }), 'Sam'), 'nor handed to himself');
});
