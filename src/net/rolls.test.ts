// CRC: crc-Rolls.md | Test: test-Rolls.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../model/game.ts';
import { WORLD, damageSlots, ridOf, type Rows, type Character, type Connections, type Opinion, type Roller, type Chip, type Influence, type Meta, type Receipt, type Tape } from '../model/records.ts';
import { pages, waitsIn } from '../rules/absorb.ts';
import { Rolls, choose, diceOnly, levelWords, outcomeWords, resolve, rowWords, WAIT_MS, type Intent } from './rolls.ts';
import { ADV } from '../rules/odds.ts';
import { seed, tableOf } from '../rules/connections.ts';
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
  ({ pool: SAM, action: 'Infer', type: 'infer', vs, defend: 'mental', hand: { yellows: 0, bonus: 0 } });

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
  const dev = resolve(game, { pool: DEVREUX, action: '', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 }, n: 4 }, faces(4, 3), 1000);
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

/** R372, R375: the GM aims the character's roll row on the GM's page, as the intent names it. */
function gmAims(t: Awaited<ReturnType<typeof table>>, intent: Omit<Intent, 'n'>) {
  const game = t.page('gm').game, rows = (game.get('rows') as Rows | undefined)?.rows ?? {};
  game.change(w => w.put('rows', { rows: { ...rows, [intent.pool]: { pool: intent.pool, action: intent.action, opponent: intent.vs,
    defend: intent.defend, row: null, byHand: false, hand: intent.hand, ...(intent.against && { against: intent.against }) } } }));
}

/** A request, the GM having aimed it, with the room settling under it. */
async function ask(t: Awaited<ReturnType<typeof table>>, intent: Omit<Intent, 'n'>) {
  gmAims(t, intent);
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
  assert.deepEqual(Object.keys(intent).sort(), ['action', 'defend', 'hand', 'n', 'pool', 'type', 'vs'], 'names, never numbers');
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
  const beau: Omit<Intent, 'n'> = { pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental',
    vs: SAM, defend: 'psych', hand: { yellows: 0, bonus: 0 } };
  gmAims(t, beau);
  const asked = t.page('ann').rolls.request(beau);
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
  assert.equal(waitsIn(sam(), w!.damage, w!.row)!.name, '', "not Dana's to name");
  t.page('ann').rolls.name(r.id, w!.damage, w!.row, 'Suspicious');
  await t.room.settle();
  const named = waitsIn(sam(), w!.damage, w!.row)!;
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
  assert.ok(waitsIn(sam(), w.damage, w.row)!.naming, 'taken by a fresh page');
  await page().name(r.id, w.damage, w.row, 'Suspicious');
  assert.equal(waitsIn(sam(), w.damage, w.row)!.name, 'Suspicious', 'named by another fresh page');
});

test('private rolls and gaps', async () => {
  const t = await table();
  const gm = t.page('gm').rolls;
  const devreux = { pool: DEVREUX, action: '', vs: null, defend: 'mental' as const, hand: { yellows: 0, bonus: 0 } };

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
  // R346: a Mental Attack goes at Mental Defend, a Phys Attack at 0, whatever the intent's defend says;
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
  // R346: a `?` roll with an action doesn't roll at all.
  assert.deepEqual(atk('?', 'mental'), { refused: 'Say what this roll is first.' });
});

test('a roll with no action, and a note', () => {
  // R382: the row as set, its hand the dice, no Total Influence; R281: why not, as a note.
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
  // R326, R336, R330: the GM's page looks up what was pointed at by name on its own copy: a Defend
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
  // R337: the rolled action's attribute is the one the Skill adds: none for Shoot, Int for a knowledge roll.
  const b = game.get(ridOf(BEAUFORD)) as Character;
  game.change(w => w.put(ridOf(BEAUFORD), { ...b, front: `${b.front}\n<act>Shoot: 3, +1 (unfr, no att)</act>\n<act>Recall: 3, +1 (Int)</act>` }));
  const by = (action: string) => {
    const r = resolve(game, { ...infer(SAM), pool: BEAUFORD, action, type: 'infer', against: { skl: 'Investigation' }, n: 1 }, faces(4, 3), 1000);
    if ('refused' in r) throw new Error(r.refused);
    return r.full.vs;
  };
  assert.match(by('Shoot')!, /^Sam \(Investigation 2 → 8\), Difference/);
  assert.match(by('Recall')!, /^Sam \(Investigation 2 \+ Int 2 → 10\), Difference/);
  // A Mental Attack pointed at Psych Defend is opposed by it (the pointing wins), and still an Attack.
  const atk = resolve(game, { ...infer(SAM), pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental', against: { def: 'psych' }, n: 2 }, faces(5, 5, 5), 1000);
  assert.ok(!('refused' in atk) && atk.full.vs!.startsWith('Sam (psych 4 → 10)') && atk.full.attack?.kind === 'mental');
});

test('an overflow waits for its Conviction\'s name', async () => {
  // R339, R340: with every Bias Slot full, the Attack's Result starts Sam's Conviction, which waits on
  // the receipt for the attacker's name like a Slot, and the name goes into it.
  const game = scene(), { clock } = fakeClock(), sealer = await Sealer.make();
  const page = new Rolls({ game, sealer, clock, rng: faces(5, 5, 5, 5, 5, 5), link: null, session: memoryStorage(), gm: true });
  const sam = () => game.get(ridOf(SAM)) as Character;
  const full = damageSlots((d, r) => ({ ...sam().back.damage[d][r], ...(d === 'bias' && { name: 'shaken', boxes: [true, true, true] }) }));
  game.change(w => w.put(ridOf(SAM), { ...sam(), back: { ...sam().back, damage: full } }));
  assert.equal(page.roll({ pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Mental Atk', type: 'mental', vs: SAM,
    defend: 'mental', hand: { yellows: 0, bonus: 0 } }), null);
  const r = (game.get('tape') as Tape).receipts[0]!, [only, ...rest] = pages(sam(), 'mental', r.attack!.result);
  assert.deepEqual([rest.length, only!.overflow > 0], [0, true]);
  await page.take(r.id, only!);
  const a = (game.get('tape') as Tape).receipts[0]!.attack!;
  assert.deepEqual(a.waiting, [{ damage: 'bias', row: 'lasting' }]);
  assert.equal(sam().back.lasting?.bias?.points, only!.overflow);
  await page.name(r.id, 'bias', 'lasting', 'Cheats win');
  assert.deepEqual(sam().back.lasting?.bias, { name: 'Cheats win', points: only!.overflow, spent: 0 });
  assert.equal((game.get('tape') as Tape).receipts[0]!.attack!.waiting, undefined);
});

test('the world as opposition', () => {
  // R345: a roll with an action and no aim is refused on the GM's page.
  const game = scene();
  assert.deepEqual(resolve(game, { ...infer(null), n: 1 }, faces(4, 3), 1000), { refused: 'Aim it first.' });
  // R351: a blank tray refuses; the world is the tray's number and nothing else.
  assert.deepEqual(resolve(game, { ...infer(WORLD), n: 1 }, faces(4, 3), 1000), { refused: 'The world has no number yet.' });
  game.change(w => w.put('world', { set: true, total: 4 }));
  const r = resolve(game, { ...infer(WORLD), n: 1 }, faces(4, 3), 1000);
  if ('refused' in r) throw new Error(r.refused);
  assert.equal(r.full.vs, 'the world (4), Difference +6');
  assert.equal(r.full.row, '+5 to +6 Advantage: Green');
  // Sam is Dana's: the number is the GM's alone, so her receipt has the dice only.
  assert.deepEqual([r.roller.vs, r.roller.row, r.table.vs], ['the world', diceOnly(ADV.find(x => x.key === 'green')!), 'the world']);
  // The GM's own character sees it; an Attack at the world has nothing to take its Damage.
  const dev = resolve(game, { pool: DEVREUX, action: 'Attack', type: 'phys', vs: WORLD, defend: 'mental', hand: { yellows: 0, bonus: 0 }, n: 2 },
    faces(6, 5), 1000);
  if ('refused' in dev) throw new Error(dev.refused);
  assert.match(dev.roller.vs!, /^the world \(4\), Difference /);
  assert.match(dev.full.outcome, /^Success/);
  assert.equal(dev.full.attack, undefined);
});

test('a roll uses up the card its action suffered', () => {
  // R353: the GM's page deletes a `once` card in the roller's pool rather than marking it used; R362:
  // the Total Influence suffers it; R355: the receipt names the variant.
  const game = scene(), tricky: Influence = { kind: 'influence', oid: '000000f1', home: BEAUFORD, where: { slot: BEAUFORD, name: 'main' },
    n: 0, name: 'Tricky', sign: -1, points: 2, used: false, crit: false, once: true };
  game.change(w => w.put(ridOf(tricky.oid), tricky));
  const r = resolve(game, { pool: BEAUFORD, action: 'Tricky -Min', alt: 'Mental Atk', type: 'mental', vs: SAM, defend: 'mental',
    hand: { yellows: 0, bonus: 0 }, n: 1 }, faces(4, 3), 1000);
  if ('refused' in r) throw new Error(r.refused);
  assert.deepEqual([r.full.action, r.full.influence, r.full.base], ['Tricky -Min', 3, 5]);
  game.change(r.apply);
  assert.equal(game.get(ridOf(tricky.oid)), undefined);
});

test("a player's roll is aimed as the GM's page holds it", async () => {
  // R375: the intent's aim is not believed; with no aim held, the roll waits for one.
  const t = await table(faces(4, 3));
  await t.hello();
  const sam = t.page('gm').game.get(ridOf(SAM)) as Character;
  t.page('gm').game.change(w => w.put(ridOf(SAM), { ...sam, owner: 'Dana' }));
  await t.room.settle();
  const said = t.page('dana').rolls.request({ ...infer(DEVREUX) });
  await t.room.settle();
  assert.equal(await said, 'Aim it first.');
  // Aimed at Beauford on the GM's page, a request naming Devreux still rolls against Beauford.
  gmAims(t, infer(BEAUFORD));
  const asked = t.page('dana').rolls.request({ ...infer(DEVREUX) });
  await t.room.settle();
  assert.equal(await asked, null);
  assert.match(t.tape('gm')[0]!.vs!, /^Beauford/);
});

/** R429: a seeded Connection Table, Devreux's record of Sam waiting for its Reaction, and Sam's row calling it. */
function reacting(game: Game) {
  const t = seed('0000000e', { x: 0, y: 0, z: 0, tilt: 0 }, DEVREUX), dev = t.rows.find(r => r.oid === DEVREUX)!.id;
  const rec: Opinion = { kind: 'opinion', oid: '0000000f', holder: dev, of: SAM, text: 'Reaction ?\nProfessional Respect (Tact) +Min' };
  const row: Roller = { pool: SAM, action: '', opponent: null, defend: 'mental', row: null, byHand: false, hand: { yellows: 1, bonus: 0 }, reaction: DEVREUX };
  game.change(w => { w.put(ridOf(t.oid), t); w.put(ridOf(rec.oid), rec); w.put('rows', { rows: { [SAM]: row } }); });
  return { rec, cell: `${dev}>${SAM}` };
}
const plain: Omit<Intent, 'n'> = { pool: SAM, action: '', vs: null, defend: 'mental', hand: { yellows: 1, bonus: 0 } };

test('a Reaction roll', async () => {
  // R430, R431: one White d6 on the Default Reaction table, written on the record, the same receipt everywhere.
  const game = new Game();
  game.load(playtest('Dana', 'Ann'));
  const { rec, cell } = reacting(game);
  const r = resolve(game, { ...plain, n: 1, reaction: DEVREUX }, faces(5), 1000);
  if ('refused' in r) throw new Error(r.refused);
  assert.deepEqual(r.full.dice.map(d => [d.c, d.v]), [['W', 5]]);
  for (const x of [r.full, r.roller, r.table]) {
    assert.deepEqual([x.title, x.resolution, x.outcome], ['Sam, roll 1', 'White 5 on the Default Reaction table', "Devreux's Reaction: +Min"]);
  }
  game.change(r.apply);
  assert.equal((game.get(ridOf(rec.oid)) as Opinion).text, 'Reaction +Min\nProfessional Respect (Tact) +Min');
  const all = game.all().map(([, x]) => x as Connections);
  assert.equal(tableOf(all)!.cells[cell], 1);
  assert.equal((game.get('rows') as Rows).rows[SAM], undefined, 'the row goes away');
  assert.deepEqual((game.get('meta') as Meta).counts, { [SAM]: 1 });
  const again = resolve(game, { ...plain, n: 2, reaction: DEVREUX }, faces(5), 1000);
  assert.deepEqual(again, { refused: 'Devreux has no Reaction to roll for Sam.' });

  // A player's Reaction is the one the GM's page holds: Dana's request names none.
  const t = await table(faces(5));
  await t.hello();
  const gm = t.page('gm').game, sam = gm.get(ridOf(SAM)) as Character;
  gm.change(w => w.put(ridOf(SAM), { ...sam, owner: 'Dana' }));
  reacting(gm);
  await t.room.settle();
  const asked = t.page('dana').rolls.request(plain);
  await t.room.settle();
  assert.equal(await asked, null);
  assert.equal(t.tape('gm')[0]!.outcome, "Devreux's Reaction: +Min");
  assert.equal(t.tape('dana')[0]!.outcome, "Devreux's Reaction: +Min");
});

test('a Request transfers a Resource', async () => {
  // R439, R441: a successful Request at Devreux offers a transfer at its Success Level; the GM makes it once.
  const req = (vs: string): Omit<Intent, 'n'> =>
    ({ pool: BEAUFORD, action: 'Mental Atk / Req', alt: 'Req', type: 'request', vs, defend: 'mental', hand: { yellows: 0, bonus: 0 } });
  const t = await table(faces(4, 6, 5, 2, 4, 6, 5, 2));
  await t.hello();
  const gm = t.page('gm'), dev = gm.game.get(ridOf(DEVREUX)) as Character;
  gm.game.change(w => w.put(ridOf(DEVREUX), { ...dev, front: dev.front.replace('Money +Sig', 'Money +Ext') }));
  assert.equal(gm.rolls.roll(req(DEVREUX)), null);
  await t.room.settle();
  const r = t.tape('gm')[0]!, sl = r.transfer!.sl;
  assert.ok(sl >= 2, `a success of at least Sig, for Beauford's Min to rise (sl ${sl})`);
  assert.deepEqual([r.transfer!.target, r.transfer!.name], [DEVREUX, 'Devreux']);
  assert.deepEqual(gm.rolls.givable(r.id), ['Saloon Gossip', 'Money']);
  await gm.rolls.transfer(r.id, 'Money');
  await t.room.settle();
  const money = (oid: string) => /<res>Money ([^<]*)<\/res>/.exec((gm.game.get(ridOf(oid)) as Character).front)![1];
  const LEVELS = ['0', '+Min', '+Sig', '+Maj', '+Ext', '+Exq'], moved = Math.min(sl - 1, 4);
  assert.deepEqual([money(BEAUFORD), money(DEVREUX)], [LEVELS[1 + moved], LEVELS[4 - moved]]);
  for (const tab of ['gm', 'ann']) assert.deepEqual(t.tape(tab)[0]!.transfer!.done, { resource: 'Money', moved, extra: sl - 1 - moved }, tab);
  // Once only: not even another Resource the first left givable.
  const before = (gm.game.get(ridOf(BEAUFORD)) as Character).front;
  await gm.rolls.transfer(r.id, 'Saloon Gossip');
  assert.equal((gm.game.get(ridOf(BEAUFORD)) as Character).front, before);
  assert.deepEqual(gm.rolls.givable(r.id), []);
  // No transfer for a Failure, nor at a PC.
  const failed = resolve(gm.game, { ...req(DEVREUX), n: 9 }, faces(1, 1), 1000);
  assert.ok(!('refused' in failed) && !failed.full.transfer);
  const atSam = resolve(gm.game, { ...req(SAM), n: 9 }, faces(4, 6, 5, 2), 1000);
  assert.ok(!('refused' in atSam) && !atSam.full.transfer);
});

test('a page that comes late gets what hangs on the GM\'s tape, as the table saw it', async () => {
  // R465, R466: two rolls; then Eve's page joins with an empty tape, asks once, and gets both as Ann saw them.
  const t = await table(faces(4, 3, 5, 2));
  await t.hello();
  assert.equal(await ask(t, infer()), null);
  assert.equal(await ask(t, infer()), null);
  const late = async (tab: string) => {
    const sealer = await Sealer.make(), link = t.room.link({ tab, browser: `b-${tab}`, sealKey: sealer.pub }), game = new Game();
    const rolls = new Rolls({ game, sealer, clock: fakeClock().clock, rng: faces(), link, session: memoryStorage(), gm: false, gmBrowser: 'b-gm',
      whoIs: () => null });
    t.room.watch(() => rolls.idle());
    await t.hello();
    return ((game.get('tape') as Tape | undefined)?.receipts ?? []);
  };
  const eve = await late('eve');
  assert.deepEqual(eve, t.tape('ann'), "Eve's tape is Ann's: the table's view, newest first");
  assert.equal(eve.length, 2);
  // The GM tears the tape: a later page gets nothing of it.
  t.page('gm').game.change(w => w.put('tape', { receipts: [] }));
  assert.deepEqual(await late('fay'), []);
});
