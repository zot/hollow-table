// CRC: crc-Rolls.md | Seq: seq-roll.md#1, seq-roll.md#1.2, seq-roll.md#1.3, seq-roll.md#1.4, seq-roll.md#1.5, seq-roll.md#1.6, seq-roll.md#1.7, seq-roll.md#1.8, seq-roll.md#2 | R97, R98, R100, R101, R102, R103, R104, R105, R106, R107, R108, R278, R279, R69, R281
// Rolling at a table. Every roll resolves on the GM's page, which holds everything: a player's Roll
// sends a request that names things, never numbers, and the GM's page looks the numbers up, rolls by
// the book (Hollow Folks, IV. Dice & Resolution) and sends the result. Each page prints on its own
// tape what its person may know.

import type { Game, Writer } from '../model/game.ts';
import { GM, PLAYER_OIDS, isPiece, oidOf, ridOf, type Character, type Die, type Influence, type Meta, type Oid, type Receipt, type Tape } from '../model/records.ts';
import { roll as rollDice, levelName, type Rng } from '../rules/dice.ts';
import { ADV, bonus, opposition, row as rowFor, total, type Row } from '../rules/odds.ts';
import { pools, type Item } from '../rules/pool.ts';
import { action as readAction, defend as readDefend } from '../rules/readmarks.ts';
import { canSee, type Viewer } from '../rules/visibility.ts';
import { marks, parse } from '../text/marks.ts';
import type { Clock, KeyValue } from '../store/gamestore.ts';
import { sealedRoll } from './envelope.ts';
import type { Link, Peer } from './link.ts';
import type { Box, Sealer } from './seal.ts';

export const WAIT_MS = 10_000;
/** More missed rolls than this print as "Many". */
export const MANY = 20;

/** What a player's Roll asks for: names only (R100). */
export type Intent = {
  n: number; pool: Oid; action: string; vs: Oid | null; defend: 'mental' | 'psych';
  hand: { yellows: number; bonus: number }; row?: string;
};
export type RollMsg = { n: number; receipt: Receipt; sealed: Record<string, Box> };
export type SealedRoll = { re: number; receipt: Receipt };

const OUTCOME = { success: 'Success', cost: 'Success at cost', failure: 'Failure' } as const;
const signed = (n: number) => n >= 0 ? `+${n}` : `−${-n}`;
const DIE_NAME = { G: 'Green', R: 'Red' } as const;

// R279: a receipt's lines in the book's words (Hollow Folks, IV. Dice & Resolution).
/** A row in full: its range, the book's name, and its dice: "+7 to +9 Strong Advantage: Green + 1". */
export function rowWords(r: Row): string {
  const i = ADV.indexOf(r), above = ADV[i - 1];
  let range: string;
  if (r.auto === 'success') range = `${signed(r.min)} or more`;
  else if (r.auto === 'failure') range = `${signed(above!.min - 1)} or less`;
  else {
    // As the book writes them: the end nearer zero first below zero ("−5 to −6"), else low to high.
    const hi = above!.min - 1;
    range = hi < 0 ? `${signed(hi)} to ${signed(r.min)}` : `${signed(r.min)} to ${signed(hi)}`;
  }
  return `${range} ${r.words}: ${r.auto ? `automatic ${r.auto}` : diceOnly(r)}`;
}

/** How the White was read: "higher of White 4 and Green 6 + 1", or the automatic row. */
export function resolutionWords(r: Row, dice: readonly Die[]): string {
  if (r.auto) return `${r.words}: automatic ${r.auto}`;
  const w = dice.find(d => d.c === 'W')!.v, o = dice.find(d => d.c === 'G' || d.c === 'R');
  let read = `White ${w}`;
  if (o) read = `${o.c === 'G' ? 'higher' : 'lower'} of White ${w} and ${DIE_NAME[o.c as 'G' | 'R']} ${o.v}`;
  return read + (r.mod ? ` ${r.mod > 0 ? '+' : '−'} 1` : '');
}

/** What the result adds up: the Blue and remaining Yellows, and the bonus unless a Failure. */
export function levelWords(dice: readonly Die[], bonus: number, failure: boolean): string {
  const parts = dice.filter(d => (d.c === 'B' || d.c === 'Y') && !d.dropped).map(d => String(d.v));
  const b = failure || !bonus ? '' : ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} bonus`;
  return parts.join(' + ') + b;
}

/** "Success 12, Major", "Success at cost 5, Significant", "Failure 3, Minor Stagger". */
export function outcomeWords(outcome: keyof typeof OUTCOME, result: number): string {
  return `${OUTCOME[outcome]} ${result}, ${levelName(result)}${outcome === 'failure' ? ' Stagger' : ''}`;
}

/** A row as its dice, never its range: what a roller who can't see the opponent is told (R106). */
export function diceOnly(r: Row): string {
  if (r.auto) return r.auto === 'success' ? '✓' : '✗';
  const die = r.die ? DIE_NAME[r.die] : 'White';
  return r.mod ? `${die} ${r.mod > 0 ? '+' : '−'} 1` : die;
}

/** A free GM oid, under the players' range. */
function mint(game: Game): Oid {
  let top = 0;
  for (const [rid] of game.all()) {
    if (!isPiece(rid)) continue;
    const n = parseInt(oidOf(rid), 16);
    if (n < PLAYER_OIDS) top = Math.max(top, n);
  }
  return (top + 1).toString(16).padStart(8, '0');
}

export type Resolved = {
  /** The GM's receipt: everything. */
  full: Receipt;
  /** The roller's: their numbers, and `vs` as they may see it. */
  roller: Receipt;
  /** Everyone else's: no Total Influence, base or Difference. */
  table: Receipt;
  /** What the roll does to the game: the roll counter, used cards, a CRIT! card. */
  apply: (w: Writer) => void;
  character: Character;
};

// Seq: seq-roll.md#1.2, seq-roll.md#1.3, seq-roll.md#1.3.1, seq-roll.md#1.4, seq-roll.md#1.5 | R101
/** Pure: the roll the GM's page makes for an intent, or why not. `at` is the time to print. */
export function resolve(game: Game, intent: Intent, rng: Rng, at: number): Resolved | { refused: string } {
  const character = game.get(ridOf(intent.pool)) as Character | undefined;
  if (character?.kind !== 'character') return { refused: 'That character is not on the table.' };
  // R69: a roll with no action is the row as set: its hand is the dice, and there is no Total Influence.
  const act = intent.action ? marks(parse(character.front), 'act').map(m => readAction(m.text)).find(a => a?.label === intent.action) : null;
  if (intent.action && !act) return { refused: `${character.name} has no action “${intent.action}”.` };
  const items = game.all().map(([, r]) => r).filter((r): r is Item => 'kind' in r && (r.kind === 'chip' || r.kind === 'influence'));
  const mine = pools(character.oid, items), sum = act ? total(act.base, mine) : null;

  let opp: Character | undefined, against: number | undefined;
  if (intent.vs && sum) {
    opp = game.get(ridOf(intent.vs)) as Character | undefined;
    if (opp?.kind !== 'character') return { refused: 'That opponent is not on the table.' };
    const def = marks(parse(opp.front), 'def').map(m => readDefend(m.text)).find(d => d);
    against = opposition(def ? def[intent.defend] : 0, pools(opp.oid, items)).total;
  }
  const diff = against === undefined || !sum ? undefined : sum.total - against;
  const picked = intent.row ? ADV.find(r => r.key === intent.row) : undefined;
  const row = picked ?? (diff === undefined ? ADV.find(r => r.key === 'white')! : rowFor(diff));
  const dice = act ? bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, intent.hand)
    : { yellows: Math.max(0, intent.hand.yellows), bonus: intent.hand.bonus };
  const r = rollDice(row, dice.yellows, dice.bonus, rng);

  // R278: each character's rolls are numbered on their own.
  const meta = game.get('meta') as Meta, n = (meta.counts?.[character.oid] ?? 0) + 1;
  const by = character.owner === GM ? 'GM' : character.owner;
  const base: Receipt = {
    id: `roll-${character.oid}-${n}`, at, title: `${character.name}, roll ${n}`, by, ...(act && { action: act.label }), dice: r.dice,
    resolution: resolutionWords(row, r.dice), level: levelWords(r.dice, dice.bonus, r.outcome === 'failure'),
    outcome: outcomeWords(r.crit ? 'success' : r.outcome, r.result), ...(r.crit && { crit: r.crit }),
  };
  const vsFull = opp && `${opp.name} (${intent.defend} ${against}), Difference ${signed(diff!)}`;
  const owner: Viewer = character.owner === GM ? { name: GM, gm: true } : { name: character.owner, gm: false };
  const seesOpp = !opp || canSee(owner, opp);
  const numbers = sum && act ? { influence: sum.total, base: act.base } : {};
  const full: Receipt = { ...base, ...numbers, row: rowWords(row), ...(vsFull && { vs: vsFull }) };
  const roller: Receipt = { ...base, ...numbers, row: seesOpp ? rowWords(row) : diceOnly(row),
    ...(opp && { vs: seesOpp ? vsFull : opp.name }) };
  const table: Receipt = { ...base, ...(opp && { vs: opp.name }) };

  // Seq: seq-roll.md#1.5 | R98: the roll marks the pool's cards used; a CRIT adds or strengthens CRIT!.
  const apply = (w: Writer) => {
    w.put('meta', { ...meta, rolls: meta.rolls + 1, counts: { ...meta.counts, [character.oid]: n } });
    for (const i of items) {
      if (i.kind === 'influence' && typeof i.where === 'object' && 'slot' in i.where && i.where.slot === character.oid && !i.used) {
        w.put(ridOf(i.oid), { ...i, used: true });
      }
    }
    if (!r.crit) return;
    const had = items.find((i): i is Influence => i.kind === 'influence' && i.crit && i.home === character.oid);
    if (had) w.put(ridOf(had.oid), { ...had, points: had.points + 2 });
    else {
      const oid = mint(game);
      w.put(ridOf(oid), { kind: 'influence', oid, home: character.oid, where: 'drawer', n: 0, name: 'CRIT!', sign: 1,
        points: 2, used: false, crit: true } satisfies Influence);
    }
  };
  return { full, roller, table, apply, character };
}

/** The receipt after a CRIT choice: the chosen result and its Level. */
export function choose(r: Receipt, choice: 'max' | 'dbl', lock: boolean): Receipt {
  if (!r.crit) return r;
  const value = choice === 'max' ? r.crit.max : r.crit.dbl;
  return { ...r, outcome: outcomeWords('success', value), crit: { ...r.crit, chosen: choice, locked: lock } };
}

export type RollsWith = {
  game: Game; sealer: Sealer; clock: Clock; rng: Rng;
  /** The table's link, or null for a page with no table (it rolls for itself). */
  link: Link | null;
  /** sessionStorage: the roll counters continue across a reload. */
  session: KeyValue;
  /** The GM's page holds the game and resolves every roll. */
  gm: boolean;
  /** On a player's page: the GM's browser (the invite's `gm=`). */
  gmBrowser?: string;
  /** On the GM's page: the name a sender's browser holds (Claims), or null. */
  whoIs?: (from: Peer) => string | null;
};

type Kept = { character: Oid; n: number; full: Receipt; roller: Receipt; table: Receipt; tab?: string; sealKey?: string };

export class Rolls {
  #w: RollsWith;
  #gmPeer: Peer | undefined;
  #last = new Map<string, number>();
  #waiting = new Map<number, { done: (why: string | null) => void; timer: unknown }>();
  #kept = new Map<string, Kept>();
  #work: Promise<void> = Promise.resolve();

  constructor(w: RollsWith) {
    this.#w = w;
    const link = w.link;
    if (!link) return;
    if (w.gm) {
      link.on('intent', (body: Intent, from: Peer) => this.#intent(body, from));
      link.on('crit', (body: { id: string; choice: 'max' | 'dbl'; lock: boolean }, from: Peer) => this.#crit(body, from));
    } else {
      link.on('roll', (body: RollMsg, from: Peer) => this.#heard(body, from));
      link.on('refuse', (body: { why: string; n?: number }, from: Peer) => {
        if (from.browser !== w.gmBrowser || body.n === undefined) return;
        this.#answered(body.n, body.why);
      });
      for (const kind of ['hello', 'here'] as const) link.on(kind, (_: never, from: Peer) => { if (from.browser === w.gmBrowser) this.#gmPeer = from; });
    }
  }

  idle(): Promise<void> { return this.#work; }

  // R281: an error or a lost roll, as a short red note on this page's tape.
  note(text: string): void {
    const at = this.#w.clock.now();
    this.#print({ id: `note-${at}`, at, title: text, dice: [], resolution: '', level: '', outcome: 'missing' });
  }

  #count(key: string): number {
    let n = 0;
    try { n = Number(this.#w.session.getItem(key)) || 0; } catch { /* blocked */ }
    try { this.#w.session.setItem(key, String(n + 1)); } catch { /* blocked */ }
    return n + 1;
  }

  /** Prints on this page's own tape (R111: it never goes over the wire), newest first; a receipt
   * already there by id is replaced (a CRIT switched or locked). */
  #print(r: Receipt): void {
    const { game } = this.#w, tape = (game.get('tape') as Tape | undefined) ?? { receipts: [] };
    const at = tape.receipts.findIndex(x => x.id === r.id);
    const receipts = tape.receipts.filter(x => x.id !== r.id);
    receipts.splice(Math.max(at, 0), 0, r);
    game.change(w => w.put('tape', { receipts }));
  }

  // ---- the GM's page ----

  // R103, R104: with no table the GM's page rolls for itself; a private roll sends nothing.
  /** The GM's own roll. Returns why not, or null. */
  roll(intent: Omit<Intent, 'n'>, priv = false): string | null {
    const { game, rng, clock, link } = this.#w;
    const done = resolve(game, { ...intent, n: 0 }, rng, clock.now());
    if ('refused' in done) return done.refused;
    game.change(done.apply);
    if (priv || !link) {
      this.#print({ ...done.full, ...(priv && { priv: true }) });
      return null;
    }
    const n = this.#count('hollow.rolls.sent');
    this.#kept.set(done.full.id, { character: done.character.oid, n, full: done.full, roller: done.roller, table: done.table });
    this.#print({ ...done.full, ok: true });
    link.send('roll', { n, receipt: done.table, sealed: {} } satisfies RollMsg);
    return null;
  }

  // Seq: seq-roll.md#1.2 to seq-roll.md#1.7 | R101
  #intent(intent: Intent, from: Peer): Promise<void> {
    const { game, rng, clock, link, sealer } = this.#w;
    const who = this.#w.whoIs?.(from) ?? null;
    const c = game.get(ridOf(intent.pool)) as Character | undefined;
    const refuse = (why: string) => { link!.send('refuse', { why, n: intent.n }, from.tab); };
    if (!who) { refuse('Only someone at the table can roll.'); return this.#work; }
    if (c?.kind === 'character' && c.owner !== who) { refuse(`${c.name} isn't yours to roll.`); return this.#work; }
    const done = resolve(game, intent, rng, clock.now());
    if ('refused' in done) { refuse(done.refused); return this.#work; }
    game.change(done.apply);
    this.#print(done.full);
    const n = this.#count('hollow.rolls.sent');
    this.#kept.set(done.full.id, { character: done.character.oid, n, full: done.full, roller: done.roller, table: done.table, tab: from.tab, sealKey: from.sealKey });
    this.#work = this.#work.then(async () => {
      const box = await sealer.seal(from.sealKey, 'roll', link!.tab, from.tab, { re: intent.n, receipt: done.roller } satisfies SealedRoll);
      link!.send('roll', { n, receipt: done.table, sealed: { [from.tab]: box } } satisfies RollMsg);
    });
    return this.#work;
  }

  // Seq: seq-roll.md#2 | R97: the owner or the GM switches or locks a CRIT; every tape updates.
  #crit(body: { id: string; choice: 'max' | 'dbl'; lock: boolean }, from: Peer | null): Promise<void> {
    const k = this.#kept.get(body.id), { game, link, sealer } = this.#w;
    if (!k || k.full.crit?.locked) return this.#work;
    const c = game.get(ridOf(k.character)) as Character | undefined;
    if (from && (!c || c.owner !== this.#w.whoIs?.(from))) return this.#work;
    k.full = choose(k.full, body.choice, body.lock);
    k.roller = choose(k.roller, body.choice, body.lock);
    k.table = choose(k.table, body.choice, body.lock);
    this.#print(k.full);
    if (!link) return this.#work;
    this.#work = this.#work.then(async () => {
      const sealed = k.tab && k.sealKey
        ? { [k.tab]: await sealer.seal(k.sealKey, 'roll', link.tab, k.tab, { re: 0, receipt: k.roller } satisfies SealedRoll) } : {};
      link.send('roll', { n: k.n, receipt: k.table, sealed } satisfies RollMsg);
    });
    return this.#work;
  }

  // ---- a player's page ----

  // Seq: seq-roll.md#1, seq-roll.md#1.1 | R100, R102, R103
  /** A player's Roll: resolves with null when the GM's page answered with the roll, else why not. */
  request(intent: Omit<Intent, 'n'>): Promise<string | null> {
    const { link, clock } = this.#w;
    if (!link || !this.#gmPeer) return Promise.resolve("Nobody can roll: the GM isn't at the table.");
    const n = this.#count('hollow.rolls.asked');
    return new Promise(done => {
      const timer = clock.setTimeout(() => this.#answered(n, "The GM's page didn't answer that roll."), WAIT_MS);
      this.#waiting.set(n, { done, timer });
      link.send('intent', { ...intent, n } satisfies Intent, this.#gmPeer!.tab);
    });
  }

  #answered(n: number, why: string | null): void {
    const w = this.#waiting.get(n);
    if (!w) return;
    this.#waiting.delete(n);
    this.#w.clock.clearTimeout(w.timer);
    w.done(why);
  }

  /** Switch or lock a CRIT: the GM's page applies it; on the GM's page, at once. */
  crit(id: string, choice: 'max' | 'dbl', lock: boolean): void {
    if (this.#w.gm) { void this.#crit({ id, choice, lock }, null); return; }
    if (this.#gmPeer) this.#w.link?.send('crit', { id, choice, lock }, this.#gmPeer.tab);
  }

  // Seq: seq-roll.md#1.8 | R106, R107, R108
  #heard(msg: RollMsg, from: Peer): Promise<void> {
    if (from.browser !== this.#w.gmBrowser) return this.#work;
    this.#gmPeer = from;
    const last = this.#last.get(from.tab);
    if (last === undefined || msg.n > last) {
      const missed = last === undefined ? 0 : msg.n - last - 1;
      if (missed > 0) {
        const count = missed > MANY ? 'Many' : String(missed);
        this.#print({ id: `missed-${from.tab}-${msg.n}`, at: this.#w.clock.now(), title: `${count} roll${missed === 1 ? '' : 's'} from the GM didn't arrive`,
          dice: [], resolution: '', level: '', outcome: 'missing' });
      }
      this.#last.set(from.tab, msg.n);
    }
    const tab = this.#w.link!.tab, box = msg.sealed[tab];
    this.#work = this.#work.then(async () => {
      const mine = box ? await this.#w.sealer.open(from.sealKey, 'roll', from.tab, tab, box) : undefined;
      if (sealedRoll(mine)) {
        const m = mine as SealedRoll;
        this.#print({ ...m.receipt, ok: true });
        this.#answered(m.re, null);
      } else this.#print(msg.receipt);
    });
    return this.#work;
  }
}

