// CRC: crc-Authority.md | Seq: seq-sync.md#1.1, seq-sync.md#1.2, seq-sync.md#1.3, seq-sync.md#1.4, seq-sync.md#1.5, seq-sync.md#1.6, seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7 | R170, R174, R175, R176, R185, R186, R188, R191, R192, R193, R300
// The GM's page as the game's keeper. After each change it sends what changed: every piece as
// someone who owns nothing sees it, and, sealed to each player's tab, the pieces that tab sees
// differently. It judges every change a player sends, takes what it may, and answers the rest with
// its own version.

import { same, type Game } from '../model/game.ts';
import { TOMBS, isPiece, type Book, type Character, type PieceRecord, type Rec, type Rid, type Yards } from '../model/records.ts';
import { mayChange } from '../rules/ownership.ts';
import { redact, type Characters, type Viewer } from '../rules/visibility.ts';
import { why, whoIs } from './claims.ts';
import { editBody } from './envelope.ts';
import type { Link, Peer } from './link.ts';
import type { Box, Sealer } from './seal.ts';
import type { Stamps } from './stamps.ts';

/** A record as sent: its stamp (`by` is the page whose number it is; the sender's when absent). */
export type Put = { rid: Rid; s: number; by?: string; rec: Rec };
export type Del = { rid: Rid; s: number; by?: string };
export type Batch = { g: number; full: boolean; puts: Put[]; dels: Del[]; sealed: Record<string, Box> };
/** What a tab's sealed box holds. */
export type Sealed = { g: number; puts: Put[] };
/** A player's change, as it is sealed to the GM's page: `base` is the version of the copy it was made on. */
export type Edit = { s: number; base: number; puts: { rid: Rid; rec: Rec }[]; dels: Rid[] };

/** Each page's own, never sent: the GM's book, and every page's tape. */
export const LOCAL = new Set<Rid>(['book', 'tape']);

type Tab = { name: string; browser: string; sealKey: string; holds: Map<Rid, Rec> };
type Stamp = { s: number; by?: string };

/** Just the stamp, with no `by` key when it's the sender's own. */
const stampOf = (o: Stamp): Stamp => o.by === undefined ? { s: o.s } : { s: o.s, by: o.by };
const kindOf = (r: Rec | undefined) => r && 'kind' in r ? r.kind : undefined;
const characters = (game: Game): Characters => oid => game.get(`o:${oid}`) as Character | undefined;
const seen = (rec: Rec, viewer: Viewer, chars: Characters) => same(redact(rec, viewer, chars), rec);

// R191: Boot Hill from a player: what they can only see redacted is put back as the GM has it; if they
// left out something they couldn't read, the change is refused (a burial would lose it).
function mergeYards(real: Yards | undefined, mine: Yards, viewer: Viewer, chars: Characters): Yards | null {
  const truth = new Map<string, Rec>(), secret = new Set<string>();
  for (const g of real?.yards ?? []) for (const b of g.items) for (const r of b.records) {
    truth.set(r.oid, r);
    if (!seen(r, viewer, chars)) secret.add(r.oid);
  }
  const kept = new Set<string>();
  const yards = mine.yards.map(g => ({ ...g, items: g.items.map(b => ({ ...b, records: b.records.map(r => {
    if (!secret.has(r.oid)) return r;
    kept.add(r.oid);
    return truth.get(r.oid) as typeof r;
  }) })) }));
  return [...secret].every(o => kept.has(o)) ? { yards } : null;
}

// Seq: seq-edit.md#1.4, seq-edit.md#1.4.1, seq-edit.md#1.4.2, seq-edit.md#1.4.3
/**
 * Pure: what of a player's change to take, and what to refuse. `who` is the name the sender's
 * browser holds (null: nobody). Refused: everything from nobody; everything, when it touches Boot
 * Hill from a copy that missed a later change to it; a piece Ownership says they may not change; a
 * piece they can only see redacted, before or after; a piece put back that was deleted after their
 * copy was made.
 */
export function judge(game: Game, edit: Edit, who: string | null): { puts: { rid: Rid; rec: Rec }[]; dels: Rid[]; refused: Rid[] } {
  const all = [...edit.puts.map(p => p.rid), ...edit.dels].filter(rid => rid !== 'meta' && !LOCAL.has(rid));
  const book = game.get('book') as Book, chars = characters(game);
  if (!who) return { puts: [], dels: [], refused: all };                                   // R167
  if (edit.puts.some(p => p.rid === 'yards') && edit.base < (book.hillGv ?? 0)) return { puts: [], dels: [], refused: all };
  const viewer: Viewer = { name: who, gm: false };
  const mine = (old: Rec | undefined, rec: Rec | undefined) => {
    if (old && !seen(old, viewer, chars)) return false;                                     // R186
    if (rec && !seen(rec, viewer, chars)) return false;
    const c = (r: Rec | undefined) => r && 'kind' in r && r.kind === 'character' ? r : undefined;
    return !c(old) && !c(rec) ? true : mayChange(viewer, c(old), c(rec));                   // R148
  };
  const puts: { rid: Rid; rec: Rec }[] = [], dels: Rid[] = [], refused: Rid[] = [];
  for (const rid of edit.dels) {
    if (!all.includes(rid)) continue;
    if (isPiece(rid) && mine(game.get(rid), undefined)) dels.push(rid); else refused.push(rid);
  }
  for (const { rid, rec } of edit.puts) {
    if (!all.includes(rid)) continue;
    if (rid === 'yards') {
      const merged = mergeYards(game.get('yards') as Yards | undefined, rec as Yards, viewer, chars);
      if (merged) puts.push({ rid, rec: merged }); else refused.push(rid);
    } else if (!isPiece(rid) || (book.tomb[rid] ?? 0) > edit.base) refused.push(rid);       // R192
    else if (mine(game.get(rid), rec)) puts.push({ rid, rec });
    else refused.push(rid);
  }
  return { puts, dels, refused };
}

export type AuthorityWith = {
  game: Game; stamps: Stamps; sealer: Sealer; link: Link;
  /** Runs `fn` after the change in hand (queueMicrotask on the page), so one change is one batch. */
  schedule: (fn: () => void) => void;
};

export class Authority {
  #w: AuthorityWith;
  /** What went out to everyone: the view for nobody. */
  #public = new Map<Rid, Rec>();
  #tabs = new Map<string, Tab>();
  /** A change taken from a player keeps their stamp for the batch that answers it. */
  #origin = new Map<Rid, Stamp & { fresh: boolean }>();
  #answerDel = new Set<Rid>();
  #pending = new Set<Rid>();
  #flushing = false;
  #work: Promise<void> = Promise.resolve();

  constructor(w: AuthorityWith) {
    this.#w = w;
    w.game.listen(rids => this.#queue(rids));
    w.link.on('sync', (_: never, from: Peer) => { this.#catchUp(from.tab); });
    w.link.on('edit', (body: { box: Box }, from: Peer) => this.#edit(body.box, from));
    w.link.on('bye', (_: never, from: Peer) => { this.#tabs.delete(from.tab); });
  }

  /** Everything sent or being sent has gone (for tests and orderly shutdown). */
  idle(): Promise<void> { return this.#work; }

  // Seq: seq-join.md#1.9, seq-join.md#1.10 | R166, R167
  /** A player's tab said who it is (Presence's `here`). Nobody is told why, privately. */
  join(tab: string, name: string, browser: string, sealKey: string): string | null {
    const who = whoIs(this.#w.game, name, browser);
    this.#tabs.set(tab, { name, browser, sealKey, holds: new Map() });
    if (!who) this.#w.link.send('claim', { name, why: why(name) }, tab);
    return who;
  }

  /** The name a tab plays as, if its browser holds it. */
  #viewer(t: Tab): Viewer {
    const held = (this.#w.game.get('book') as Book).claims[t.name];
    return held === t.browser ? { name: t.name, gm: false } : null;
  }

  // R193: secrets follow ownership; a character changing hands re-checks everything.
  /** Re-sends to each tab whatever it now sees differently (after a hand-over, say). */
  recheck(): void { this.#queue(new Set(this.#w.game.all().map(([rid]) => rid))); }

  // R168, R296: after the GM hands a name over, the new holder gets its secrets, and every page of
  // that name hears whether it holds it: `why` for the one that doesn't, null for the holder.
  /** Tells the pages playing as `name` where the name now is. */
  handedOver(name: string): void {
    this.recheck();
    for (const [tab, t] of this.#tabs) if (t.name === name) this.#w.link.send('claim', { name, why: this.#viewer(t) ? null : why(name) }, tab);
  }

  #queue(rids: Iterable<Rid>): void {
    for (const rid of rids) this.#pending.add(rid);
    if (this.#flushing) return;
    this.#flushing = true;
    const { schedule } = this.#w;   // called detached, so a native like queueMicrotask works as given
    schedule(() => { this.#flushing = false; this.#out(); });
  }

  #stamp(rid: Rid): Stamp {
    const o = this.#origin.get(rid);
    if (o?.fresh) { o.fresh = false; return stampOf(o); }
    const mine = { s: this.#w.stamps.next() };                       // R176: a deletion takes a fresh number too
    this.#origin.set(rid, { ...mine, fresh: false });
    return mine;
  }

  /** The stamp a piece already went out under, for a catch-up. */
  #current(rid: Rid): Stamp {
    const o = this.#origin.get(rid);
    return o ? stampOf(o) : this.#stamp(rid);
  }

  // Seq: seq-sync.md#1.1 to seq-sync.md#1.6 | R170, R174, R175, R185, R188
  #out(): void {
    const { game } = this.#w, chars = characters(game);
    let rids = [...this.#pending].filter(rid => !LOCAL.has(rid));
    this.#pending.clear();
    // R193: a character changing (its owner, say) can change who sees its cards: check everything.
    if (rids.some(rid => kindOf(game.get(rid)) === 'character' || kindOf(this.#public.get(rid)) === 'character')) {
      rids = [...game.all().map(([rid]) => rid).filter(rid => !LOCAL.has(rid)), ...rids.filter(rid => !game.get(rid))];
    }
    const puts: Put[] = [], dels: Del[] = [], sealFor = new Map<string, Put[]>();
    const gone: Rid[] = [];
    for (const rid of new Set([...rids, ...this.#answerDel])) {
      const rec = game.get(rid);
      if (!rec) {
        if (!this.#public.has(rid) && !this.#answerDel.has(rid)) continue;
        this.#public.delete(rid);
        for (const t of this.#tabs.values()) t.holds.delete(rid);
        dels.push({ rid, ...this.#stamp(rid) });
        gone.push(rid);
        continue;
      }
      const pv = redact(rec, null, chars), changed = !same(this.#public.get(rid), pv);
      let stamp: Stamp | undefined;
      const stampOnce = () => stamp ??= this.#stamp(rid);
      if (changed) { this.#public.set(rid, pv); puts.push({ rid, ...stampOnce(), rec: pv }); }
      for (const [tab, t] of this.#tabs) {
        const tv = redact(rec, this.#viewer(t), chars), holds = changed ? pv : t.holds.get(rid);
        t.holds.set(rid, tv);
        if (!same(tv, holds)) {
          const f = sealFor.get(tab) ?? [];
          f.push({ rid, ...stampOnce(), rec: tv });
          sealFor.set(tab, f);
        }
      }
    }
    this.#answerDel.clear();
    if (!puts.length && !dels.length && !sealFor.size) return;
    // R188, R192: the table's version moves with every batch; deletions are remembered by it.
    const book = game.get('book') as Book, g = book.gv + 1;
    const tomb = { ...book.tomb };
    for (const rid of gone) if (isPiece(rid)) tomb[rid] = g;
    for (const p of puts) delete tomb[p.rid];
    const keys = Object.keys(tomb);
    if (keys.length > TOMBS) for (const k of keys.sort((a, b) => tomb[a]! - tomb[b]!).slice(0, keys.length - TOMBS)) delete tomb[k];
    const hill = puts.some(p => p.rid === 'yards') ? { hillGv: g } : {};
    game.change(w => w.put('book', { ...book, gv: g, tomb, ...hill }));
    this.#send({ g, full: false, puts, dels }, sealFor);
  }

  #send(batch: Omit<Batch, 'sealed'>, sealFor: Map<string, Put[]>, to?: string): void {
    const { link, sealer } = this.#w;
    this.#work = this.#work.then(async () => {
      const sealed: Record<string, Box> = {};
      for (const [tab, puts] of sealFor) {
        const t = this.#tabs.get(tab);
        if (t) sealed[tab] = await sealer.seal(t.sealKey, 'recs', link.tab, tab, { g: batch.g, puts } satisfies Sealed);
      }
      link.send('recs', { ...batch, sealed } satisfies Batch, to);
    });
  }

  // Seq: seq-join.md#1.12 | R171: the whole table to one tab, at the current version without moving it.
  #catchUp(tab: string): void {
    const t = this.#tabs.get(tab);
    if (!t) return;
    const { game } = this.#w, chars = characters(game), viewer = this.#viewer(t);
    const puts: Put[] = [], mine: Put[] = [];
    t.holds.clear();
    for (const [rid, rec] of game.all()) {
      if (LOCAL.has(rid)) continue;
      const stamp = this.#current(rid), pv = redact(rec, null, chars), tv = redact(rec, viewer, chars);
      puts.push({ rid, ...stamp, rec: pv });
      // R188, R192: what a catch-up sends has gone out, so its deletion is sent and tombed. A record
      // already out keeps what went out, so a change not yet sent still reaches the other tabs.
      if (!this.#public.has(rid)) this.#public.set(rid, pv);
      if (!same(tv, pv)) mine.push({ rid, ...stamp, rec: tv });
      t.holds.set(rid, tv);
    }
    const g = (game.get('book') as Book).gv;
    this.#send({ g, full: true, puts, dels: [] }, mine.length ? new Map([[tab, mine]]) : new Map(), tab);
    if (!viewer) this.#w.link.send('claim', { name: t.name, why: why(t.name) }, tab);
  }

  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7 | R172, R173
  #edit(box: Box, from: Peer): Promise<void> {
    this.#work = this.#work.then(async () => {
      const t = this.#tabs.get(from.tab);
      if (!t || t.browser !== from.browser) return;
      const opened = await this.#w.sealer.open(from.sealKey, 'edit', from.tab, this.#w.link.tab, box);
      if (editBody(opened)) this.#take(opened as Edit, from.tab);
    });
    return this.#work;
  }

  // R300: a move saves nothing; this page shows a player's carry only of what it would take from
  // them, unchanged (a nobody's, or another's piece, isn't shown). The drop's change is judged.
  /** Whether this page shows `tab`'s move of `rid`. */
  mayMove(tab: string, rid: Rid): boolean {
    const t = this.#tabs.get(tab), r = this.#w.game.get(rid) as PieceRecord | undefined;
    if (!t || !r) return false;
    const gv = (this.#w.game.get('book') as Book).gv;
    return judge(this.#w.game, { s: 0, base: gv, puts: [{ rid, rec: r }], dels: [] }, this.#viewer(t)?.name ?? null).refused.length === 0;
  }

  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7: judge, take what's allowed, answer the rest.
  #take(edit: Edit, tab: string): void {
    const t = this.#tabs.get(tab), { game, stamps } = this.#w;
    if (!t) return;
    const fresh = (rid: Rid) => stamps.fresh(rid, tab, edit.s);
    const current = { ...edit, puts: edit.puts.filter(p => fresh(p.rid)), dels: edit.dels.filter(fresh) };
    const verdict = judge(game, current, this.#viewer(t)?.name ?? null);
    for (const rid of [...current.puts.map(p => p.rid), ...current.dels]) stamps.mark(rid, tab, edit.s);
    const theirs = (rid: Rid) => { this.#origin.set(rid, { s: edit.s, by: tab, fresh: true }); };
    const answer = (rid: Rid) => {
      theirs(rid);
      this.#public.delete(rid);
      for (const x of this.#tabs.values()) x.holds.delete(rid);
      if (!game.get(rid)) this.#answerDel.add(rid);
    };
    const taken = [...verdict.puts.map(p => p.rid), ...verdict.dels];
    for (const rid of taken) theirs(rid);
    const changed = game.change(w => {
      for (const p of verdict.puts) w.put(p.rid, p.rec);
      for (const rid of verdict.dels) w.del(rid);
    });
    // Seq: seq-edit.md#1.7: every piece is answered, taken, refused, or changing nothing.
    const unchanged = taken.filter(rid => !changed.has(rid));
    for (const rid of unchanged) answer(rid);
    for (const rid of verdict.refused) answer(rid);
    this.#queue([...verdict.refused, ...unchanged]);
  }
}
