// CRC: crc-Authority.md | Test: test-Authority.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { TOMBS, ridOf, type Book, type Character, type Desk, type Opinion, type PieceRecord, type Chip, type Influence, type Roller, type Rows, type Sticky, type TornRoll, type Yards } from '../model/records.ts';
import { Authority, judge, type Batch, type Edit, type Sealed } from './authority.ts';
import { redact } from '../rules/visibility.ts';
import { burialOf, bury } from '../rules/yards.ts';
import { handOver, oldClaims, renameWhy, renamed, whoIs } from './claims.ts';
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

test('claims made under the old ids go, and the name is claimed again', () => {
  // R472: a claim held by a 20-character id is from before Trystero proved ids.
  const game = new Game(), dee = 'D1'.repeat(11), ann = 'A1'.repeat(11);
  game.load(playtest('Dana', 'Ann'));
  game.change(w => w.put('book', { ...(game.get('book') as Book), claims: { Dana: 'D-'.repeat(10), Ann: ann, Dee: dee } }));
  game.change(oldClaims(game)!);
  assert.deepEqual((game.get('book') as Book).claims, { Ann: ann, Dee: dee }, "only Dana's old claim goes");
  assert.equal(oldClaims(game), null, 'nothing left to drop');
  assert.equal(whoIs(game, 'Dana', 'N1'.repeat(11)), 'Dana', 'Dana is free to claim again');
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
  // R442: her own burial is of a sticky on the table that the same change deletes.
  const sticky = { kind: 'sticky', oid: '0000bbbb', place: { x: 0, y: 0, z: 1, tilt: 0 }, text: 'mine' } as Sticky;
  game.change(w => w.put(ridOf(sticky.oid), sticky));
  const put = (items: Yards['yards'][0]['items'], dels: string[] = []) =>
    judge(game, { s: 1, base: 4, puts: [{ rid: 'yards', rec: { yards: [{ name: '', named: false, items }] } }], dels }, 'Dana');
  const taken = put([...seen.yards[0]!.items, { name: 'Note: mine', records: [sticky] }], [ridOf(sticky.oid)]);
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

test("a player's own piece is theirs while a hidden piece lies in it", () => {
  // R174, R188 (prototype Item 22): records don't nest, so a GM card in Sam's Stagger leaves Sam whole to
  // Dana; only the GM's card itself, which she sees redacted, is refused.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const sam = game.get(ridOf(SAM)) as Character;
  const glare: Influence = { kind: 'influence', oid: '0000000e', home: DEVREUX, where: { slot: SAM, name: 'stagger' }, n: 0, name: 'Glare',
    sign: -1, points: 4, used: false, crit: false };
  game.change(w => { w.put(ridOf(SAM), { ...sam, owner: 'Dana' }); w.put(ridOf(glare.oid), glare); });
  const own = game.get(ridOf(SAM)) as Character, edit = (puts: Edit['puts']): Edit => ({ s: 1, base: 9, puts, dels: [] });
  for (const rec of [{ ...own, front: `${own.front}\nA new line` }, { ...own, card: { ...own.card, x: own.card.x + 5 } },
    { ...own, pool: { ...own.pool, x: own.pool.x + 5 } }]) assert.deepEqual(judge(game, edit([{ rid: ridOf(SAM), rec }]), 'Dana').refused, []);
  assert.deepEqual(judge(game, edit([{ rid: ridOf(glare.oid), rec: { ...glare, where: { slot: SAM, name: 'main' } } }]), 'Dana').refused, [ridOf(glare.oid)]);
});

test('a player buries only what they delete', () => {
  // R442: a new burial keeps only the pieces the change deletes and the GM's page takes, as the GM holds them.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const sam = game.get(ridOf(SAM)) as Character;
  const glare: Influence = { kind: 'influence', oid: '0000000e', home: DEVREUX, where: { slot: SAM, name: 'stagger' }, n: 0, name: 'Glare',
    sign: -1, points: 4, used: false, crit: false };
  game.change(w => { w.put(ridOf(SAM), { ...sam, owner: 'Dana' }); w.put(ridOf(glare.oid), glare); });
  const chars = (o: string) => game.get(ridOf(o)) as Character | undefined, dana = { name: 'Dana', gm: false };
  const all = () => game.all().map(([, r]) => r).filter((r): r is PieceRecord => 'kind' in r);
  const seen = (r: PieceRecord) => redact(r, dana, chars) as PieceRecord;
  const yards = () => game.get('yards') as Yards, base = () => (game.get('book') as Book).gv;
  const buried = (y: Yards) => y.yards.flatMap(g => g.items);
  const send = (records: PieceRecord[], name: string, dels: string[]): ReturnType<typeof judge> =>
    judge(game, { s: 1, base: base(), puts: [{ rid: 'yards', rec: bury(yards(), 0, records, name) }], dels }, 'Dana');

  // Ann's Beauford, from Dana's blank copy: his deletion refused, and no burial of him.
  const beau = game.get(ridOf(BEAUFORD)) as Character;
  const b = send([seen(beau)], 'Beauford', [ridOf(BEAUFORD)]);
  assert.deepEqual(b.refused, [ridOf(BEAUFORD)]);
  assert.equal(buried(b.puts.find(p => p.rid === 'yards')!.rec as Yards).some(i => i.name === 'Beauford'), false);

  // Her own Sam, rewritten in her burial: the GM's Sam and his own cards, not the GM's Glare.
  const recs = burialOf(game.get(ridOf(SAM)) as Character, all()).map(seen);
  const forged = recs.map(r => (r.oid === SAM ? { ...r, front: 'Forged' } : r));
  const s = send(forged, 'Sam', recs.map(r => ridOf(r.oid)));
  assert.deepEqual(s.refused, [ridOf(glare.oid)]);
  const grave = buried(s.puts.find(p => p.rid === 'yards')!.rec as Yards).find(i => i.name === 'Sam')!;
  assert.ok(grave.records.some(r => r.oid === SAM && r.kind === 'character' && r.front === (game.get(ridOf(SAM)) as Character).front), "the GM's Sam");
  assert.equal(grave.records.some(r => r.oid === glare.oid), false, 'Glare stays in play');

  // What lies buried is the GM's copy, whatever she sends.
  const STICKY = ridOf('00000008'), sticky = game.get(STICKY) as Sticky;
  game.change(w => { w.put('yards', bury(yards(), 0, [sticky], 'Note')); w.del(STICKY); });
  const y = yards(), rewritten: Yards = { yards: y.yards.map(g => ({ ...g, items: g.items.map(i => ({ ...i,
    records: i.records.map(r => (r.oid === sticky.oid ? { ...r, text: 'Rewritten' } : r)) })) })) };
  const t = judge(game, { s: 1, base: base(), puts: [{ rid: 'yards', rec: rewritten }], dels: [] }, 'Dana');
  const note = buried(t.puts.find(p => p.rid === 'yards')!.rec as Yards).find(i => i.name === 'Note')!;
  assert.equal((note.records[0] as Sticky).text, sticky.text);
});

test("a change from a stale copy loses to another tab's", () => {
  // R444: the GM rewrote the sticky at version 6; Dana's own tab moved Sam at 6.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const sam = game.get(ridOf(SAM)) as Character, sticky = game.get(STICKY) as Sticky;
  game.change(w => w.put('book', { ...(game.get('book') as Book), gv: 6, last: { [STICKY]: { g: 6, by: 'gm' }, [ridOf(SAM)]: { g: 6, by: 'dana' } } }));
  const edit = (e: Partial<Edit>, base = 4): Edit => ({ s: 1, base, puts: [], dels: [], ...e });
  const moved = { ...sticky, place: { ...sticky.place, x: sticky.place.x + 40 } };
  assert.deepEqual(judge(game, edit({ puts: [{ rid: STICKY, rec: moved }] }), 'Dana', 'dana').refused, [STICKY], 'a move of what the GM changed since');
  assert.deepEqual(judge(game, edit({ dels: [STICKY] }), 'Dana', 'dana').refused, [STICKY], 'and a deletion');
  assert.deepEqual(judge(game, edit({ puts: [{ rid: STICKY, rec: moved }] }, 6), 'Dana', 'dana').refused, [], 'from a copy that saw it');
  const samMoved = { ...sam, card: { ...sam.card, x: sam.card.x + 5 } };
  assert.deepEqual(judge(game, edit({ puts: [{ rid: ridOf(SAM), rec: samMoved }] }), 'Dana', 'dana').refused, [], 'her own tab changed it last');
  assert.deepEqual(judge(game, edit({ puts: [{ rid: ridOf(SAM), rec: samMoved }] }), 'Dana', 'dana-2').refused, [ridOf(SAM)], 'from her other tab, it is stale');
});

test('who holds each name goes to everyone when it changes, and to a tab catching up', async () => {
  // R446.
  const { room, game, got } = await table();
  await room.settle();
  const sent = () => room.log.filter(m => m.kind === 'claims');
  const last = () => sent().at(-1)!;
  assert.equal(last().to, undefined, 'to everyone');
  assert.deepEqual((last().body as { claims: Record<string, string> }).claims, (game.get('book') as Book).claims);
  assert.ok(Object.keys((game.get('book') as Book).claims).includes('Dana'), "Dana's claim among them");
  const before = sent().length;
  game.change(w => w.put(STICKY, { ...(game.get(STICKY) as Sticky), text: 'A batch moves the book, not the claims' }));
  await room.settle();
  assert.equal(sent().length, before, 'nothing new when the claims are the same');
  handOver(game, 'Dana', 'b-imp');
  await room.settle();
  assert.equal((last().body as { claims: Record<string, string> }).claims.Dana, 'b-imp', 'a hand-over goes out');
  got.get('ann')!.link.send('sync', {});
  await room.settle();
  assert.equal(last().to, 'ann', 'and a catch-up gets them');
});

test('a copy older than what the book has forgotten is refused whole', async () => {
  // R448: the sticky was deleted at version 1, with 2,999 deletions after it; one more drops its tombstone.
  const { room, game, got } = await table();
  got.get('dana')!.link.send('sync', {});   // so what is deleted has gone out, and is tombed
  await room.settle();
  const sticky = game.get(STICKY) as Sticky, tomb: Record<string, number> = { [STICKY]: 1 };
  for (let i = 2; i <= TOMBS; i++) tomb[ridOf('a' + i.toString(16).padStart(7, '0'))] = i;
  game.change(w => w.del(STICKY));
  await room.settle();
  game.change(w => w.put('book', { ...(game.get('book') as Book), gv: TOMBS, tomb }));
  game.change(w => w.del(ridOf('00000009')));   // the reference card, which everyone sees
  await room.settle();
  const book = game.get('book') as Book;
  assert.equal(book.tomb[STICKY], undefined, "the cap dropped the sticky's tombstone");
  assert.equal(book.floor, 1, 'and the book keeps the newest version it dropped');
  const edit: Edit = { s: 1, base: 0, puts: [{ rid: STICKY, rec: sticky }], dels: [] };
  assert.deepEqual(judge(game, edit, 'Dana', 'dana').refused, [STICKY], 'a copy from before it: refused');
  assert.deepEqual(judge(game, { ...edit, base: book.gv }, 'Dana', 'dana').refused, [], 'a copy that saw it all: taken');
});

test('a player never rules on a flag', () => {
  // R464: Dana's change that drops or shrinks the flag on her own card is refused; one that keeps it is taken.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const card = (flag?: Influence['flag'], points = 4): Influence => ({ kind: 'influence', oid: '0000f1a9', home: SAM, where: 'drawer', n: 0,
    name: 'Grit', sign: 1, points, used: true, crit: false, tap: { ledger: { [`${SAM}:Money`]: 2 }, current: `${SAM}:Money` }, ...(flag && { flag }) });
  const flagged = { why: 'Tapped into a used card', fed: { [`${SAM}:Money`]: 1 } };
  game.change(w => w.put(ridOf('0000f1a9'), card(flagged)));
  const book = game.get('book') as Book, edit = (c: Influence): Edit => ({ s: 1, base: book.gv, puts: [{ rid: ridOf(c.oid), rec: c }], dels: [] });
  assert.deepEqual(judge(game, edit(card()), 'Dana', 'dana').refused, [ridOf('0000f1a9')], 'the flag dropped');
  assert.deepEqual(judge(game, edit(card({ why: flagged.why, fed: {} })), 'Dana', 'dana').refused, [ridOf('0000f1a9')], 'the flag shrunk');
  assert.deepEqual(judge(game, edit(card(flagged, 6)), 'Dana', 'dana').refused, [], 'kept, and the card changed');
});

test('a player renames: the name is free, and everything they hold follows', () => {
  // R467: refused for a name in use, any case; R468: taken, the claim, owners and chips' `by` follow.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  whoIs(game, 'Dana', 'b-dana');
  whoIs(game, 'Ann', 'b-ann');
  game.change(w => w.put(ridOf('000000c1'), { kind: 'chip', oid: '000000c1', where: { slot: DEVREUX, name: 'stagger' }, n: 0, sign: -1, points: 2, rider: false, by: 'Dana' } as Chip));
  for (const to of ['ann', 'GM', 'gm', 'OPEN', '  ', 'x'.repeat(33)]) assert.ok(renameWhy(game, 'Dana', to), `"${to}" refused`);
  assert.equal(renameWhy(game, 'Dana', 'dana'), null, 'her own name in another case is hers');
  assert.equal(renameWhy(game, 'Dana', 'Dee'), null);
  game.change(renamed(game, 'Dana', 'Dee'));
  const book = game.get('book') as Book;
  assert.deepEqual([book.claims.Dee, book.claims.Dana], ['b-dana', undefined], 'the claim moved');
  assert.equal((game.get(ridOf(SAM)) as Character).owner, 'Dee', 'her character');
  assert.equal((game.get(ridOf('000000c1')) as Chip).by, 'Dee', 'her chip');
  assert.equal((game.get(ridOf(BEAUFORD)) as Character).owner, 'Ann', "Ann's untouched");
});

test("a rename goes through the GM's page, and its answer comes back", async () => {
  // R469: Dana's page asks; refused, she's told why; taken, she's told so, and the claims go out.
  const { room, game, got } = await table();
  await room.settle();
  const answers: { to: string; why: string | null }[] = [];
  got.get('dana')!.link.on('rename', (b: { to: string; why: string | null }) => { answers.push(b); });
  got.get('dana')!.link.send('rename', { to: 'Ann' }, 'gm');
  await room.settle();
  got.get('dana')!.link.send('rename', { to: 'Dee' }, 'gm');
  await room.settle();
  assert.equal(answers.length, 2);
  assert.match(answers[0]!.why!, /Ann/);
  assert.deepEqual(answers[1], { to: 'Dee', why: null });
  assert.equal((game.get('book') as Book).claims.Dee, 'b-dana');
  const claims = room.log.filter(m => m.kind === 'claims').at(-1)!.body as { claims: Record<string, string> };
  assert.equal(claims.claims.Dee, 'b-dana', 'the new claims went out');
});

const torn = (oid: string, title: string): TornRoll => ({ kind: 'tornroll', oid, place: { x: 0, y: 0, z: 0, tilt: 0 },
  receipts: [{ id: oid, at: 1, title, dice: [], resolution: '', level: '', outcome: '' }] });

test('a torn roll put on the table is refused', () => {
  // R486: even under o:, the GM's page takes no torn roll from another page.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const sticky = game.get(STICKY) as Sticky, roll = torn('00a00001', 'Dana, roll 1');
  const got = judge(game, { s: 1, base: 0, dels: [], puts: [
    { rid: ridOf(roll.oid), rec: roll }, { rid: STICKY, rec: { ...sticky, text: 'moved' } }] }, 'Dana');
  assert.deepEqual(got.refused, [ridOf(roll.oid)], 'the torn roll refused');
  assert.deepEqual(got.puts.map(p => p.rid), [STICKY], 'the sticky taken');
});

test("a torn roll and the Hill never leave the GM's page", async () => {
  // R486: the GM's own torn roll and its Hill go out in no batch and no catch-up.
  const { room, game, got } = await table();
  const sticky = game.get(STICKY) as Sticky, mine = torn('0000a001', 'Devreux, secret roll'), buried = torn('0000a002', 'Devreux, buried roll');
  game.change(w => {
    w.put('t:' + mine.oid, mine);
    w.put('hill', { hill: [{ yard: 'Graveyard 1', burial: { name: 'Tape: 1 rolls', records: [buried] } }] });
    w.put(STICKY, { ...sticky, text: 'moved' });
  });
  await room.settle();
  got.get('dana')!.link.send('sync', {});
  await room.settle();
  const dana = got.get('dana')!, sent = JSON.stringify([dana.public.map(b => [b.puts, b.dels]), dana.mine]);
  assert.ok(dana.public.length >= 2, 'a batch and a catch-up went');
  assert.ok(sent.includes('moved'), 'the sticky went');
  assert.ok(!sent.includes('t:') && !sent.includes('"hill"') && !sent.includes('Devreux, secret roll') && !sent.includes('Devreux, buried roll'),
    'no torn roll, no Hill');
});

const PAPER_AT = { x: 0, y: 0, z: 0, tilt: 0 };

test('only its maker says who reads paper', () => {
  // R506: no paper under another's name; `by` and `to` are its maker's; a reader still writes on it.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const note: Sticky = { kind: 'sticky', oid: '0000e001', place: PAPER_AT, text: 'Is the mayor lying?', by: 'Dana', to: [] };
  const handout: Sticky = { kind: 'sticky', oid: '0000e002', place: PAPER_AT, text: 'A letter', by: 'GM', to: ['Dana'] };
  game.change(w => { w.put(ridOf(note.oid), note); w.put(ridOf(handout.oid), handout); });
  const one = (rec: Sticky, who: string) => judge(game, { s: 1, base: 0, dels: [], puts: [{ rid: ridOf(rec.oid), rec }] }, who);
  const fake: Sticky = { kind: 'sticky', oid: '0000e003', place: PAPER_AT, text: 'from Dana, honest', by: 'Dana' };
  assert.deepEqual(one(fake, 'Ann').refused, [ridOf(fake.oid)], "Ann can't make paper in Dana's name");
  assert.deepEqual(one({ ...fake, by: 'Ann' }, 'Ann').refused, [], 'in her own, she can');
  assert.deepEqual(one({ ...handout, text: 'A letter. Burn it.' }, 'Dana').refused, [], 'a reader writes on it');
  assert.deepEqual(one({ ...handout, to: [] }, 'Dana').refused, [ridOf(handout.oid)], "a reader doesn't change who reads it");
  assert.deepEqual(one({ ...handout, by: 'Dana' }, 'Dana').refused, [ridOf(handout.oid)], 'nor its maker');
  const { to: _to, ...open } = note;
  assert.deepEqual(one(open, 'Dana').refused, [], 'its maker makes it public');
  assert.deepEqual(one({ ...note, text: 'peeking' }, 'Ann').refused, [ridOf(note.oid)], "Ann can't touch a note she doesn't read");
});

test('a private note goes only to its readers, and leaves a page that stops reading it', async () => {
  // R501: sealed to its readers alone, never in the public part; a reader dropped gets a sealed removal.
  const { room, game, got, join } = await table();
  const sue = await join('sue', 'b-sue', 'Sue');
  const handout: Sticky = { kind: 'sticky', oid: '0000e002', place: PAPER_AT, text: 'A letter, sealed with wax', by: 'GM', to: ['Dana', 'Ann'] };
  game.change(w => w.put(ridOf(handout.oid), handout));
  await room.settle();
  const holds = (tab: string) => got.get(tab)!.mine.some(s => s.puts.some(p => p.rid === ridOf(handout.oid)));
  assert.ok(holds('dana') && holds('ann'), 'sealed to Dana and Ann');
  assert.ok(!sue.mine.some(s => JSON.stringify(s).includes('wax')), 'never to Sue');
  for (const t of ['dana', 'ann', 'sue']) for (const b of got.get(t)!.public) assert.ok(!JSON.stringify([b.puts, b.dels]).includes('wax'), 'never in the public part');
  game.change(w => w.put(ridOf(handout.oid), { ...handout, to: ['Dana'] }));
  await room.settle();
  assert.ok(got.get('ann')!.mine.some(s => (s.dels ?? []).some(d => d.rid === ridOf(handout.oid))), 'Ann gets a sealed removal');
  sue.link.send('sync', {});
  await room.settle();
  assert.ok(!JSON.stringify([sue.public, sue.mine]).includes('wax'), "Sue's catch-up holds no trace");
});

test("a player's Boot Hill change keeps the burials they can't see", () => {
  // R508: paper the sender never held goes back where the GM holds it.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const beau = game.get(ridOf(BEAUFORD)) as Character;
  const pinned: Sticky = { kind: 'sticky', oid: '0000e004', place: PAPER_AT, text: 'Beau cheats', by: 'Ann', to: [], pin: { card: BEAUFORD, dx: 0, dy: 0 } };
  const alone: Sticky = { kind: 'sticky', oid: '0000e005', place: PAPER_AT, text: 'For the GM', by: 'Ann', to: [] };
  const shopping: Sticky = { kind: 'sticky', oid: '0000e006', place: PAPER_AT, text: 'shopping', by: 'Ann' };
  const y: Yards = { yards: [{ name: 'Graveyard 1', named: false, items: [
    { name: 'Beauford', records: [beau, pinned] }, { name: 'Note: For the GM', records: [alone] }, { name: 'Note: shopping', records: [shopping] }] }] };
  game.change(w => w.put('yards', y));
  const dana = { name: 'Dana', gm: false }, chars = (oid: string) => game.get(ridOf(oid)) as Character | undefined;
  const seen = redact(y, dana, chars) as Yards;
  assert.equal(seen.yards[0]!.items.length, 2, 'Dana sees Beauford and the shopping list');
  // Dana digs up the shopping list: her Boot Hill without it, and the sticky back on the table.
  const mine: Yards = { yards: [{ ...seen.yards[0]!, items: seen.yards[0]!.items.slice(0, 1) }] };
  const got = judge(game, { s: 1, base: 0, dels: [], puts: [{ rid: 'yards', rec: mine }, { rid: ridOf(shopping.oid), rec: shopping }] }, 'Dana');
  assert.deepEqual(got.refused, [], 'taken');
  const kept = got.puts.find(p => p.rid === 'yards')!.rec as Yards;
  assert.deepEqual(kept.yards[0]!.items.map(b => [b.name, b.records.map(r => r.oid)]),
    [['Beauford', [BEAUFORD, '0000e004']], ['Note: For the GM', ['0000e005']]], 'the hidden note and burial kept where they were');
});

test('a rename carries paper with it', () => {
  // R507: paper Dana made, and paper sent to her, follow her new name.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  whoIs(game, 'Dana', 'b-dana');
  const made: Sticky = { kind: 'sticky', oid: '0000e001', place: PAPER_AT, text: 'mine', by: 'Dana', to: [] };
  const sent: Sticky = { kind: 'sticky', oid: '0000e002', place: PAPER_AT, text: 'yours', by: 'GM', to: ['Ann', 'Dana'] };
  game.change(w => { w.put(ridOf(made.oid), made); w.put(ridOf(sent.oid), sent); });
  game.change(renamed(game, 'Dana', 'Dee'));
  assert.equal((game.get(ridOf(made.oid)) as Sticky).by, 'Dee', 'her paper');
  assert.deepEqual((game.get(ridOf(sent.oid)) as Sticky).to, ['Ann', 'Dee'], 'paper sent to her');
});

test("a rename follows into the GM's drawers", () => {
  // R528: a character of Dana's the GM filed is Dee's when it comes back.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  whoIs(game, 'Dana', 'b-dana');
  const sam = game.get(ridOf(SAM)) as Character;
  game.change(w => { w.del(ridOf(SAM)); w.put('desk', { desk: [{ drawer: 'characters', name: sam.name, records: [sam] }] }); });
  game.change(renamed(game, 'Dana', 'Dee'));
  // R550: a desk from before is read as one desk, and written back as the list of desks.
  type Desks = { desks: { items: { records: Character[] }[] }[] };
  assert.equal((game.get('desk') as Desks).desks[0]!.items[0]!.records[0]!.owner, 'Dee');
  // In every one of the GM's desks.
  const now = game.get('desk') as Desk;
  const other = { name: 'Act 2', named: true, items: [{ drawer: 'characters' as const, name: sam.name, records: [{ ...sam, owner: 'Dee' }] }] };
  game.change(w => w.put('desk', { desks: [...now.desks, other] }));
  game.change(renamed(game, 'Dee', 'Dot'));
  assert.deepEqual((game.get('desk') as Desks).desks.map(d => d.items[0]!.records[0]!.owner), ['Dot', 'Dot']);
});

test('a player writes only what is theirs', () => {
  // R567: Dana writes Sam's front and name; an open character's writing is the GM's alone, though she may claim it.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  whoIs(game, 'Dana', 'b-dana');
  const sam = game.get(ridOf(SAM)) as Character;
  const edit = (rec: Character): Edit => ({ s: 1, base: 0, puts: [{ rid: ridOf(SAM), rec }], dels: [] });
  const refused = (rec: Character) => judge(game, edit(rec), 'Dana').refused.length > 0;
  assert.equal(refused({ ...sam, name: 'Sammy' }), false, 'her nickname for Sam');
  assert.equal(refused({ ...sam, front: sam.front + '\nmore' }), false, "Sam's front");
  game.change(w => w.put(ridOf(SAM), { ...sam, owner: 'open' }));
  const open = game.get(ridOf(SAM)) as Character;
  assert.equal(refused({ ...open, name: 'Mine' }), true, "an open character's name");
  assert.equal(refused({ ...open, front: open.front + '\nmore' }), true, 'its front');
  assert.equal(refused({ ...open, back: { ...open.back, notes: 'mine' } }), true, 'its notes');
  assert.equal(refused({ ...open, owner: 'Dana' }), false, 'but she may claim it');
});

