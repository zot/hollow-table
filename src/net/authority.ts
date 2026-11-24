// CRC: crc-Authority.md | Seq: seq-sync.md#1.1, seq-sync.md#1.2, seq-sync.md#1.3, seq-sync.md#1.4, seq-sync.md#1.5, seq-sync.md#1.6, seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7 | R170, R174, R175, R176, R185, R186, R188, R191, R192, R193, R300, R360, R361, R375, R383, R410, R435, R442, R486, R506, R508, R567
// The GM's page as the game's keeper. After each change it sends what changed: every piece as
// someone who owns nothing sees it, and, sealed to each player's tab, the pieces that tab sees
// differently. It judges every change a player sends, takes what it may, and answers the rest with
// its own version.

import { same, type Game } from '../model/game.ts';
import { TOMBS, isLocal, isPaper, isPiece, oidOf, type Book, type Burial, type Character, type PieceRecord, type Rec, type Rid, type Yards, type Rows } from '../model/records.ts';
import { mayChange, mayWrite, rewrites } from '../rules/ownership.ts';
import { reads, redact, type Characters, type Viewer } from '../rules/visibility.ts';
import { renameWhy, renamed, why, whoIs } from './claims.ts';
import { editBody } from './envelope.ts';
import type { Link, Peer } from './link.ts';
import type { Box, Sealer } from './seal.ts';
import type { Stamps } from './stamps.ts';

/** A record as sent: its stamp (`by` is the page whose number it is; the sender's when absent). */
export type Put = { rid: Rid; s: number; by?: string; rec: Rec };
export type Del = { rid: Rid; s: number; by?: string };
export type Batch = { g: number; full: boolean; puts: Put[]; dels: Del[]; sealed: Record<string, Box> };
/** What a tab's sealed box holds. */
// R361: `dels` takes away what only this tab stops seeing.
/** A tab's own part of a batch, before sealing. */
type Own = { puts: Put[]; dels: Del[] };
export type Sealed = { g: number; puts: Put[]; dels?: Del[] };
/** A player's change, as it is sealed to the GM's page: `base` is the version of the copy it was made on. */
export type Edit = { s: number; base: number; puts: { rid: Rid; rec: Rec }[]; dels: Rid[] };

type Tab = { name: string; browser: string; sealKey: string; holds: Map<Rid, Rec> };
type Stamp = { s: number; by?: string };

/** Just the stamp, with no `by` key when it's the sender's own. */
const stampOf = (o: Stamp): Stamp => o.by === undefined ? { s: o.s } : { s: o.s, by: o.by };
const kindOf = (r: Rec | undefined) => r && 'kind' in r ? r.kind : undefined;
const characters = (game: Game): Characters => oid => game.get(`o:${oid}`) as Character | undefined;
const seen = (rec: Rec, viewer: Viewer, chars: Characters) => same(redact(rec, viewer, chars), rec);
// R360: a player may put their own name on a chip, never another's.
const forged = (old: Rec | undefined, rec: Rec, who: string) => 'kind' in rec && rec.kind === 'chip'
  && rec.by !== undefined && rec.by !== who && rec.by !== (old && 'kind' in old && old.kind === 'chip' ? old.by : undefined);

// R506: only paper's maker says who reads it, and a player makes paper under their own name alone. A
// piece dug up from Boot Hill is judged against its buried copy.
const misread = (old: Rec | undefined, rec: Rec, who: string) => {
  if (!('kind' in rec) || !isPaper(rec)) return false;
  const was = old && 'kind' in old && isPaper(old) ? old : undefined;
  if (!was) return rec.by !== undefined && rec.by !== who;
  if (rec.by !== was.by) return true;
  return JSON.stringify(rec.to ?? null) !== JSON.stringify(was.to ?? null) && was.by !== who;
};

// R464: only the GM's page rules on a flag: a player's change may add to one (another flagged tap), but
// never drop it, drop its why, or take Levels from under it.
const ruled = (old: Rec | undefined, rec: Rec) => {
  const f = old && 'kind' in old && old.kind === 'influence' ? old.flag : undefined;
  if (!f) return false;
  const g = 'kind' in rec && rec.kind === 'influence' ? rec.flag : undefined;
  return !g || !g.why.includes(f.why) || Object.entries(f.fed ?? {}).some(([k, n]) => (g.fed?.[k] ?? 0) < n);
};

// R191: Boot Hill from a player: what they can only see redacted is put back as the GM has it; if they
// left out something they couldn't read, the change is refused (a burial would lose it). R406: a GM card
// comes back whole by its `gm` name, and one the player made up is dropped.
// R442: what lies buried is the GM's copy, and a new burial holds only the pieces this change deletes
// and the GM's page takes the deletion of (`deleted`, as the GM holds them); a burial left empty goes.
function mergeYards(real: Yards | undefined, mine: Yards, viewer: Viewer, chars: Characters, deleted: Map<string, PieceRecord>): Yards | null {
  const truth = new Map<string, Rec>(), secret = new Set<string>(), cards = new Map<string, Burial>();
  for (const g of real?.yards ?? []) for (const b of g.items) {
    if (b.gm) { cards.set(b.gm, b); if (!viewer?.gm) secret.add(b.gm); }
    for (const r of b.records) {
      truth.set(r.oid, r);
      if (!seen(r, viewer, chars)) secret.add(r.oid);
    }
  }
  const kept = new Set<string>();
  // R508: paper the sender doesn't read was never in their copy: it goes back where the GM holds it.
  const unread = (r: PieceRecord) => isPaper(r) && !reads(viewer, r);
  const home = new Map<string, Burial>();
  for (const g of real?.yards ?? []) for (const b of g.items) for (const r of b.records) home.set(r.oid, b);
  const yards = mine.yards.map(g => ({ ...g, items: g.items.flatMap((b): Burial[] => {
    if (b.gm && secret.has(b.gm)) { kept.add(b.gm); return [cards.get(b.gm)!]; }
    if (b.gm && !viewer?.gm) return [];
    const records = b.records.flatMap((r): PieceRecord[] => {
      if (truth.has(r.oid)) { if (secret.has(r.oid)) kept.add(r.oid); return [truth.get(r.oid) as PieceRecord]; }
      const d = deleted.get(r.oid);
      return d ? [d] : [];
    });
    const was = records.map(r => home.get(r.oid)).find(x => x);
    for (const r of was?.records.filter(unread) ?? []) if (!kept.has(r.oid)) { kept.add(r.oid); records.push(r); }
    return records.length || b.info ? [{ ...b, records }] : [];
  }) }));
  // R508: a burial of nothing but unread paper, left out whole, goes back in its graveyard (by name,
  // else the first) at its place.
  (real?.yards ?? []).forEach(g => g.items.forEach((b, k) => {
    if (b.gm || !b.records.length || !b.records.every(unread) || b.records.every(r => kept.has(r.oid))) return;
    const to = yards.find(y => y.name === g.name) ?? yards[0];
    if (!to) return;
    to.items.splice(Math.min(k, to.items.length), 0, b);
    for (const r of b.records) kept.add(r.oid);
  }));
  return [...secret].every(o => kept.has(o)) ? { yards } : null;
}

// R375: a player changes only their own characters' roll rows, and of those only the action, its
// alternative, the type and the hand; the aim, the White and the private switch stay the GM's.
function mergeRows(real: Rows | undefined, mine: Rows, who: string, chars: Characters): Rows {
  const rows = { ...real?.rows };
  for (const [oid, r] of Object.entries(mine.rows)) {
    if (chars(oid)?.owner !== who) continue;
    const { alt: _a, type: _t, ...gms } = rows[oid]
      ?? { pool: oid, action: '', opponent: null, defend: 'mental', row: null, byHand: false, hand: { yellows: 1, bonus: 0 } };
    rows[oid] = { ...gms, action: r.action, hand: r.hand, ...(r.alt && { alt: r.alt }), ...(r.type && { type: r.type }) };
  }
  // R383: a row of their own put away; not a private one, which their copy never holds.
  for (const [oid, r] of Object.entries(real?.rows ?? {})) {
    if (!(oid in mine.rows) && !r.priv && chars(oid)?.owner === who) delete rows[oid];
  }
  return { rows };
}

/** Leaves at most TOMBS entries in `m`, the oldest by `at` dropped; the newest version dropped (R448), 0 for none. */
function capped<T>(m: Record<Rid, T>, at: (v: T) => number): number {
  const keys = Object.keys(m);
  let dropped = 0;
  if (keys.length > TOMBS) for (const k of keys.sort((a, b) => at(m[a]!) - at(m[b]!)).slice(0, keys.length - TOMBS)) {
    dropped = Math.max(dropped, at(m[k]!));
    delete m[k];
  }
  return dropped;
}

// R460: the table guards secrets and who may touch what here; judgment calls aren't refused (Item 14).
// Seq: seq-edit.md#1.4, seq-edit.md#1.4.1, seq-edit.md#1.4.2, seq-edit.md#1.4.3, seq-edit.md#1.4.4, seq-edit.md#1.4.5
/**
 * Pure: what of a player's change to take, and what to refuse. `who` is the name the sender's
 * browser holds (null: nobody). Refused: everything from nobody; everything, when it touches Boot
 * Hill from a copy that missed a later change to it; a piece Ownership says they may not change; a
 * piece they can only see redacted, before or after; a piece put back that was deleted after their
 * copy was made; (R444) a piece put or deleted that another tab than `tab` changed after their copy
 * was made; (R448) everything, from a copy older than the book's floor.
 */
export function judge(game: Game, edit: Edit, who: string | null, tab?: string): { puts: { rid: Rid; rec: Rec }[]; dels: Rid[]; refused: Rid[] } {
  const all = [...edit.puts.map(p => p.rid), ...edit.dels].filter(rid => rid !== 'meta' && !isLocal(rid));
  const book = game.get('book') as Book, chars = characters(game);
  if (!who) return { puts: [], dels: [], refused: all };                                   // R167
  if (edit.base < (book.floor ?? 0)) return { puts: [], dels: [], refused: all };           // R448
  if (edit.puts.some(p => p.rid === 'yards') && edit.base < (book.hillGv ?? 0)) return { puts: [], dels: [], refused: all };
  const viewer: Viewer = { name: who, gm: false };
  const mine = (old: Rec | undefined, rec: Rec | undefined) => {
    if (old && !seen(old, viewer, chars)) return false;                                     // R186
    if (rec && !seen(rec, viewer, chars)) return false;
    // R410, R435: the Connection Table and the Opinion Records are written by the GM's page alone, however
    // much of a record a player can see.
    const gms = (r: Rec | undefined) => !!r && 'kind' in r && (r.kind === 'connections' || r.kind === 'opinion');
    if (gms(old) || gms(rec)) return false;
    const c = (r: Rec | undefined) => r && 'kind' in r && r.kind === 'character' ? r : undefined;
    const before = c(old), after = c(rec);
    if (!before && !after) return true;
    // R567: a character's writing is its owner's and the GM's; an open one's, the GM's alone.
    if (rewrites(before, after) && !mayWrite(viewer, before!)) return false;
    return mayChange(viewer, before, after);                                                // R148
  };
  // R444: another tab changed the piece after the copy this change was made on.
  const stale = (rid: Rid) => { const l = book.last?.[rid]; return !!l && l.g > edit.base && l.by !== tab; };
  const buried = new Map<string, PieceRecord>();
  for (const g of (game.get('yards') as Yards | undefined)?.yards ?? []) for (const b of g.items) for (const r of b.records) buried.set(r.oid, r);
  const puts: { rid: Rid; rec: Rec }[] = [], dels: Rid[] = [], refused: Rid[] = [];
  for (const rid of edit.dels) {
    if (!all.includes(rid)) continue;
    if (isPiece(rid) && !stale(rid) && mine(game.get(rid), undefined)) dels.push(rid); else refused.push(rid);
  }
  for (const { rid, rec } of edit.puts) {
    if (!all.includes(rid)) continue;
    if (rid === 'yards') {
      const deleted = new Map(dels.map(d => [oidOf(d), game.get(d) as PieceRecord]));
      const merged = mergeYards(game.get('yards') as Yards | undefined, rec as Yards, viewer, chars, deleted);
      if (merged) puts.push({ rid, rec: merged }); else refused.push(rid);
    } else if (rid === 'rows') puts.push({ rid, rec: mergeRows(game.get('rows') as Rows | undefined, rec as Rows, who, chars) });
    else if (!isPiece(rid) || (book.tomb[rid] ?? 0) > edit.base) refused.push(rid);       // R192
    else if (kindOf(rec) === 'tornroll') refused.push(rid);                                  // R486: each page's own
    else if (stale(rid)) refused.push(rid);                                                  // R444
    else if (forged(game.get(rid), rec, who)) refused.push(rid);                             // R360
    else if (misread(game.get(rid) ?? buried.get(oidOf(rid)), rec, who)) refused.push(rid);  // R506
    else if (ruled(game.get(rid), rec)) refused.push(rid);                                   // R464
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
  /** R444: the pieces changed since the last batch, and the tab whose change it was. */
  #touched = new Map<Rid, string>();
  /** R446: the claims last sent to everyone. */
  #claims = '';
  #flushing = false;
  #work: Promise<void> = Promise.resolve();

  constructor(w: AuthorityWith) {
    this.#w = w;
    w.game.listen(rids => {
      for (const rid of rids) if (isPiece(rid)) this.#touched.set(rid, w.link.tab);
      if (rids.has('book')) this.#sendClaims();
      this.#queue(rids);
    });
    w.link.on('sync', (_: never, from: Peer) => { this.#catchUp(from.tab); });
    w.link.on('edit', (body: { box: Box }, from: Peer) => this.#edit(body.box, from));
    w.link.on('bye', (_: never, from: Peer) => { this.#tabs.delete(from.tab); });
    w.link.on('rename', (body: { to: string; why?: string | null }, from: Peer) => { if (body.why === undefined) this.#rename(from.tab, body.to); });
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

  // R469: a player's rename: the name their tab holds (a nobody has none), checked, and if free, everything
  // they hold follows it in one change; the tab is answered either way, and the claims go out as they change.
  #rename(tab: string, to: string): void {
    const t = this.#tabs.get(tab), { game, link } = this.#w;
    if (!t) return;
    const who = this.#viewer(t)?.name, refused = who ? renameWhy(game, who, to) : 'Only a name your browser holds can be renamed.';
    if (!refused) {
      game.change(renamed(game, who!, to));
      t.name = to.trim();
    }
    link.send('rename', { to, why: refused }, tab);
  }

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
    let rids = [...this.#pending].filter(rid => !isLocal(rid));
    this.#pending.clear();
    // R193: a character changing (its owner, say) can change who sees its cards: check everything.
    if (rids.some(rid => kindOf(game.get(rid)) === 'character' || kindOf(this.#public.get(rid)) === 'character')) {
      rids = [...game.all().map(([rid]) => rid).filter(rid => !isLocal(rid)), ...rids.filter(rid => !game.get(rid))];
    }
    const puts: Put[] = [], dels: Del[] = [], sealFor = new Map<string, Own>();
    const gone: Rid[] = [];
    for (const rid of new Set([...rids, ...this.#answerDel])) {
      const rec = game.get(rid);
      if (!rec) {
        // R361: a deleted piece of a private mat is taken away, sealed, from the tabs that held it.
        const holders = [...this.#tabs].filter(([, t]) => t.holds.has(rid));
        const wasPublic = this.#public.has(rid) || this.#answerDel.has(rid);
        if (!wasPublic && !holders.length) continue;
        const stamp = this.#stamp(rid);
        if (wasPublic) dels.push({ rid, ...stamp });
        else for (const [tab] of holders) {
          const f = sealFor.get(tab) ?? { puts: [], dels: [] };
          f.dels.push({ rid, ...stamp });
          sealFor.set(tab, f);
        }
        this.#public.delete(rid);
        for (const t of this.#tabs.values()) t.holds.delete(rid);
        gone.push(rid);
        continue;
      }
      const pv = redact(rec, null, chars), changed = !same(this.#public.get(rid), pv);
      let stamp: Stamp | undefined;
      const stampOnce = () => stamp ??= this.#stamp(rid);
      if (changed && pv) { this.#public.set(rid, pv); puts.push({ rid, ...stampOnce(), rec: pv }); }
      // R361: a piece nobody-at-all may see goes out as a removal, not a deletion: no tomb.
      else if (changed) { this.#public.delete(rid); dels.push({ rid, ...stampOnce() }); }
      for (const [tab, t] of this.#tabs) {
        const tv = redact(rec, this.#viewer(t), chars), holds = changed ? pv : t.holds.get(rid);
        if (tv) t.holds.set(rid, tv); else t.holds.delete(rid);
        if (same(tv, holds)) continue;
        const f = sealFor.get(tab) ?? { puts: [], dels: [] };
        // R361: what only this tab stops seeing is taken away from it alone, sealed.
        if (tv) f.puts.push({ rid, ...stampOnce(), rec: tv }); else f.dels.push({ rid, ...stampOnce() });
        sealFor.set(tab, f);
      }
    }
    this.#answerDel.clear();
    if (!puts.length && !dels.length && !sealFor.size) return;
    // R188, R192: the table's version moves with every batch; deletions are remembered by it.
    const book = game.get('book') as Book, g = book.gv + 1;
    const tomb = { ...book.tomb }, last = { ...book.last };
    for (const rid of gone) if (isPiece(rid)) tomb[rid] = g;
    for (const p of puts) delete tomb[p.rid];
    // Seq: seq-sync.md#1.5.1 | R444
    for (const [rid, by] of this.#touched) if (game.get(rid)) last[rid] = { g, by }; else delete last[rid];
    this.#touched.clear();
    const hill = puts.some(p => p.rid === 'yards') ? { hillGv: g } : {};
    // Seq: seq-sync.md#1.5.2 | R448: what the caps drop raises the floor.
    const floor = Math.max(book.floor ?? 0, capped(tomb, v => v), capped(last, v => v.g));
    game.change(w => w.put('book', { ...book, gv: g, tomb, last, ...(floor && { floor }), ...hill }));
    this.#send({ g, full: false, puts, dels }, sealFor);
  }

  // Seq: seq-join.md#1.10.2, seq-join.md#1.12.1 | R446: who holds each name is no secret: to everyone
  // when it changes, and to a tab catching up.
  #sendClaims(to?: string): void {
    const claims = (this.#w.game.get('book') as Book).claims, json = JSON.stringify(claims);
    if (!to && json === this.#claims) return;
    if (!to) this.#claims = json;
    this.#w.link.send('claims', { claims }, to);
  }

  #send(batch: Omit<Batch, 'sealed'>, sealFor: Map<string, Own>, to?: string): void {
    const { link, sealer } = this.#w;
    this.#work = this.#work.then(async () => {
      const sealed: Record<string, Box> = {};
      for (const [tab, { puts, dels }] of sealFor) {
        const t = this.#tabs.get(tab);
        if (t) sealed[tab] = await sealer.seal(t.sealKey, 'recs', link.tab, tab, { g: batch.g, puts, ...(dels.length && { dels }) } satisfies Sealed);
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
      if (isLocal(rid)) continue;
      const stamp = this.#current(rid), pv = redact(rec, null, chars), tv = redact(rec, viewer, chars);
      // R361: a piece nobody-at-all may see is left out of the public part, sealed to those who may.
      if (pv) puts.push({ rid, ...stamp, rec: pv });
      // R188, R192: what a catch-up sends has gone out, so its deletion is sent and tombed. A record
      // already out keeps what went out, so a change not yet sent still reaches the other tabs.
      if (pv && !this.#public.has(rid)) this.#public.set(rid, pv);
      if (tv && !same(tv, pv)) mine.push({ rid, ...stamp, rec: tv });
      if (tv) t.holds.set(rid, tv);
    }
    const g = (game.get('book') as Book).gv;
    this.#send({ g, full: true, puts, dels: [] }, mine.length ? new Map([[tab, { puts: mine, dels: [] }]]) : new Map(), tab);
    this.#sendClaims(tab);
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
    return judge(this.#w.game, { s: 0, base: gv, puts: [{ rid, rec: r }], dels: [] }, this.#viewer(t)?.name ?? null, tab).refused.length === 0;
  }

  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7: judge, take what's allowed, answer the rest.
  #take(edit: Edit, tab: string): void {
    const t = this.#tabs.get(tab), { game, stamps } = this.#w;
    if (!t) return;
    const fresh = (rid: Rid) => stamps.fresh(rid, tab, edit.s);
    const current = { ...edit, puts: edit.puts.filter(p => fresh(p.rid)), dels: edit.dels.filter(fresh) };
    const verdict = judge(game, current, this.#viewer(t)?.name ?? null, tab);
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
    for (const rid of changed) if (isPiece(rid)) this.#touched.set(rid, tab);               // R444
    // Seq: seq-edit.md#1.7: every piece is answered, taken, refused, or changing nothing.
    const unchanged = taken.filter(rid => !changed.has(rid));
    for (const rid of unchanged) answer(rid);
    for (const rid of verdict.refused) answer(rid);
    this.#queue([...verdict.refused, ...unchanged]);
  }
}
