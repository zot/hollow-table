// CRC: crc-Authority.md | Test: test-Authority.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Book, type Character, type Opinion, type Chip, type Influence, type Roller, type Rows, type Sticky, type Yards } from '../model/records.ts';
import { Authority, judge, type Batch, type Edit, type Sealed } from './authority.ts';
import { redact } from '../rules/visibility.ts';
import { handOver, whoIs } from './claims.ts';
import { FakeRoom } from './fakeroom.ts';
import { Sealer } from './seal.ts';
import { Stamps } from './stamps.ts';
import { memoryStorage } from '../store/fakes.ts';
import { BEAUFORD, DEVREUX, SAM, playtest } from '../store/playtest.ts';

const STICKY = ridOf('00000008'), CARD = ridOf('00000004');

test('judge', () => {
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const sam = game.get(ridOf(SAM)) as Character, beau = game.get(ridOf(BEAUFORD)) as Character;
  const card = game.get(CARD) as Influence, sticky = game.get(STICKY) as Sticky;
  const moved = (c: Character): Character => ({ ...c, card: { ...c.card, x: c.card.x + 5 } });
  // The sticky was deleted at version 5; Boot Hill last changed at 6.
  game.change(w => {
    w.del(STICKY);
    w.put('book', { ...(game.get('book') as Book), gv: 6, tomb: { [STICKY]: 5 }, hillGv: 6 });
  });
  const edit = (puts: Edit['puts'], base = 4): Edit => ({ s: 1, base, puts, dels: [] });

  assert.deepEqual(judge(game, edit([{ rid: ridOf(SAM), rec: moved(sam) }]), 'Dana').refused, [], 'move Sam: taken');
  assert.deepEqual(judge(game, edit([{ rid: ridOf(BEAUFORD), rec: moved(beau) }]), 'Dana').refused, [ridOf(BEAUFORD)], "Ann's Beauford");
  assert.deepEqual(judge(game, edit([{ rid: CARD, rec: { ...card, name: 'Mine now' } }]), 'Dana').refused, [CARD], 'redacted to her');
  assert.deepEqual(judge(game, edit([{ rid: STICKY, rec: sticky }], 3), 'Dana').refused, [STICKY], 'deleted after her copy');
  assert.deepEqual(judge(game, edit([{ rid: STICKY, rec: sticky }], 5), 'Dana').refused, [], 'deleted before her copy: hers to put back');
  const hill = edit([{ rid: 'yards', rec: game.get('yards') as Yards }, { rid: ridOf(SAM), rec: moved(sam) }]);
  assert.deepEqual(judge(game, hill, 'Dana').refused.sort(), [ridOf(SAM), 'yards'].sort(), 'Boot Hill from behind: all of it');
  assert.deepEqual(judge(game, { ...hill, base: 6 }, 'Dana').refused, [], 'from a copy that saw it');
  assert.deepEqual(judge(game, edit([{ rid: ridOf(SAM), rec: moved(sam) }]), null).refused, [ridOf(SAM)], 'an impostor');
});

/** The GM's page and two player tabs over a fake room; the players only collect what they're sent. */
async function table() {
  const room = new FakeRoom(), game = new Game();
  game.load(playtest('GM', 'Ann'));
  const [gmSeal, danaSeal, annSeal] = await Promise.all([Sealer.make(), Sealer.make(), Sealer.make()]);
  const link = room.link({ tab: 'gm', browser: 'b-gm', sealKey: gmSeal.pub });
  const authority = new Authority({ game, stamps: new Stamps(memoryStorage()), sealer: gmSeal, link, schedule: queueMicrotask });
  room.watch(() => authority.idle());
  type Got = { public: Batch[]; mine: Sealed[]; holds: Map<string, unknown>; link: ReturnType<FakeRoom['link']> };
  const got = new Map<string, Got>();
  const listen = (tab: string, browser: string, seal: Sealer): Got => {
    const l = room.link({ tab, browser, sealKey: seal.pub });
    const mine: Got = { public: [], mine: [], holds: new Map<string, unknown>(), link: l };
    got.set(tab, mine);
    l.on('recs', async (b: Batch, from) => {
      mine.public.push(b);
      const box = b.sealed[tab], opened = box ? await seal.open(from.sealKey, 'recs', from.tab, tab, box) as Sealed : null;
      if (opened) mine.mine.push(opened);
      // What the page holds: the public part, with its own sealed part over it.
      for (const p of [...b.puts, ...(opened?.puts ?? [])]) mine.holds.set(p.rid, p.rec);
    });
    return mine;
  };
  listen('dana', 'b-dana', danaSeal);
  listen('ann', 'b-ann', annSeal);
  authority.join('dana', 'Dana', 'b-dana', danaSeal.pub);
  authority.join('ann', 'Ann', 'b-ann', annSeal.pub);
  /** Another tab joining as `name` from `browser`. */
  const join = async (tab: string, browser: string, name: string) => {
    const seal = await Sealer.make(), mine = listen(tab, browser, seal);
    authority.join(tab, name, browser, seal.pub);
    return mine;
  };
  return { room, game, got, authority, join };
}

test('out seals what differs and nothing else', async () => {
  const { room, game, got } = await table();
  const sam = () => game.get(ridOf(SAM)) as Character;
  const sheet = (tab: string) => got.get(tab)!.mine.flatMap(s => s.puts).filter(p => p.rid === ridOf(SAM)).map(p => (p.rec as Character).front);

  game.change(w => w.put(ridOf(SAM), { ...sam(), front: `${sam().front}\nZebedee owes him money` }));
  await room.settle();
  assert.deepEqual(sheet('dana'), [], "the GM's Sam: nobody's box");
  game.change(w => w.put(ridOf(SAM), { ...sam(), owner: 'Dana' }));
  await room.settle();
  assert.ok(sheet('dana').at(-1)!.includes('Zebedee'), 'given to Dana: his sheet, sealed to her');
  game.change(w => w.put(ridOf(SAM), { ...sam(), owner: 'GM' }));
  await room.settle();
  const holds = (tab: string) => (got.get(tab)!.holds.get(ridOf(SAM)) as Character).front;
  assert.ok(!holds('dana').includes('Zebedee'), 'taken back: she holds the redacted one');
  assert.equal(sheet('dana').length, 1, 'which came in the clear: nothing new was sealed');
  assert.deepEqual(sheet('ann'), [], "Ann's box never holds Sam");
  for (const b of got.get('ann')!.public) assert.ok(!JSON.stringify([b.puts, b.dels]).includes('Zebedee'), 'the public part holds no secret');
  // Every batch moved the version by one.
  assert.deepEqual(got.get('ann')!.public.map(b => b.g), [1, 2, 3]);
  assert.equal(got.get('ann')!.public.some(b => b.puts.some(p => p.rid === DEVREUX)), false);
});

test('claims', () => {
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  assert.equal(whoIs(game, 'Dana', 'b-dana'), 'Dana', 'first come holds it');
  assert.equal(whoIs(game, 'Dana', 'b-dana'), 'Dana');
  assert.equal(whoIs(game, 'Dana', 'b-other'), null, 'another browser is nobody');
  assert.equal(whoIs(game, 'GM', 'b-dana'), null, '"GM" cannot be claimed');
  handOver(game, 'Dana', 'b-other');
  assert.deepEqual([whoIs(game, 'Dana', 'b-other'), whoIs(game, 'Dana', 'b-dana')], ['Dana', null]);
});

test('a name handed over: the new holder is told and gets its secrets, the old one is told', async () => {
  // R168, R296.
  const { room, game, got, authority, join } = await table();
  const claims = new Map<string, (string | null)[]>();
  const imp = await join('imp', 'b-imp', 'Ann');
  for (const [tab, l] of [['ann', got.get('ann')!.link], ['imp', imp.link]] as const) {
    claims.set(tab, []);
    l.on('claim', (b: { why: string | null }) => { claims.get(tab)!.push(b.why); });
  }
  await room.settle();
  imp.mine.length = 0;
  handOver(game, 'Ann', 'b-imp');
  authority.handedOver('Ann');
  await room.settle();
  const imps = claims.get('imp')!;
  assert.equal(imps.length, 2);
  assert.match(imps[0]!, /^Ann is played from another browser/, 'nobody when it came');
  assert.equal(imps[1], null, 'the new holder: no longer "not yours"');
  assert.equal(claims.get('ann')!.length, 1);
  assert.match(claims.get('ann')![0]!, /^Ann is played from another browser/);
  assert.ok(imp.mine.length > 0, 'its secrets follow');
});

test('a deletion of what a tab only had from its catch-up still reaches it, and is tombed', async () => {
  // R171, R188, R192: everything a catch-up sends has gone out, so deleting it is news.
  const { room, game, got } = await table();
  got.get('dana')!.link.send('sync', {});
  await room.settle();
  game.change(w => w.del(STICKY));
  await room.settle();
  assert.ok(got.get('dana')!.public.some(b => b.dels.some(d => d.rid === STICKY)), 'Dana is told it is gone');
  assert.ok(((game.get('book') as Book).tomb[STICKY] ?? 0) > 0, 'and a stale copy cannot put it back');
});

test('the private mat on the wire', async () => {
  // R361: Sam and Devreux are the GM's, Beauford Ann's; Dana owns nothing.
  const { room, game, got, join } = await table();
  const CHIP = ridOf('000000c1'), PRIV = ridOf('000000c2');
  const onTable: Chip = { kind: 'chip', oid: '000000c1', where: { table: { x: 0, y: 0, z: 0, tilt: 0 } }, n: 0, sign: -1, points: 2, rider: false };
  const pubPuts = (tab: string, rid: string) => got.get(tab)!.public.flatMap(b => b.puts).filter(p => p.rid === rid);
  const pubDels = (tab: string, rid: string) => got.get(tab)!.public.flatMap(b => b.dels).filter(d => d.rid === rid);
  const own = (tab: string, rid: string) => got.get(tab)!.mine.flatMap(s => [...s.puts.filter(p => p.rid === rid), ...(s.dels ?? []).filter(d => d.rid === rid)]);
  const tomb = () => (game.get('book') as Book).tomb;
  game.change(w => w.put(CHIP, onTable));
  await room.settle();
  assert.equal(pubPuts('dana', CHIP).length, 1, 'on the table: public');
  // The GM moves it into Devreux's Main: it goes private, a removal and no tomb.
  game.change(w => w.put(CHIP, { ...onTable, where: { slot: DEVREUX, name: 'main' }, by: 'GM' }));
  await room.settle();
  assert.equal(pubDels('dana', CHIP).length, 1, 'removed from the public part');
  assert.equal(pubPuts('dana', CHIP).length, 1, 'and never put again');
  assert.equal(tomb()[CHIP], undefined, 'not remembered as deleted');
  // Back on the table, it is public again.
  game.change(w => w.put(CHIP, onTable));
  await room.settle();
  assert.equal(pubPuts('ann', CHIP).length, 2);
  // Dana's contribution to Devreux is public.
  game.change(w => w.put(CHIP, { ...onTable, where: { slot: DEVREUX, name: 'main' }, by: 'Dana' }));
  await room.settle();
  assert.equal((pubPuts('ann', CHIP).at(-1)!.rec as Chip).by, 'Dana');
  // Ann's own chip on Beauford: sealed to her, never in the public part.
  const priv: Chip = { ...onTable, oid: '000000c2', where: { slot: BEAUFORD, name: 'main' }, by: 'Ann' };
  game.change(w => w.put(PRIV, priv));
  await room.settle();
  assert.deepEqual([pubPuts('dana', PRIV).length, own('ann', PRIV).length, own('dana', PRIV).length], [0, 1, 0]);
  // A catch-up keeps it out of the public part too, and brings it to Ann sealed.
  const late = await join('late', 'b-late', 'Dana');
  late.link.send('sync', {});
  got.get('ann')!.link.send('sync', {});
  await room.settle();
  const full = late.public.find(b => b.full)!;
  assert.ok(full, 'the late tab had its catch-up');
  assert.equal(full.puts.some(p => p.rid === PRIV), false);
  assert.ok(got.get('ann')!.mine.some(s => s.puts.some(p => p.rid === PRIV)) && own('ann', PRIV).length === 2, "Ann's catch-up seals it to her");
  // Deleted, it is taken away from Ann, sealed, and tombed; the public part never names it.
  game.change(w => w.del(PRIV));
  await room.settle();
  assert.deepEqual(own('ann', PRIV).map(x => 'rec' in x ? 'put' : 'del'), ['put', 'put', 'del']);
  assert.equal(pubDels('dana', PRIV).length, 0);
  assert.ok(tomb()[PRIV]);
});

test('a player puts only their own name on a chip', () => {
  // R360: Dana may say a chip is hers; she may not say it is Ann's.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const chip = (by?: string): Chip => ({ kind: 'chip', oid: '000000c1', where: { slot: DEVREUX, name: 'stagger' }, n: 0, sign: -1, points: 2,
    rider: false, ...(by && { by }) });
  const book = game.get('book') as Book, edit = (c: Chip): Edit => ({ s: 1, base: book.gv, puts: [{ rid: ridOf(c.oid), rec: c }], dels: [] });
  assert.deepEqual(judge(game, edit(chip('Dana')), 'Dana').refused, []);
  assert.deepEqual(judge(game, edit(chip('Ann')), 'Dana').refused, [ridOf('000000c1')]);
});

test("a player changes only their own row's action and dice, never its aim", () => {
  // R375: Sam is Dana's, Beauford Ann's; the GM aimed Sam's row at Devreux.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const row = (pool: string, extra: Partial<Roller> = {}): Roller =>
    ({ pool, action: 'Infer', opponent: DEVREUX, defend: 'mental', row: 'white+1', byHand: false, hand: { yellows: 0, bonus: 0 }, ...extra });
  game.change(w => w.put('rows', { rows: { [SAM]: row(SAM), [BEAUFORD]: row(BEAUFORD) } }));
  const book = game.get('book') as Book;
  const mine: Rows = { rows: { [SAM]: row(SAM, { action: 'Impress', opponent: BEAUFORD, row: 'green', hand: { yellows: 1, bonus: 2 }, type: 'impress' }),
    [BEAUFORD]: row(BEAUFORD, { action: 'Shoot' }) } };
  const v = judge(game, { s: 1, base: book.gv, puts: [{ rid: 'rows', rec: mine }], dels: [] }, 'Dana');
  const out = (v.puts[0]!.rec as Rows).rows;
  assert.deepEqual([out[SAM]!.action, out[SAM]!.type, out[SAM]!.hand, out[SAM]!.opponent, out[SAM]!.row], ['Impress', 'impress', { yellows: 1, bonus: 2 }, DEVREUX, 'white+1']);
  assert.equal(out[BEAUFORD]!.action, 'Infer', "Ann's row is not Dana's to change");
});

test('a player puts away their own row, never a private one or another\'s', () => {
  // R383: Dana's copy without Sam's row puts it away; Beauford's (Ann's) stays; a private row on a
  // character of hers, which her copy never holds, stays too.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const row = (pool: string, extra: Partial<Roller> = {}): Roller =>
    ({ pool, action: 'Infer', opponent: null, defend: 'mental', row: null, byHand: false, hand: { yellows: 1, bonus: 0 }, ...extra });
  const devreux = game.get(ridOf(DEVREUX)) as Character;
  game.change(w => {
    w.put(ridOf(DEVREUX), { ...devreux, owner: 'Dana' });
    w.put('rows', { rows: { [SAM]: row(SAM), [BEAUFORD]: row(BEAUFORD), [DEVREUX]: row(DEVREUX, { priv: true }) } });
  });
  const book = game.get('book') as Book;
  const v = judge(game, { s: 1, base: book.gv, puts: [{ rid: 'rows', rec: { rows: {} } }], dels: [] }, 'Dana');
  assert.deepEqual(Object.keys((v.puts[0]!.rec as Rows).rows).sort(), [BEAUFORD, DEVREUX].sort());
});

test("a player's Boot Hill keeps the GM's cards whole", () => {
  // R406: Dana sees a buried Info card as "GM card"; her Boot Hill comes back with it whole, she can't
  // take one away, and one she makes up is dropped.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const card = { name: 'Devreux: Info card', records: [], info: { oid: DEVREUX, k: 0, text: 'ANY: she watches the door' }, gm: '0000aaaa' };
  game.change(w => w.put('yards', { yards: [{ name: '', named: false, items: [card] }] }));
  const chars = (oid: string) => game.get(ridOf(oid)) as Character | undefined;
  const seen = redact(game.get('yards')!, { name: 'Dana', gm: false }, chars) as Yards;
  assert.deepEqual(seen.yards[0]!.items, [{ name: 'GM card', records: [], gm: '0000aaaa' }]);
  const sticky = { kind: 'sticky', oid: '0000bbbb', place: { x: 0, y: 0, z: 1 }, text: 'mine' } as Sticky;
  const put = (items: Yards['yards'][0]['items']) => judge(game, { s: 1, base: 4, puts: [{ rid: 'yards', rec: { yards: [{ name: '', named: false, items }] } }], dels: [] }, 'Dana');
  const taken = put([...seen.yards[0]!.items, { name: 'Note: mine', records: [sticky] }]);
  assert.deepEqual(taken.refused, []);
  assert.deepEqual((taken.puts[0]!.rec as Yards).yards[0]!.items, [card, { name: 'Note: mine', records: [sticky] }], 'the card comes back whole');
  assert.deepEqual(put([]).refused, ['yards'], 'taking the card away is refused');
  const forged = put([...seen.yards[0]!.items, { name: 'GM card', records: [], gm: '0000cccc' }]);
  assert.deepEqual((forged.puts[0]!.rec as Yards).yards[0]!.items, [card], 'a made-up GM card is dropped');
});

test('a player never writes a record, however much is revealed', () => {
  // R410, R435: every line revealed, Dana sees the record whole, and still can't change it; nor the table.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const rec: Opinion = { kind: 'opinion', oid: '0000000f', holder: 'c0000005', of: SAM, text: 'Grudge -Min', shown: ['Grudge -Min'], on: [DEVREUX], name: 'Sam' };
  game.change(w => w.put(ridOf(rec.oid), rec));
  const edit = (puts: Edit['puts']): Edit => ({ s: 1, base: 0, puts, dels: [] });
  assert.deepEqual(redact(rec, { name: 'Dana', gm: false }, () => undefined), rec, 'she sees it whole');
  assert.deepEqual(judge(game, edit([{ rid: ridOf(rec.oid), rec: { ...rec, text: 'Grudge +Exq', shown: ['Grudge +Exq'] } }]), 'Dana').refused, [ridOf(rec.oid)]);
  const t = game.get(ridOf('0000000a'));
  assert.equal((t as { kind: string }).kind, 'connections');
  assert.deepEqual(judge(game, edit([{ rid: ridOf('0000000a'), rec: { ...(t as object), away: true } as never }]), 'Dana').refused, [ridOf('0000000a')]);
});
