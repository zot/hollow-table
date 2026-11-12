// CRC: crc-Copy.md | Test: test-Copy.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Book, type Character, type Rec, type Rid, type Sticky } from '../model/records.ts';
import { Authority } from './authority.ts';
import { Copy, TICK_MS } from './copy.ts';
import { FakeRoom } from './fakeroom.ts';
import { Sealer } from './seal.ts';
import { Stamps } from './stamps.ts';
import { fakeClock, memoryStorage } from '../store/fakes.ts';
import { SAM, playtest } from '../store/playtest.ts';

const STICKY = ridOf('00000008'), REF = ridOf('00000009');

/** The GM's page, and players' pages that can reload, over one room and one clock. */
async function table() {
  const room = new FakeRoom(), { clock, advance } = fakeClock();
  const gmSession = memoryStorage();
  let gmGame = new Game();
  gmGame.load(playtest('Dana', 'Ann'));
  const gm = { game: gmGame, authority: null as unknown as Authority, sealKey: '', stamps: null as unknown as Stamps };
  const players = new Map<string, { game: Game; copy: Copy; sealKey: string; stamps: Stamps }>();
  const storage = new Map<string, { session: ReturnType<typeof memoryStorage>; local: ReturnType<typeof memoryStorage> }>();

  /** The GM's page loads (or reloads, from what it saved): a new sealing key, the same tab. */
  async function gmLoad() {
    const game = new Game();
    game.load(gmGame.all());
    gmGame = game;
    const sealer = await Sealer.make();
    const link = room.link({ tab: 'gm', browser: 'b-gm', sealKey: sealer.pub });
    gm.game = game;
    gm.sealKey = sealer.pub;
    gm.stamps = new Stamps(gmSession);
    gm.authority = new Authority({ game, stamps: gm.stamps, sealer, link, schedule: queueMicrotask });
    for (const [tab, p] of players) gm.authority.join(tab, name(tab), `b-${tab}`, p.sealKey);   // Presence: `here`
    link.send('hello', {});
  }
  const name = (tab: string) => tab[0]!.toUpperCase() + tab.slice(1);

  /** A player's page loads (or reloads, from its stored copy and its tab's session). */
  async function playerLoad(tab: string, records: Iterable<[Rid, Rec]> = players.get(tab)?.game.all() ?? []) {
    players.get(tab)?.copy.stop();
    const st = storage.get(tab) ?? { session: memoryStorage(), local: memoryStorage() };
    storage.set(tab, st);
    const game = new Game();
    game.load(records);
    const sealer = await Sealer.make();
    const link = room.link({ tab, browser: `b-${tab}`, sealKey: sealer.pub });
    const stamps = new Stamps(st.session);
    const copy = new Copy({ game, stamps, sealer, link, clock, session: st.session, local: st.local, room: 'r1', gm: 'b-gm' });
    players.set(tab, { game, copy, sealKey: sealer.pub, stamps });
    gm.authority.join(tab, name(tab), `b-${tab}`, sealer.pub);
    copy.start();
    return copy;
  }
  room.watch(() => gm.authority.idle());
  room.watch(() => Promise.all([...players.values()].map(p => p.copy.idle())));
  await gmLoad();
  /** Time passes a second at a time, the room settling after each. */
  const seconds = async (n: number) => { for (let i = 0; i < n; i++) { advance(TICK_MS); await room.settle(); } };
  return { room, gm, players, gmLoad, playerLoad, seconds, advance };
}

const text = (game: Game) => (game.get(STICKY) as Sticky).text;
const write = (game: Game, t: string) => game.change(w => w.put(STICKY, { ...(game.get(STICKY) as Sticky), text: t }));
const nudge = (game: Game, rid: Rid, dx: number) => {
  const r = game.get(rid) as Character | Sticky;
  game.change(w => w.put(rid, 'card' in r ? { ...r, card: { ...r.card, x: r.card.x + dx } } : { ...r, place: { ...r.place, x: r.place.x + dx } }));
};

test('pending until answered', async () => {
  const t = await table();
  // 1
  const copy = await t.playerLoad('dana');
  await t.room.settle();
  const dana = () => t.players.get('dana')!;
  assert.equal(dana().copy.synced, true);
  assert.equal((dana().game.get(ridOf(SAM)) as Character).owner, 'Dana');
  assert.deepEqual(copy.pending(), []);

  // 2: the edit is lost on the way.
  t.room.drop = m => m.kind === 'edit';
  write(dana().game, 'Lost once');
  await t.room.settle();
  assert.notEqual(text(t.gm.game), 'Lost once');
  assert.deepEqual(dana().copy.pending(), [STICKY]);

  // 3: 3 s later it goes again.
  t.room.drop = () => false;
  await t.seconds(3);
  assert.equal(text(t.gm.game), 'Lost once');
  assert.deepEqual(dana().copy.pending(), []);

  // 4: the GM's page away; three changes.
  t.room.online('gm', false);
  write(dana().game, 'While you were out');
  nudge(dana().game, ridOf(SAM), 50);
  nudge(dana().game, REF, -30);
  await t.seconds(4);
  assert.deepEqual(dana().copy.pending().sort(), [ridOf(SAM), REF, STICKY].sort());

  // 5: back with a new key: the whole table, then the pending changes.
  await t.gmLoad();
  await t.seconds(2);
  assert.equal(text(t.gm.game), 'While you were out');
  assert.equal((t.gm.game.get(ridOf(SAM)) as Character).card.x, (dana().game.get(ridOf(SAM)) as Character).card.x);
  assert.equal(dana().copy.synced, true);
  assert.deepEqual(dana().copy.pending(), []);

  // 6: away again; Dana writes and reloads.
  t.room.online('gm', false);
  write(dana().game, 'Written before a reload');
  await t.seconds(1);
  await t.playerLoad('dana');
  await t.seconds(1);
  assert.deepEqual(dana().copy.pending(), [STICKY]);

  // 7: back.
  t.room.online('gm', true);
  await t.seconds(4);
  assert.equal(text(t.gm.game), 'Written before a reload');
  assert.equal(text(dana().game), 'Written before a reload');
  assert.deepEqual(dana().copy.pending(), []);

  // 8: unanswered after 5 tries: dropped, and the whole table asked for.
  t.room.drop = m => m.kind === 'edit';
  write(dana().game, 'Never arrives');
  await t.seconds(17);
  assert.deepEqual(dana().copy.pending(), [STICKY], 'five tries so far');
  const before = t.room.log.length;
  t.room.drop = m => m.kind === 'edit';
  await t.seconds(4);
  assert.deepEqual(dana().copy.pending(), []);
  assert.ok(t.room.log.slice(before).some(m => m.kind === 'sync' && m.from.tab === 'dana'), 'the table asked for');
  assert.equal(text(dana().game), 'Written before a reload', "the GM's version won");
});

test('catch-up and gaps', async () => {
  const t = await table();
  // A copy with an extra piece the GM doesn't have, and a new piece of its own still pending.
  const extra: Sticky = { kind: 'sticky', oid: '0000000f', place: { x: 0, y: 0, z: 0, tilt: 0 }, text: 'stale' };
  const own: Sticky = { ...extra, oid: '0000000e', text: 'mine' };
  const copy = await t.playerLoad('dana', [...playtest('Dana', 'Ann'), [ridOf(extra.oid), extra]]);
  const dana = () => t.players.get('dana')!;
  dana().game.change(w => w.put(ridOf(own.oid), own));
  await t.room.settle();
  assert.equal(dana().game.get(ridOf(extra.oid)), undefined, 'the extra piece gone');
  assert.ok(dana().game.get(ridOf(own.oid)), 'the pending one kept');
  await t.seconds(1);
  assert.ok(t.gm.game.get(ridOf(own.oid)), 'and sent');
  assert.deepEqual(copy.pending(), []);

  // A gap: a batch lost on the way asks for the table after 1.5 s.
  let lose = true;
  t.room.drop = m => m.kind === 'recs' && m.to === undefined && lose && (lose = false, true);
  write(t.gm.game, 'lost batch');
  await t.room.settle();
  write(t.gm.game, 'next batch');
  await t.room.settle();
  const before = t.room.log.length;
  t.advance(1000);
  await t.room.settle();
  assert.ok(!t.room.log.slice(before).some(m => m.kind === 'sync'), 'not yet');
  t.advance(500);
  await t.room.settle();
  assert.ok(t.room.log.slice(before).some(m => m.kind === 'sync' && m.from.tab === 'dana'), 'asked after 1.5 s');

  // Ann joins midway; five GM changes reach both, and Ann's catch-up is no gap for Dana.
  const mark = t.room.log.length;
  for (let i = 1; i <= 5; i++) {
    write(t.gm.game, `change ${i}`);
    await t.room.settle();
    if (i === 2) { await t.playerLoad('ann', []); await t.room.settle(); }
  }
  await t.seconds(2);
  const batches = t.room.log.slice(mark).filter(m => m.kind === 'recs' && m.to === undefined);
  assert.equal(batches.length, 5);
  assert.ok(!t.room.log.slice(mark).some(m => m.kind === 'sync' && m.from.tab === 'dana'), 'no gap for Dana');
  for (const tab of ['dana', 'ann']) {
    assert.equal(t.players.get(tab)!.copy.synced, true, tab);
    assert.equal(text(t.players.get(tab)!.game), 'change 5', tab);
  }
});

test('deletions, the book, and silence', async () => {
  const t = await table();
  // Nothing goes before the table arrives.
  t.room.online('gm', false);
  await t.playerLoad('dana', playtest('Dana', 'Ann'));
  const dana = () => t.players.get('dana')!;
  write(dana().game, 'Before the table');
  await t.seconds(4);
  assert.ok(!t.room.log.some(m => m.kind === 'edit'), 'no change sent before the table arrived');
  t.room.online('gm', true);
  await t.seconds(4);
  assert.equal(text(t.gm.game), 'Before the table', 'then it goes');
  // The GM's page back with a new key, its table held up on the way: Dana's changes wait.
  t.room.drop = m => m.kind === 'sync';
  await t.gmLoad();
  await t.room.settle();
  const mark = t.room.log.length;
  write(dana().game, 'Not yet');
  await t.seconds(2);
  assert.ok(!t.room.log.slice(mark).some(m => m.kind === 'edit'), 'nothing sent while the table is on its way');
  t.room.drop = () => false;
  await t.seconds(4);
  assert.equal(text(t.gm.game), 'Not yet');

  // The 11-11 bug: the GM's own change to the sticky, then a drag (moves numbered after it), then the deletion.
  write(t.gm.game, "The GM's word");
  await t.room.settle();
  for (let i = 0; i < 4; i++) dana().stamps.mark(STICKY, 'gm', t.gm.stamps.next());
  t.gm.game.change(w => w.del(STICKY));
  await t.room.settle();
  assert.equal(dana().game.get(STICKY), undefined, 'the deletion is not stale');
  const book = () => t.gm.game.get('book') as Book;
  const deletedAt = book().tomb[STICKY]!;
  assert.equal(deletedAt, book().gv, 'tombed at the batch that deleted it');

  // Boot Hill's version is the batch that changed it.
  t.gm.game.change(w => w.put('yards', { yards: [{ name: 'Old timers', named: true, items: [] }] }));
  await t.room.settle();
  assert.equal(book().hillGv, book().gv);

  // 25 s of silence, then the GM's page is heard: it counts as back, and the table is asked for.
  t.room.online('gm', false);
  await t.seconds(26);
  t.room.online('gm', true);
  const before = t.room.log.length;
  nudge(t.gm.game, REF, 10);
  await t.seconds(2);
  assert.ok(t.room.log.slice(before).some(m => m.kind === 'sync' && m.from.tab === 'dana'), 'asked for the table');
});
