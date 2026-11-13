// CRC: crc-Moves.md | Test: test-Stamps.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Moves, SEND_MS, type Command, type Move } from './moves.ts';
import { Stamps } from './stamps.ts';
import { memoryStorage, fakeClock } from '../store/fakes.ts';

const STICKY = 'o:00000008';

/** A receiving page: one piece's x, a manual scheduler, and what it sent. */
function page() {
  const stamps = new Stamps(memoryStorage());
  let x = 0, queued: (() => void)[] = [];
  const sent: Move[] = [];
  const { clock, advance } = fakeClock();
  const moves = new Moves({
    stamps, tab: 'me', send: m => sent.push(m), timers: clock,
    place: (cs: Command[]) => { for (const c of cs) if (c.rid === STICKY) x = c.x; },
    schedule: fn => { queued.push(fn); },
  });
  const run = () => { while (queued.length) { const q = queued; queued = []; q.forEach(f => f()); } };
  return { stamps, moves, sent, advance, run, x: () => x };
}
const move = (s: number, x: number): Move => ({ s, items: [{ rid: STICKY, x, y: 0, z: 0 }] });

test("the move actor's rules", () => {
  const p = page();
  p.stamps.peer('me'); p.stamps.peer('gm');                 // two pages met before A and B
  // 1: highest wins, whatever the arrival order.
  for (const s of [107, 103, 109, 101, 105]) p.moves.receive('A', move(s, 1000 + s % 10));
  p.run();
  assert.equal(p.x(), 1009);
  // 2: B arrived last, so B places it.
  p.moves.receive('A', move(120, 600));
  p.moves.receive('B', move(1, 700));
  p.run();
  assert.equal(p.x(), 700);
  // 3: lower than A's 120: discarded.
  p.moves.receive('A', move(115, 650));
  p.run();
  assert.equal(p.x(), 700);
  // 4
  p.moves.receive('A', move(121, 610));
  p.run();
  assert.equal(p.x(), 610);
  // 5: small local integers.
  assert.deepEqual([p.stamps.peer('A'), p.stamps.peer('B')], [3, 4]);

  // A piece in hand waits, then is checked again.
  p.moves.hold(STICKY);
  p.moves.receive('A', move(122, 620));
  p.run();
  assert.equal(p.x(), 610);
  p.moves.release(STICKY);
  p.run();
  assert.equal(p.x(), 620);

  // Sending: at most every SEND_MS while in hand; the drop goes at once with its own number.
  p.moves.drag([{ rid: STICKY, x: 1, y: 0, z: 0 }]);
  p.moves.drag([{ rid: STICKY, x: 2, y: 0, z: 0 }]);
  assert.equal(p.sent.length, 0);
  p.advance(SEND_MS);
  assert.deepEqual(p.sent.map(m => m.items[0]!.x), [2]);
  p.moves.drag([{ rid: STICKY, x: 3, y: 0, z: 0 }]);
  p.moves.drop([{ rid: STICKY, x: 4, y: 0, z: 0 }]);
  p.advance(SEND_MS);
  assert.deepEqual(p.sent.map(m => m.items[0]!.x), [2, 4]);
  assert.ok(p.sent[1]!.s > p.sent[0]!.s);
});

test('a held piece slides to the most recent move', () => {
  const p = page();
  p.stamps.peer('me');
  // Only the most recent move waits: B's, arriving in a later pass than A's.
  p.moves.hold(STICKY);
  p.moves.receive('A', move(123, 630));
  p.run();
  p.moves.receive('B', move(2, 720));
  p.run();
  assert.equal(p.x(), 0);
  p.moves.release(STICKY);
  p.run();
  assert.equal(p.x(), 720);
  // Within one pass, the same page's higher number, though it arrived first.
  p.moves.hold(STICKY);
  p.moves.receive('A', move(125, 650));
  p.moves.receive('A', move(124, 640));
  p.run();
  p.moves.release(STICKY);
  p.run();
  assert.equal(p.x(), 650);
});

test('a move carries its aim, and a drop says it let go', () => {
  // R299, R300: what the carrying page sends reaches the receiving page's hands as it was sent.
  const stamps = new Stamps(memoryStorage()), got: Command[] = [], sent: Move[] = [];
  const { clock, advance } = fakeClock();
  let queued: (() => void)[] = [];
  const moves = new Moves({ stamps, tab: 'me', send: m => sent.push(m), timers: clock, place: cs => got.push(...cs), schedule: fn => { queued.push(fn); } });
  const aim = { slot: { owner: '00000001', name: 'main' as const }, chip: true };
  moves.drag([{ rid: STICKY, x: 5, y: 6, z: 1, aim }]);
  advance(SEND_MS);
  moves.drop([{ rid: STICKY, x: 9, y: 6, z: 1, aim }]);
  assert.deepEqual(sent.map(m => [m.items[0]!.aim, m.drop]), [[aim, undefined], [undefined, true]]);
  for (const m of sent) moves.receive('A', m);
  while (queued.length) { const q = queued; queued = []; q.forEach(f => f()); }
  // Both arrived in one pass: the drop, the newest, places it, and says so.
  assert.deepEqual(got.map(c => [c.x, c.drop, c.aim]), [[9, true, undefined]]);
});
