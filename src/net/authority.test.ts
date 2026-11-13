// CRC: crc-Authority.md | Test: test-Authority.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Book, type Character, type Influence, type Sticky, type Yards } from '../model/records.ts';
import { Authority, judge, type Batch, type Edit, type Sealed } from './authority.ts';
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
