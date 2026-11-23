// CRC: crc-Rolls.md | Seq: seq-roll.md#1, seq-roll.md#1.2, seq-roll.md#1.3, seq-roll.md#1.4, seq-roll.md#1.5, seq-roll.md#1.6, seq-roll.md#1.7, seq-roll.md#1.8, seq-roll.md#2 | R97, R98, R100, R101, R102, R103, R104, R105, R106, R107, R108, R278, R317, R382, R281, R346, R307, R308, R316, R345, R351, R353, R375, R430, R431, R439, R441, R490, R491
// Rolling at a table. Every roll resolves on the GM's page, which holds everything: a player's Roll
// sends a request that names things, never numbers, and the GM's page looks the numbers up, rolls by
// the book (Hollow Folks, IV. Dice & Resolution) and sends the result. Each page prints on its own
// tape what its person may know.

import type { Game, Writer } from '../model/game.ts';
import { GM, KEPT, PLAYER_OIDS, ROWS, WORLD, isAttack, isPiece, newestRoll, oidOf, ridOf, type Attack, type Book, type Character, type KeptRoll, type Damage, type NameRow, type Die, type Influence, type Meta, type Oid, type Opinion, type Opponent, type PieceRecord, type Receipt, type RollType, type Rows, type Tape, type World } from '../model/records.ts';
import { d6, roll as rollDice, levelName, type Rng } from '../rules/dice.ts';
import { awaits, level, reacted, reactionOf, recordOf, synced, tableOf } from '../rules/connections.ts';
import { givable, transfer as give } from '../rules/request.ts';
import { ADV, bonus, opposition, row as rowFor, total, type Row } from '../rules/odds.ts';
import { pools, type Item } from '../rules/pool.ts';
import { COLUMN_OF, fill, pages, same, waitsIn, type Page } from '../rules/absorb.ts';
import { action as readAction, defend as readDefend, pointed, type Against } from '../rules/readmarks.ts';
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
  n: number; pool: Oid; action: string; vs: Opponent | null; defend: 'mental' | 'psych';
  hand: { yellows: number; bonus: number }; row?: string;
  /** R319: what the roll is; absent from an older page, which counts as `?`. */
  type?: RollType;
  /** R316: the alternative of a `/` label that was clicked, which names the action. */
  alt?: string;
  /** R326, R336: what was pointed at on the opponent's card, by name; the number is looked up here. */
  against?: Against;
  /** R429: a Reaction roll from this NPC's card; on the GM's page, only as its own row holds it. */
  reaction?: Oid;
};
export type RollMsg = { n: number; receipt: Receipt; sealed: Record<string, Box> };
export type SealedRoll = { re: number; receipt: Receipt };

const OUTCOME = { success: 'Success', cost: 'Success at cost', failure: 'Failure' } as const;
const signed = (n: number) => n >= 0 ? `+${n}` : `−${-n}`;
const DIE_NAME = { G: 'Green', R: 'Red' } as const;

// R317: a receipt's lines in the book's words (Hollow Folks, IV. Dice & Resolution).
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

const SHORT: Record<string, string> = { Minor: 'Min', Significant: 'Sig', Major: 'Maj', Extreme: 'Ext', Exquisite: 'Exq' };
/** R439: a result's Success Level, Min 1 to Exq 5; 0 for no noticeable effect. */
const slOf = (result: number): number => Object.keys(SHORT).indexOf(levelName(result)) + 1;

// R317: the outcome with its Level, signed: + for a Success, − for the Stagger a Failure causes; only a
// successful Attack gives its amount, since only an Attack's Result is absorbed as Damage.
/** "Success +Maj", "Success at cost +Sig", "Failure −Sig"; a successful Attack, "Success 10". */
export function outcomeWords(outcome: keyof typeof OUTCOME, result: number, attack = false): string {
  if (attack && outcome !== 'failure') return `${OUTCOME[outcome]} ${result}`;
  return `${OUTCOME[outcome]} ${outcome === 'failure' ? '−' : '+'}${SHORT[levelName(result)] ?? '0'}`;
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
  if (intent.reaction) return reaction(game, intent.reaction, character, rng, at);
  // R382: a roll with no action is the row as set: its hand is the dice, and there is no Total Influence.
  const act = intent.action ? marks(parse(character.front), 'act').map(m => readAction(m.text)).find(a => a?.label === intent.action) : null;
  if (intent.action && !act) return { refused: `${character.name} has no action “${intent.action}”.` };
  const items = game.all().map(([, r]) => r).filter((r): r is Item => 'kind' in r && (r.kind === 'chip' || r.kind === 'influence'));
  const mine = pools(character.oid, items), sum = act ? total(act.base, mine) : null;

  const type = intent.type ?? '?';
  // R345, R346: a roll with an action says what it is and is aimed; the GM's page holds to it.
  if (act && type === '?') return { refused: 'Say what this roll is first.' };
  if (act && !intent.vs) return { refused: 'Aim it first.' };
  const kind = isAttack(type) ? type : intent.defend;
  let opp: Character | undefined, world: World | undefined, against: number | undefined, point: ReturnType<typeof pointed> = null;
  if (intent.vs === WORLD && sum) {
    // R351: the world's number in the GM's own tray, nothing added; refused while it is blank.
    world = game.get('world') as World | undefined;
    if (!world?.set) return { refused: 'The world has no number yet.' };
    against = world.total;
  } else if (intent.vs && sum) {
    opp = game.get(ridOf(intent.vs)) as Character | undefined;
    if (opp?.kind !== 'character') return { refused: 'That opponent is not on the table.' };
    const def = marks(parse(opp.front), 'def').map(m => readDefend(m.text)).find(d => d);
    // R326, R336, R330: a number, Field or Skill pointed at is the base, looked up on the GM's own copy;
    // R337: a Field or Skill adds the target's attribute the rolled action uses.
    // else (R328) an Attack goes at its own Defend, a Phys Attack at 0; the GM's page decides, not the intent.
    point = intent.against ? pointed(opp.front, intent.against, act!.att) : null;
    let base: number;
    if (point) base = point.base;
    else if (kind === 'phys' || !def) base = 0;
    else base = def[kind];
    against = opposition(base, pools(opp.oid, items)).total;
  }
  const diff = against === undefined || !sum ? undefined : sum.total - against;
  const picked = intent.row ? ADV.find(r => r.key === intent.row) : undefined;
  const row = picked ?? (diff === undefined ? ADV.find(r => r.key === 'white')! : rowFor(diff));
  const dice = act ? bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, intent.hand)
    : { yellows: Math.max(0, intent.hand.yellows), bonus: intent.hand.bonus };
  const r = rollDice(row, dice.yellows, dice.bonus, rng);

  // R278: each character's rolls are numbered on their own.
  const meta = game.get('meta') as Meta, n = (meta.counts?.[character.oid] ?? 0) + 1;
  const by = character.owner === GM ? 'GM' : character.owner, outcome = r.crit ? 'success' : r.outcome;
  // R308: an Attack that succeeds against a character gives its target the Result to absorb; R351: the
  // world has nothing to take it.
  const attack = isAttack(type) && opp && outcome !== 'failure'
    ? { attack: { target: opp.oid, name: opp.name, from: character.name, kind: type, result: r.result } } : {};
  // R439: a Request that succeeds against an NPC offers a transfer at its Success Level.
  const sl = slOf(r.result);
  const transfer = type === 'request' && opp?.owner === GM && outcome !== 'failure' && sl
    ? { transfer: { target: opp.oid, name: opp.name, sl } } : {};
  const id = `roll-${character.oid}-${n}`;
  const base: Receipt = {
    id, at, title: `${character.name}, roll ${n}`, by, ...(act && { action: alternative(act.label, intent.alt) }), dice: r.dice,
    resolution: resolutionWords(row, r.dice), level: levelWords(r.dice, dice.bonus, r.outcome === 'failure'),
    outcome: outcomeWords(outcome, r.result, isAttack(type)), ...(r.crit && { crit: r.crit }), ...attack, ...transfer,
  };
  // R307: an Attack's kind in the `vs` line.
  // R326, R336: what was pointed at names itself: (Shoot 4), (Investigation 2 + Cha 2), and its total when pools move it.
  let opposed: string;
  if (world) opposed = String(against);
  else if (point) opposed = point.words + (against !== point.base ? ` → ${against}` : '');
  else opposed = `${kind === 'phys' ? 'physical' : kind} ${against}`;
  // R351: the world reads "the world (4)", its number seen only where the owner is the GM.
  const vsName = world ? 'the world' : opp?.name;
  const vsFull = vsName && `${vsName} (${opposed}), Difference ${signed(diff!)}`;
  const owner: Viewer = character.owner === GM ? { name: GM, gm: true } : { name: character.owner, gm: false };
  const seesOpp = world ? owner.gm : !opp || canSee(owner, opp);
  const numbers = sum && act ? { influence: sum.total, base: act.base } : {};
  const full: Receipt = { ...base, ...numbers, row: rowWords(row), ...(vsFull && { vs: vsFull }) };
  const roller: Receipt = { ...base, ...numbers, row: seesOpp ? rowWords(row) : diceOnly(row),
    ...(vsName && { vs: seesOpp ? vsFull : vsName }) };
  const table: Receipt = { ...base, ...(vsName && { vs: vsName }) };

  // Seq: seq-roll.md#1.5 | R98: the roll marks the pool's cards used; a CRIT adds or strengthens CRIT!.
  const apply = (w: Writer) => {
    w.put('meta', { ...meta, rolls: meta.rolls + 1, counts: { ...meta.counts, [character.oid]: n } });
    for (const i of items) {
      if (i.kind === 'influence' && typeof i.where === 'object' && 'slot' in i.where && i.where.slot === character.oid && !i.used) {
        // R353: a card an action put there for its own roll is used up by it.
        if (i.once) w.del(ridOf(i.oid));
        else w.put(ridOf(i.oid), { ...i, used: true });
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

// R430, R431: a Reaction is one White d6 on the Default Reaction table, written on the NPC's record of
// the character, its cell following; everyone's receipt is the same, and the row goes away.
/** Pure: the Reaction the GM's page rolls for `character` from the NPC's card `npcOid`, or why not. */
function reaction(game: Game, npcOid: Oid, character: Character, rng: Rng, at: number): Resolved | { refused: string } {
  const all = game.all().map(([, r]) => r as PieceRecord), t = tableOf(all), npc = game.get(ridOf(npcOid)) as Character | undefined;
  if (npc?.kind !== 'character') return { refused: 'That NPC is not on the table.' };
  const rec = t && recordOf(all.filter((r): r is Opinion => r.kind === 'opinion'), t, npc, character.oid);
  if (!t || !rec || !awaits(rec.text)) return { refused: `${npc.name} has no Reaction to roll for ${character.name}.` };
  const v = d6(rng), n = reactionOf(v);
  const meta = game.get('meta') as Meta, k = (meta.counts?.[character.oid] ?? 0) + 1;
  const receipt: Receipt = {
    id: `roll-${character.oid}-${k}`, at, title: `${character.name}, roll ${k}`, by: character.owner === GM ? 'GM' : character.owner,
    dice: [{ c: 'W', v, added: false, dropped: false }], resolution: `White ${v} on the Default Reaction table`, level: '',
    outcome: `${npc.name}'s Reaction: ${level(n)}`,
  };
  const apply = (w: Writer) => {
    w.put('meta', { ...meta, rolls: meta.rolls + 1, counts: { ...meta.counts, [character.oid]: k } });
    const now = { ...rec, text: reacted(rec.text, n) };
    w.put(ridOf(rec.oid), now);
    w.put(ridOf(t.oid), synced(t, now));
    const { [character.oid]: _, ...rows } = (game.get('rows') as Rows | undefined)?.rows ?? {};
    w.put('rows', { rows });
  };
  return { full: receipt, roller: receipt, table: receipt, apply, character };
}

/** The receipt after a CRIT choice: the chosen result and its Level; an Attack's amount follows it. */
export function choose(r: Receipt, choice: 'max' | 'dbl', lock: boolean): Receipt {
  if (!r.crit) return r;
  const value = choice === 'max' ? r.crit.max : r.crit.dbl;
  return { ...r, outcome: outcomeWords('success', value, !!r.attack), crit: { ...r.crit, chosen: choice, locked: lock },
    ...(r.attack && !r.attack.taken && { attack: { ...r.attack, result: value } }),
    ...(r.transfer && !r.transfer.done && { transfer: { ...r.transfer, sl: slOf(value) } }) };
}

// R316: `Mental Atk / Req` is two actions with the same numbers; the one clicked names the roll.
/** The action's name: the clicked alternative of its label when there is one, else the label. */
export function alternative(label: string, alt: string | undefined): string {
  const alts = label.split('/').map(a => a.trim());
  return alt && alts.includes(alt) ? alt : label;
}

export type TakeMsg = { id: string; page: Page };
export type NameMsg = { id: string; damage: Damage; row: NameRow; name: string };

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

type Kept = KeptRoll;

export class Rolls {
  #w: RollsWith;
  #gmPeer: Peer | undefined;
  #last = new Map<string, number>();
  #waiting = new Map<number, { done: (why: string | null) => void; timer: unknown }>();
  #work: Promise<void> = Promise.resolve();

  constructor(w: RollsWith) {
    this.#w = w;
    const link = w.link;
    if (!link) return;
    if (w.gm) {
      link.on('intent', (body: Intent, from: Peer) => this.#intent(body, from));
      link.on('crit', (body: { id: string; choice: 'max' | 'dbl'; lock: boolean }, from: Peer) => this.#crit(body, from));
      link.on('take', (body: TakeMsg, from: Peer) => this.#take(body, from));
      link.on('name', (body: NameMsg, from: Peer) => this.#name(body, from));
      link.on('tape', (body: { receipts?: Receipt[] }, from: Peer) => { if (!body.receipts) this.#history(from.tab); });
    } else {
      link.on('roll', (body: RollMsg, from: Peer) => this.#heard(body, from));
      link.on('refuse', (body: { why: string; n?: number }, from: Peer) => {
        if (from.browser !== w.gmBrowser || body.n === undefined) return;
        this.#answered(body.n, body.why);
      });
      for (const kind of ['hello', 'here'] as const) link.on(kind, (_: never, from: Peer) => {
        if (from.browser !== w.gmBrowser) return;
        this.#gmPeer = from;
        // R490: a page arriving asks once each load for what hangs on the GM's tape.
        if (this.#askedTape) return;
        this.#askedTape = true;
        link.send('tape', {}, from.tab);
      });
      link.on('tape', (body: { receipts?: Receipt[] }, from: Peer) => { if (from.browser === w.gmBrowser && body.receipts) this.#hung(body.receipts); });
    }
  }

  #askedTape = false;

  /** This page's tape, newest first. */
  #tape(): Receipt[] { return (this.#w.game.get('tape') as Tape | undefined)?.receipts ?? []; }

  // R490: the table's view of each roll on the GM's own tape, newest first, from its
  // kept rolls: a private roll, or one no longer kept, is left out.
  #history(tab: string): void {
    const kept = (this.#w.game.get('book') as Book | undefined)?.kept ?? [];
    const receipts = this.#tape().flatMap(r => { const k = kept.find(x => x.full.id === r.id); return k && !k.priv ? [k.table] : []; });
    this.#w.link!.send('tape', { receipts }, tab);
  }

  // R490, R491: of what hangs on the GM's tape, only the rolls newer than the newest this tape has held, each
  // once, merged in by when they were rolled: a new copy takes all, a page back takes what it missed, and
  // what it tore stays torn.
  #hung(receipts: Receipt[]): void {
    const tape = this.#w.game.get('tape') as Tape | undefined, mine = tape?.receipts ?? [], have = new Set(mine.map(r => r.id));
    const newest = newestRoll(tape), missed = receipts.filter(r => r.at > newest && !have.has(r.id));
    if (!missed.length) return;
    const all = [...mine, ...missed].sort((a, b) => b.at - a.at);
    this.#w.game.change(w => w.put('tape', { ...tape, receipts: all }));
  }

  idle(): Promise<void> { return this.#work; }

  // R308, R313: kept rolls live in the GM's own book (never sent), so a take or a name still works
  // after the GM's page reloads.
  /** The kept roll by its receipt's id. */
  #kept(id: string): Kept | undefined {
    const k = ((this.#w.game.get('book') as Book | undefined)?.kept ?? []).find(x => x.full.id === id);
    return k && { ...k };   // a copy: the record itself changes only through #keep
  }
  /** Keeps a roll (replacing it by id), the newest KEPT. */
  #keep(k: Kept): void {
    const { game } = this.#w, book = (game.get('book') as Book | undefined) ?? { claims: {}, gv: 0, tomb: {} };
    const kept = [...(book.kept ?? []).filter(x => x.full.id !== k.full.id), k].slice(-KEPT);
    game.change(w => w.put('book', { ...book, kept }));
  }

  // R103: a page that has left (Presence) can't roll for anyone; if it was the GM's, nobody can.
  /** Told by Presence that a tab has gone. */
  left(tab: string): void { if (this.#gmPeer?.tab === tab) this.#gmPeer = undefined; }

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

  /** Prints on this page's own tape (R465: it doesn't go over the wire, but to a page come late), newest first; a receipt
   * already there by id is replaced (a CRIT switched or locked). */
  #print(r: Receipt): void {
    const { game } = this.#w, tape = (game.get('tape') as Tape | undefined) ?? { receipts: [] };
    const at = tape.receipts.findIndex(x => x.id === r.id);
    const receipts = tape.receipts.filter(x => x.id !== r.id);
    receipts.splice(Math.max(at, 0), 0, r);
    game.change(w => w.put('tape', { ...tape, receipts }));
  }

  // ---- the GM's page ----

  // R103, R104: with no table the GM's page rolls for itself; a private roll sends nothing.
  /** The GM's own roll. Returns why not, or null. */
  roll(intent: Omit<Intent, 'n'>, priv = false): string | null {
    const { game, rng, clock, link } = this.#w;
    const done = resolve(game, { ...intent, n: 0 }, rng, clock.now());
    if ('refused' in done) return done.refused;
    game.change(done.apply);
    // R308: every roll is kept, so an Attack can be taken; a private one is never sent.
    if (priv || !link) {
      const full = { ...done.full, ...(priv && { priv: true as const }) };
      this.#keep({ character: done.character.oid, n: 0, full, roller: full, table: full, priv: true });
      this.#print(full);
      return null;
    }
    const n = this.#count('hollow.rolls.sent');
    this.#keep({ character: done.character.oid, n, full: done.full, roller: done.roller, table: done.table });
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
    // R375: a player's roll is aimed as the GM's page holds its row, whatever the intent says.
    const held = (game.get('rows') as Rows | undefined)?.rows[intent.pool];
    // R430: and a Reaction only as the GM's page holds it.
    const { reaction: _asked, ...asked } = intent;
    const aimed: Intent = { ...asked, vs: held?.opponent ?? null, defend: held?.defend ?? intent.defend, against: held?.against,
      row: held?.byHand ? held.row ?? undefined : undefined, ...(held?.reaction && { reaction: held.reaction }) };
    const done = resolve(game, aimed, rng, clock.now());
    if ('refused' in done) { refuse(done.refused); return this.#work; }
    game.change(done.apply);
    this.#print(done.full);
    const n = this.#count('hollow.rolls.sent');
    this.#keep({ character: done.character.oid, n, full: done.full, roller: done.roller, table: done.table, tab: from.tab, sealKey: from.sealKey });
    this.#work = this.#work.then(async () => {
      const box = await sealer.seal(from.sealKey, 'roll', link!.tab, from.tab, { re: intent.n, receipt: done.roller } satisfies SealedRoll);
      link!.send('roll', { n, receipt: done.table, sealed: { [from.tab]: box } } satisfies RollMsg);
    });
    return this.#work;
  }

  // Seq: seq-roll.md#2 | R97: the owner or the GM switches or locks a CRIT; every tape updates.
  #crit(body: { id: string; choice: 'max' | 'dbl'; lock: boolean }, from: Peer | null): Promise<void> {
    const k = this.#kept(body.id), { game } = this.#w;
    if (!k || k.full.crit?.locked) return this.#work;
    const c = game.get(ridOf(k.character)) as Character | undefined;
    if (from && (!c || c.owner !== this.#w.whoIs?.(from))) return this.#work;
    k.full = choose(k.full, body.choice, body.lock);
    k.roller = choose(k.roller, body.choice, body.lock);
    k.table = choose(k.table, body.choice, body.lock);
    return this.#resend(k);
  }

  /** A kept roll's receipts again: on this tape, and (unless private) every tape, by id. */
  #resend(k: Kept): Promise<void> {
    const { link, sealer } = this.#w;
    this.#keep(k);
    this.#print(k.full);
    if (!link || k.priv) return this.#work;
    this.#work = this.#work.then(async () => {
      const sealed = k.tab && k.sealKey
        ? { [k.tab]: await sealer.seal(k.sealKey, 'roll', link.tab, k.tab, { re: 0, receipt: k.roller } satisfies SealedRoll) } : {};
      link.send('roll', { n: k.n, receipt: k.table, sealed } satisfies RollMsg);
    });
    return this.#work;
  }

  /** Each of a kept roll's receipts with its Attack changed by `f`. */
  #attack(k: Kept, f: (a: Attack) => Attack): void {
    for (const key of ['full', 'roller', 'table'] as const) {
      const r = k[key];
      if (r.attack) k[key] = { ...r, attack: f(r.attack) };
    }
  }

  // Seq: seq-take.md#1.4.1, seq-take.md#1.4.2, seq-take.md#1.4.3, seq-take.md#1.5 | R308, R312, R314, R340
  // The target's owner or the GM takes an Attack: refused unless it is untaken and the page is one of
  // the GM's own pages for it; then filled, marked taken, its named Slots (and a new Conviction or
  // Burden) waiting for names.
  #take(body: TakeMsg, from: Peer | null): Promise<void> {
    const { game } = this.#w, k = this.#kept(body.id), a = k?.full.attack;
    if (!k || !a || a.taken) return this.#work;
    const c = game.get(ridOf(a.target)) as Character | undefined, by = game.get(ridOf(k.character)) as Character | undefined;
    if (c?.kind !== 'character' || by?.kind !== 'character') return this.#work;
    if (from && c.owner !== this.#w.whoIs?.(from)) return this.#work;
    if (!pages(c, a.kind, a.result).some(p => same(p, body.page))) return this.#work;
    const next = fill(c, a.kind, body.page, { name: by.name, id: body.id }), d = COLUMN_OF[a.kind];
    const named = (ch: Character, r: NameRow) => waitsIn(ch, d, r)?.naming?.id === body.id;
    const waiting = [...ROWS, 'lasting' as const].filter(r => named(next, r) && !named(c, r)).map(row => ({ damage: d, row }));
    game.change(w => w.put(ridOf(c.oid), next));
    this.#attack(k, x => ({ ...x, taken: true, ...(waiting.length && { waiting }) }));
    return this.#resend(k);
  }

  // R441: the GM transfers a Resource for a successful Request: refused unless untransferred and the
  // Resource can be given between the GM's own cards; then both cards in one change, and every tape told.
  #transfer(id: string, resource: string): Promise<void> {
    const { game } = this.#w, k = this.#kept(id), t = k?.full.transfer;
    if (!k || !t || t.done) return this.#work;
    const npc = game.get(ridOf(t.target)) as Character | undefined, pc = game.get(ridOf(k.character)) as Character | undefined;
    if (npc?.kind !== 'character' || pc?.kind !== 'character') return this.#work;
    const made = give(npc, pc, resource, t.sl);
    if (!made) return this.#work;
    game.change(w => { w.put(ridOf(npc.oid), made.npc); w.put(ridOf(pc.oid), made.pc); });
    const name = givable(npc, pc, t.sl).find(n => n.toLowerCase() === resource.trim().toLowerCase()) ?? resource;
    for (const key of ['full', 'roller', 'table'] as const) {
      const r = k[key];
      if (r.transfer) k[key] = { ...r, transfer: { ...r.transfer, done: { resource: name, moved: made.moved, extra: made.extra } } };
    }
    return this.#resend(k);
  }

  // Seq: seq-take.md#2.1, seq-take.md#2.2, seq-take.md#2.3 | R313, R314, R340
  // The attacking character's owner or the GM names a Slot (or a Conviction or Burden) this Attack left waiting.
  #name(body: NameMsg, from: Peer | null): Promise<void> {
    const { game } = this.#w, k = this.#kept(body.id), a = k?.full.attack, text = body.name.trim();
    if (!k || !a || !text || !a.waiting?.some(x => x.damage === body.damage && x.row === body.row)) return this.#work;
    const by = game.get(ridOf(k.character)) as Character | undefined, c = game.get(ridOf(a.target)) as Character | undefined;
    if (by?.kind !== 'character' || c?.kind !== 'character') return this.#work;
    if (from && by.owner !== this.#w.whoIs?.(from)) return this.#work;
    const slot = waitsIn(c, body.damage, body.row);
    if (slot?.naming?.id !== body.id) return this.#work;
    const { naming: _, ...named } = { ...slot, name: text };
    const back = body.row === 'lasting'
      ? { ...c.back, lasting: { ...c.back.lasting, [body.damage]: named } }
      : { ...c.back, damage: { ...c.back.damage, [body.damage]: { ...c.back.damage[body.damage], [body.row]: named } } };
    game.change(w => w.put(ridOf(c.oid), { ...c, back }));
    this.#attack(k, x => {
      const rest = x.waiting!.filter(w => w.damage !== body.damage || w.row !== body.row);
      const { waiting: __, ...left } = x;
      return rest.length ? { ...left, waiting: rest } : left;
    });
    return this.#resend(k);
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

  /** R441: the Resources a kept Request's transfer can take, on the GM's page; none elsewhere or once done. */
  givable(id: string): string[] {
    const { game } = this.#w, k = this.#w.gm ? this.#kept(id) : undefined, t = k?.full.transfer;
    const npc = t && game.get(ridOf(t.target)) as Character | undefined, pc = k && game.get(ridOf(k.character)) as Character | undefined;
    return t && !t.done && npc?.kind === 'character' && pc?.kind === 'character' ? givable(npc, pc, t.sl) : [];
  }

  /** R441: transfer a Resource for a kept Request; the GM's page alone. */
  transfer(id: string, resource: string): Promise<void> {
    return this.#w.gm ? this.#transfer(id, resource) : this.#work;
  }

  /** Take an Attack by one of its pages (R308): the GM's page decides; on the GM's page, at once. */
  take(id: string, page: Page): Promise<void> {
    if (this.#w.gm) return this.#take({ id, page }, null);
    if (this.#gmPeer) this.#w.link?.send('take', { id, page } satisfies TakeMsg, this.#gmPeer.tab);
    return this.#work;
  }

  /** Name a Slot an Attack left waiting (R313): the GM's page writes it, even on a card the sender can't see. */
  name(id: string, damage: Damage, row: NameRow, name: string): Promise<void> {
    if (this.#w.gm) return this.#name({ id, damage, row, name }, null);
    if (this.#gmPeer) this.#w.link?.send('name', { id, damage, row, name } satisfies NameMsg, this.#gmPeer.tab);
    return this.#work;
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

