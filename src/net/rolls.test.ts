// CRC: crc-Rolls.md | Test: test-Rolls.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Chip, type Influence, type Meta, type Receipt, type Tape } from '../model/records.ts';
import { Rolls, levelWords, outcomeWords, resolve, rowWords, WAIT_MS, type Intent } from './rolls.ts';
import { ADV } from '../rules/odds.ts';
import type { Die } from '../model/records.ts';
import { FakeRoom } from './fakeroom.ts';
import { Sealer } from './seal.ts';
import { fakeClock, memoryStorage } from '../store/fakes.ts';
import { BEAUFORD, DEVREUX, SAM, playtest } from '../store/playtest.ts';

/** A die source showing these faces in order, then 1s. */
function faces(...vs: number[]) {
  const q = [...vs];
  const rng = () => ((q.length ? q.shift()! : 1) - 1) / 6 + 0.01;
  return Object.assign(rng, { push: (...more: number[]) => { q.push(...more); } });
}
const infer = (vs: string | null = DEVREUX): Omit<Intent, 'n'> =>
  ({ pool: SAM, action: 'Infer', vs, defend: 'mental', hand: { yellows: 0, bonus: 0 } });

/** The playtest, with a +6 chip and one of Sam's cards in his Main. */
function scene() {
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const chip: Chip = { kind: 'chip', oid: '0000000a', where: { slot: SAM, name: 'main' }, n: 0, sign: 1, points: 6, rider: false };
  const card: Influence = { kind: 'influence', oid: '0000000b', home: SAM, where: { slot: SAM, name: 'main' }, n: 1, name: 'Hunch',
    sign: 1, points: 0, used: false, crit: false };
  game.change(w => { w.put(ridOf(chip.oid), chip); w.put(ridOf(card.oid), { ...card, points: 2 }); });
  return game;
}

test('resolve', () => {
  const game = scene();
  const r = resolve(game, { ...infer(), n: 1 }, faces(4, 3), 1000);
  if ('refused' in r) throw new Error(r.refused);
  const pick = (x: Receipt) => [x.influence, x.base, x.row, x.vs];
  // R279: the receipt in the book's words.
  assert.deepEqual(pick(r.full), [10, 4, '+3 to +4 Weak Advantage: White + 1', 'Devreux (mental 6), Difference +4']);
  assert.deepEqual([r.full.title, r.full.action, r.full.resolution, r.full.level, r.full.outcome, r.full.by],
    ['Sam, roll 1', 'Infer', 'White 4 + 1', '3 + 2 bonus', 'Success 5, Significant', 'Dana']);
  assert.deepEqual(pick(r.roller), [10, 4, 'White + 1', 'Devreux']);
  assert.deepEqual(pick(r.table), [undefined, undefined, undefined, 'Devreux']);
  game.change(r.apply);
  assert.deepEqual((game.get('meta') as Meta).counts, { [SAM]: 1 }, 'R278: counted for Sam');
  assert.equal((game.get(ridOf('0000000b')) as Influence).used, true);

  const red = resolve(game, { ...infer(), n: 2, row: 'red' }, faces(4, 2, 3), 1000);
  assert.ok(!('refused' in red) && red.full.row === '−5 to −6 Disadvantage: Red' && red.full.dice.some(d => d.c === 'R'));
  assert.equal(red.full.resolution, 'lower of White 4 and Red 2');
  assert.equal(red.full.title, 'Sam, roll 2');
  // R278: Devreux rolling in between doesn't move Sam's count.
  const dev = resolve(game, { pool: DEVREUX, action: 'Attack', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 }, n: 4 }, faces(4, 3), 1000);
  if ('refused' in dev) throw new Error(dev.refused);
  assert.equal(dev.full.title, 'Devreux, roll 1');
  game.change(dev.apply);
  const again = resolve(game, { ...infer(), n: 5 }, faces(4, 3), 1000);
  assert.ok(!('refused' in again) && again.full.title === 'Sam, roll 2');
  const none = resolve(game, { ...infer(), n: 3, action: 'Fly' }, faces(), 1000);
  assert.deepEqual(none, { refused: 'Sam has no action “Fly”.' });
});

/** The GM's page and two players over a fake room; players hear the GM's page once `hello()` is sent. */
async function table(rng = faces()) {
  const room = new FakeRoom(), { clock, advance } = fakeClock();
  const names: Record<string, string> = { 'b-dana': 'Dana', 'b-ann': 'Ann' };
  const pages = new Map<string, { game: Game; rolls: Rolls }>();
  let gmLink: ReturnType<FakeRoom['link']> | undefined;
  for (const tab of ['gm', 'dana', 'ann']) {
    const sealer = await Sealer.make(), link = room.link({ tab, browser: `b-${tab}`, sealKey: sealer.pub });
    if (tab === 'gm') gmLink = link;
    const game = tab === 'gm' ? scene() : new Game();
    const rolls = new Rolls({ game, sealer, clock, rng, link, session: memoryStorage(), gm: tab === 'gm', gmBrowser: 'b-gm',
      whoIs: from => names[from.browser] ?? null });
    pages.set(tab, { game, rolls });
    room.watch(() => rolls.idle());
  }
  const tape = (tab: string) => ((pages.get(tab)!.game.get('tape') as Tape | undefined)?.receipts ?? []);
  const hello = async () => { gmLink!.send('hello', {}); await room.settle(); };
  const page = (tab: string) => pages.get(tab)!;
  return { room, page, tape, advance, hello };
}

/** A request, with the room settling under it. */
async function ask(t: Awaited<ReturnType<typeof table>>, intent: Omit<Intent, 'n'>) {
  const asked = t.page('dana').rolls.request(intent);
  await t.room.settle();
  return asked;
}

test('a roll at the table', async () => {
  const t = await table(faces(4, 3));
  assert.equal(await ask(t, infer()), "Nobody can roll: the GM isn't at the table.");
  await t.hello();

  assert.equal(await ask(t, infer()), null);
  const intent = t.room.log.find(m => m.kind === 'intent')!.body as Record<string, unknown>;
  assert.deepEqual(Object.keys(intent).sort(), ['action', 'defend', 'hand', 'n', 'pool', 'vs'], 'names, never numbers');
  const [mine] = t.tape('dana'), [annSees] = t.tape('ann'), [gmSees] = t.tape('gm');
  assert.deepEqual([mine!.influence, mine!.vs, mine!.row, mine!.ok], [10, 'Devreux', 'White + 1', true]);
  assert.deepEqual([annSees!.influence, annSees!.row, annSees!.vs, annSees!.by], [undefined, undefined, 'Devreux', 'Dana']);
  assert.deepEqual([gmSees!.influence, gmSees!.vs], [10, 'Devreux (mental 6), Difference +4']);

  assert.equal(await ask(t, { ...infer(), pool: BEAUFORD }), "Beauford isn't yours to roll.");

  // R103: once the GM's page has gone, nobody can roll, and the page says so at once.
  t.page('dana').rolls.left('gm');
  assert.equal(await ask(t, infer()), "Nobody can roll: the GM isn't at the table.");
  await t.hello();

  t.room.online('gm', false);
  const lost = t.page('dana').rolls.request(infer());
  await t.room.settle();
  t.advance(WAIT_MS);
  assert.equal(await lost, "The GM's page didn't answer that roll.");
});

test('CRIT', async () => {
  const t = await table(faces(6, 5, 6, 5));
  await t.hello();
  const gmGame = t.page('gm').game;
  const crits = () => gmGame.all().map(([, r]) => r).filter((r): r is Influence => 'kind' in r && r.kind === 'influence' && r.crit);

  assert.equal(await ask(t, infer()), null);
  const first = t.tape('dana')[0]!;
  assert.ok(first.crit && first.crit.chosen === (first.crit.max >= first.crit.dbl ? 'max' : 'dbl'), 'the larger chosen');
  assert.deepEqual(crits().map(c => [c.name, c.points, c.where, c.home]), [['CRIT!', 2, 'drawer', SAM]]);
  assert.equal(await ask(t, infer()), null);
  assert.deepEqual(crits().map(c => c.points), [4], 'a second CRIT strengthens it');

  const other = first.crit!.chosen === 'max' ? 'dbl' : 'max';
  t.page('ann').rolls.crit(first.id, other, true);
  await t.room.settle();
  assert.equal(t.tape('gm').find(x => x.id === first.id)!.crit!.chosen, first.crit!.chosen, "not Ann's to switch");
  t.page('dana').rolls.crit(first.id, other, true);
  await t.room.settle();
  for (const tab of ['gm', 'dana', 'ann']) {
    const r = t.tape(tab).find(x => x.id === first.id)!;
    assert.deepEqual([r.crit!.chosen, r.crit!.locked], [other, true], tab);
  }
  t.page('dana').rolls.crit(first.id, first.crit!.chosen, true);
  await t.room.settle();
  assert.equal(t.tape('ann').find(x => x.id === first.id)!.crit!.chosen, other, 'locked stays');
});

test('private rolls and gaps', async () => {
  const t = await table();
  const gm = t.page('gm').rolls;
  const devreux = { pool: DEVREUX, action: 'Attack', vs: null, defend: 'mental' as const, hand: { yellows: 0, bonus: 0 } };

  assert.equal(gm.roll(devreux, true), null);
  await t.room.settle();
  assert.equal(t.tape('gm')[0]!.priv, true);
  assert.ok(!t.room.log.some(m => m.kind === 'roll'), 'a private roll sends nothing');

  gm.roll(devreux);
  await t.room.settle();
  let n = 0;
  t.room.drop = m => m.kind === 'roll' && ++n === 1;
  gm.roll(devreux); gm.roll(devreux);
  await t.room.settle();
  assert.equal(t.tape('ann')[1]!.title, "1 roll from the GM didn't arrive");
  t.room.drop = m => m.kind === 'roll';
  for (let i = 0; i < 22; i++) gm.roll(devreux);
  await t.room.settle();
  t.room.drop = () => false;
  gm.roll(devreux);
  await t.room.settle();
  assert.equal(t.tape('ann')[1]!.title, "Many rolls from the GM didn't arrive");
});

test('a receipt in the book\'s words', () => {
  // R279: each row's range (nearer zero first below zero), the book's name, and its dice.
  assert.deepEqual(ADV.map(rowWords), [
    '+10 or more Outclass: automatic success', '+7 to +9 Strong Advantage: Green + 1', '+5 to +6 Advantage: Green',
    '+3 to +4 Weak Advantage: White + 1', '−2 to +2 No Advantage: White', '−3 to −4 Weak Disadvantage: White − 1',
    '−5 to −6 Disadvantage: Red', '−7 to −9 Strong Disadvantage: Red − 1', '−10 or less Outclassed: automatic failure']);
  const d = (c: Die['c'], v: number, dropped = false, added = false): Die => ({ c, v, dropped, added });
  const dice = [d('W', 2), d('B', 6), d('Y', 4, true), d('Y', 3, false, true)];
  assert.equal(levelWords(dice, 2, false), '6 + 3 + 2 bonus');
  assert.equal(levelWords(dice, -1, false), '6 + 3 − 1 bonus');
  assert.equal(levelWords(dice, 2, true), '6 + 3', 'the bonus is ignored on a Failure');
  assert.deepEqual([outcomeWords('success', 12), outcomeWords('cost', 5), outcomeWords('failure', 3)],
    ['Success 12, Major', 'Success at cost 5, Significant', 'Failure 3, Minor Stagger']);
});

test('a roll with no action, and a note', () => {
  // R69: the row as set, its hand the dice, no Total Influence; R281: why not, as a note.
  const game = scene();
  const r = resolve(game, { pool: SAM, action: '', vs: null, defend: 'mental', hand: { yellows: 2, bonus: 1 }, n: 1, row: 'green' }, faces(4, 2, 3, 5, 1), 1000);
  if ('refused' in r) throw new Error(r.refused);
  assert.deepEqual([r.full.title, r.full.action, r.full.influence, r.full.dice.filter(d => d.c === 'Y').length, r.full.row],
    ['Sam, roll 1', undefined, undefined, 2, '+5 to +6 Advantage: Green']);
  assert.equal(r.full.level, '3 + 5 + 1 + 1 bonus');
});

test('why not, on the tape', async () => {
  // R281: a refusal or an unanswered roll prints as a short note with the time.
  const game = scene(), { clock } = fakeClock();
  const rolls = new Rolls({ game, sealer: await Sealer.make(), clock, rng: faces(), link: null, session: memoryStorage(), gm: true });
  rolls.note("The GM's page didn't answer that roll.");
  const [n] = (game.get('tape') as Tape).receipts;
  assert.deepEqual([n!.title, n!.outcome, n!.at], ["The GM's page didn't answer that roll.", 'missing', clock.now()]);
});
