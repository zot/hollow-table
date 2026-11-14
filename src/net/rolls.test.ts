// CRC: crc-Rolls.md | Test: test-Rolls.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { ridOf, type Character, type Chip, type Influence, type Meta, type Receipt, type Tape } from '../model/records.ts';
import { pages } from '../rules/absorb.ts';
import { Rolls, choose, levelWords, outcomeWords, resolve, rowWords, WAIT_MS, type Intent } from './rolls.ts';
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
  // R317: the receipt in the book's words.
  assert.deepEqual(pick(r.full), [10, 4, '+3 to +4 Weak Advantage: White + 1', 'Devreux (mental 6), Difference +4']);
  assert.deepEqual([r.full.title, r.full.action, r.full.resolution, r.full.level, r.full.outcome, r.full.by],
    ['Sam, roll 1', 'Infer', 'White 4 + 1', '3 + 2 bonus', 'Success +Sig', 'Dana']);
  assert.equal(r.full.attack, undefined, 'R308: only an Attack gives its target anything');
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

test('taking an Attack, and naming it', async () => {
  // R308, R312–R314: Ann's Beauford attacks Dana's Sam; only Dana (or the GM) takes it, by one of the
  // GM's own pages, once; only Ann (or the GM) names the Slot it leaves waiting.
  const t = await table(faces(5, 5, 5, 5, 5, 5));
  await t.hello();
  const sam = () => t.page('gm').game.get(ridOf(SAM)) as Character;
  const before = sam();
  const asked = t.page('ann').rolls.request({ pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental',
    vs: SAM, defend: 'psych', hand: { yellows: 0, bonus: 0 } });
  await t.room.settle();
  assert.equal(await asked, null);
  const r = t.tape('dana')[0]!, a = r.attack!;
  assert.deepEqual([a.target, a.kind, a.taken], [SAM, 'mental', undefined]);
  const [page] = pages(before, 'mental', a.result);

  t.page('ann').rolls.take(r.id, page!);
  await t.room.settle();
  assert.deepEqual(sam().back, before.back, "not Ann's to take");
  t.page('dana').rolls.take(r.id, { use: { mild: 9, min: 0, sig: 0, maj: 0 }, overflow: 0 });
  await t.room.settle();
  assert.deepEqual(sam().back, before.back, 'a page the GM did not offer');

  t.page('dana').rolls.take(r.id, page!);
  await t.room.settle();
  const after = sam();
  assert.notDeepEqual(after.back, before.back, 'taken');
  const taken = t.tape('ann').find(x => x.id === r.id)!.attack!;
  assert.equal(taken.taken, true);
  assert.ok(taken.waiting?.length, 'its named Slots wait for names');
  // A page that still fits the card as it is now, so only "already taken" can refuse it.
  t.page('dana').rolls.take(r.id, pages(after, 'mental', a.result)[0]!);
  await t.room.settle();
  assert.deepEqual(sam().back, after.back, 'taken once');

  const [w] = taken.waiting!;
  t.page('dana').rolls.name(r.id, w!.damage, w!.row, 'Suspicious');
  await t.room.settle();
  assert.equal(sam().back.damage[w!.damage][w!.row].name, '', "not Dana's to name");
  t.page('ann').rolls.name(r.id, w!.damage, w!.row, 'Suspicious');
  await t.room.settle();
  const named = sam().back.damage[w!.damage][w!.row];
  assert.deepEqual([named.name, named.naming], ['Suspicious', undefined]);
  for (const tab of ['gm', 'dana', 'ann']) {
    assert.ok(!t.tape(tab).find(x => x.id === r.id)!.attack!.waiting?.some(x => x.row === w!.row), tab);
  }
});

test('a kept roll survives a reload', async () => {
  // R308, R313: the GM's page keeps its rolls in its book, so a take and a name still work on a page
  // made afresh on the same game (a reload).
  const game = scene(), { clock } = fakeClock(), sealer = await Sealer.make();
  const page = () => new Rolls({ game, sealer, clock, rng: faces(5, 5, 5, 5, 5, 5), link: null, session: memoryStorage(), gm: true });
  assert.equal(page().roll({ pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental', vs: SAM,
    defend: 'mental', hand: { yellows: 0, bonus: 0 } }), null);
  const r = (game.get('tape') as Tape).receipts[0]!, a = r.attack!;
  const sam = () => game.get(ridOf(SAM)) as Character;
  const [first] = pages(sam(), 'mental', a.result);
  await page().take(r.id, first!);
  const w = (game.get('tape') as Tape).receipts[0]!.attack!.waiting![0]!;
  assert.ok(sam().back.damage[w.damage][w.row].naming, 'taken by a fresh page');
  await page().name(r.id, w.damage, w.row, 'Suspicious');
  assert.equal(sam().back.damage[w.damage][w.row].name, 'Suspicious', 'named by another fresh page');
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
  // R317: each row's range (nearer zero first below zero), the book's name, and its dice.
  assert.deepEqual(ADV.map(rowWords), [
    '+10 or more Outclass: automatic success', '+7 to +9 Strong Advantage: Green + 1', '+5 to +6 Advantage: Green',
    '+3 to +4 Weak Advantage: White + 1', '−2 to +2 No Advantage: White', '−3 to −4 Weak Disadvantage: White − 1',
    '−5 to −6 Disadvantage: Red', '−7 to −9 Strong Disadvantage: Red − 1', '−10 or less Outclassed: automatic failure']);
  const d = (c: Die['c'], v: number, dropped = false, added = false): Die => ({ c, v, dropped, added });
  const dice = [d('W', 2), d('B', 6), d('Y', 4, true), d('Y', 3, false, true)];
  assert.equal(levelWords(dice, 2, false), '6 + 3 + 2 bonus');
  assert.equal(levelWords(dice, -1, false), '6 + 3 − 1 bonus');
  assert.equal(levelWords(dice, 2, true), '6 + 3', 'the bonus is ignored on a Failure');
  // R317: the outcome with its Level, signed; only a successful Attack gives its amount.
  assert.deepEqual([outcomeWords('success', 12), outcomeWords('cost', 5), outcomeWords('failure', 7), outcomeWords('success', 0)],
    ['Success +Maj', 'Success at cost +Sig', 'Failure −Sig', 'Success +0']);
  assert.deepEqual([outcomeWords('success', 10, true), outcomeWords('cost', 4, true), outcomeWords('failure', 7, true)],
    ['Success 10', 'Success at cost 4', 'Failure −Sig']);
});

test('an Attack', () => {
  // R306: a Mental Attack goes at Mental Defend, a Phys Attack at 0, whatever the intent's defend says;
  // R307: its kind in the vs line; R308: a success gives the target its Result; R316: the alternative clicked.
  const game = scene();
  const atk = (type: Intent['type'], defend: Intent['defend']) =>
    resolve(game, { pool: SAM, action: 'Mental Atk / Req', alt: 'Mental Atk', vs: DEVREUX, defend, hand: { yellows: 0, bonus: 0 }, type, n: 1 }, faces(4, 3), 1000);
  const mental = atk('mental', 'psych'), phys = atk('phys', 'mental');
  if ('refused' in mental || 'refused' in phys) throw new Error('refused');
  assert.match(mental.full.vs!, /^Devreux \(mental \d+\)/);
  assert.match(phys.full.vs!, /^Devreux \(physical \d+\)/);
  assert.equal(mental.full.action, 'Mental Atk');
  assert.ok(Number(/\((?:mental|physical) (\d+)\)/.exec(phys.full.vs!)![1]) < Number(/\(mental (\d+)\)/.exec(mental.full.vs!)![1]),
    'a Phys Attack is opposed by less than Mental Defend');
  for (const r of [mental.full, mental.roller, mental.table]) {
    assert.deepEqual(r.attack && { ...r.attack, result: 0 }, { target: DEVREUX, name: 'Devreux', from: 'Sam', kind: 'mental', result: 0 });
  }
  assert.match(mental.full.outcome, /^Success( at cost)? \d+$/);
  // A `?` roll is no Attack.
  const unsaid = atk('?', 'mental');
  assert.ok(!('refused' in unsaid) && unsaid.full.attack === undefined && unsaid.full.action === 'Mental Atk');
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

test("a CRIT's choice moves an Attack's amount", () => {
  // R308, R317: switching a CRIT changes the Result the target takes, until it is taken.
  const r: Receipt = { id: 'x', at: 0, title: 'Beauford, roll 1', dice: [], resolution: '', level: '6 + 5', outcome: 'Success 12',
    crit: { max: 12, dbl: 22, chosen: 'max', locked: false },
    attack: { target: SAM, name: 'Sam', from: 'Beauford', kind: 'mental', result: 12 } };
  const dbl = choose(r, 'dbl', false);
  assert.deepEqual([dbl.attack!.result, dbl.outcome], [22, 'Success 22']);
  const taken = choose({ ...r, attack: { ...r.attack!, taken: true } }, 'dbl', false);
  assert.equal(taken.attack!.result, 12, 'a taken Attack keeps what was taken');
});

test('pointing at the opposition', () => {
  // R326, R327, R330: the GM's page looks up what was pointed at by name on its own copy: a Defend
  // number, an action's Base, a Skill (Level + Cha); a name it can't find falls back to Defend (R328).
  // (Sam has a +6 chip in his Main here, so each total is 6 more than its base.)
  const game = scene();
  const at = (against: Intent['against'], type: Intent['type'] = 'infer') => {
    const r = resolve(game, { ...infer(SAM), pool: BEAUFORD, action: 'Infer', type, against, n: 1 }, faces(4, 3), 1000);
    if ('refused' in r) throw new Error(r.refused);
    return r.full.vs;
  };
  assert.match(at({ def: 'psych' })!, /^Sam \(psych 4 → 10\), Difference/);
  assert.match(at({ act: 'Shoot' })!, /^Sam \(Shoot 4 → 10\), Difference/);
  assert.match(at({ skl: 'Investigation' })!, /^Sam \(Investigation 2 \+ Cha 2 → 10\), Difference/);
  assert.match(at({ skl: 'Flying' })!, /^Sam \(mental 8\), Difference/, 'a name not on the card: Defend');
  // A Mental Attack pointed at Psych Defend is opposed by it (the pointing wins), and still an Attack.
  const atk = resolve(game, { ...infer(SAM), pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental', against: { def: 'psych' }, n: 2 }, faces(5, 5, 5), 1000);
  assert.ok(!('refused' in atk) && atk.full.vs!.startsWith('Sam (psych 4 → 10)') && atk.full.attack?.kind === 'mental');
});
