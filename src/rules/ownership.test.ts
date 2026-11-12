// CRC: crc-Ownership.md | Test: test-Ownership.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character } from '../model/records.ts';
import { click, mayChange, shiftClick, type Result } from './ownership.ts';
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
