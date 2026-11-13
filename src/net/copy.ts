// CRC: crc-Copy.md | Seq: seq-join.md#1.11, seq-sync.md#1.7, seq-sync.md#1.8, seq-sync.md#1.9, seq-sync.md#1.10, seq-sync.md#1.11, seq-edit.md#1.1, seq-edit.md#1.2, seq-edit.md#1.3, seq-edit.md#1.8, seq-edit.md#2.1, seq-edit.md#2.2 | R140, R171, R172, R173, R189, R190
// A player's page: shows its copy of the GM's game, and keeps its own changes pending until the GM's
// page answers them, whether it took them or not. Pending changes survive the GM's absence and a
// reload, and go again until answered.

import type { Game } from '../model/game.ts';
import { isPiece, type Rec, type Rid } from '../model/records.ts';
import type { Clock, KeyValue } from '../store/gamestore.ts';
import { LOCAL, type Batch, type Del, type Edit, type Put, type Sealed } from './authority.ts';
import { sealedRecs } from './envelope.ts';
import type { Link, Peer } from './link.ts';
import type { Sealer } from './seal.ts';
import type { Stamps } from './stamps.ts';

export const RESEND_MS = 3000, TRIES = 5, ASK_MS = 3000, GAP_MS = 1500, AWAY_MS = 25_000, TICK_MS = 1000;

/** A change the GM's page hasn't answered: its number, when it last went, how often, the version
 * of the copy it was made on, and the change it was first sent with. */
type Pending = { s: number; at: number; tries: number; base: number; group: number };

export type CopyWith = {
  game: Game; stamps: Stamps; sealer: Sealer; link: Link; clock: Clock;
  /** sessionStorage: pending changes are per tab. */
  session: KeyValue;
  /** localStorage: the version seen is the copy's, per room. */
  local: KeyValue;
  room: string;
  /** The GM's browser id, from the invite's `gm=`. */
  gm: string;
  /** Whether this page holds a piece (in hand, or being written in): what arrives for it waits. */
  held?: (rid: Rid) => boolean;
};

export class Copy {
  /** Whether the whole table has arrived since joining, or since the GM's page came back. */
  synced = false;
  #w: CopyWith;
  #seen: number;
  #lastG: number | undefined;
  #pending: Map<Rid, Pending>;
  #gmPeer: (Peer & { at: number }) | undefined;
  #quiet = false;
  #asked = -Infinity;
  #gapTimer: unknown = null;
  #tick: unknown = null;
  #deferred = new Map<Rid, { put?: Put; del?: Del; by: string }>();
  #work: Promise<void> = Promise.resolve();

  constructor(w: CopyWith) {
    this.#w = w;
    this.#seen = Number(this.#read(w.local, this.#seenKey)) || 0;
    let kept: [Rid, Pending][] = [];
    try { kept = JSON.parse(this.#read(w.session, this.#pendingKey) ?? '[]'); } catch { /* none */ }
    this.#pending = new Map(kept);
    w.game.listen(rids => { if (!this.#quiet) this.#changed(rids); });
    w.link.on('recs', (b: Batch, from: Peer) => this.#recs(b, from));
    for (const kind of ['hello', 'here'] as const) w.link.on(kind, (_: never, from: Peer) => { if (from.browser === w.gm) this.heardGm(from); });
  }

  get #seenKey() { return `hollow.seen.${this.#w.room}`; }
  get #pendingKey() { return `hollow.pending.${this.#w.room}`; }
  #read(s: KeyValue, k: string): string | null { try { return s.getItem(k); } catch { return null; } }
  #write(s: KeyValue, k: string, v: string): void { try { s.setItem(k, v); } catch { /* blocked */ } }
  #keepPending(): void { this.#write(this.#w.session, this.#pendingKey, JSON.stringify([...this.#pending])); }

  /** Rids still waiting for the GM's answer. */
  pending(): Rid[] { return [...this.#pending.keys()]; }
  /** The version this copy has seen everything up to. */
  get seen(): number { return this.#seen; }
  idle(): Promise<void> { return this.#work; }

  // Seq: seq-join.md#1.11 | R171: ask for the whole table until it arrives.
  /** Starts the page's clock: asking for the table until it arrives, resending what's pending. */
  start(): void {
    const tick = () => { this.#onTick(); this.#tick = this.#w.clock.setTimeout(tick, TICK_MS); };
    this.#ask();
    this.#tick = this.#w.clock.setTimeout(tick, TICK_MS);
  }

  stop(): void {
    if (this.#tick !== null) this.#w.clock.clearTimeout(this.#tick);
    this.#tick = null;
  }

  #ask(): void {
    this.#asked = this.#w.clock.now();
    this.#w.link.send('sync', {});
  }

  // R190: a new key, or a message after AWAY_MS of silence, means the GM's page came back.
  /** The GM's page was heard. */
  heardGm(from: Peer): void {
    const now = this.#w.clock.now(), was = this.#gmPeer;
    const back = was && (was.sealKey !== from.sealKey || now - was.at > AWAY_MS);
    this.#gmPeer = { ...from, at: now };
    if (back) {
      this.synced = false;
      this.#lastG = undefined;
      this.#ask();
    }
  }

  #onTick(): void {
    const now = this.#w.clock.now();
    if (!this.synced) { if (now - this.#asked >= ASK_MS) this.#ask(); return; }
    if (!this.#gmPeer || !this.#pending.size) return;
    const due = [...this.#pending].filter(([, p]) => now - p.at >= RESEND_MS).map(([rid]) => rid);
    if (!due.length) return;
    // Seq: seq-edit.md#2.2: after TRIES, the GM's version wins.
    const gaveUp = due.filter(rid => ++this.#pending.get(rid)!.tries > TRIES);
    for (const rid of gaveUp) {
      this.#pending.delete(rid);
      this.#w.stamps.forget(rid, this.#w.link.tab);   // our own numbers would make the GM's version look stale
    }
    this.#resend(due.filter(rid => this.#pending.has(rid)));
    if (gaveUp.length) { this.#keepPending(); this.#ask(); }
  }

  // Seq: seq-sync.md#1.7 to seq-sync.md#1.11
  #recs(batch: Batch, from: Peer): Promise<void> {
    if (from.browser !== this.#w.gm) return Promise.resolve();
    this.heardGm(from);
    this.#work = this.#work.then(async () => {
      let puts = batch.puts;
      const box = batch.sealed[this.#w.link.tab];
      if (box) {
        const mine = await this.#w.sealer.open(from.sealKey, 'recs', from.tab, this.#w.link.tab, box) as Sealed;
        if (sealedRecs(mine) && mine.g === batch.g) {
          const own = new Set(mine.puts.map(p => p.rid));
          puts = [...puts.filter(p => !own.has(p.rid)), ...mine.puts];
        }
      }
      const last = this.#lastG;
      if (batch.full) { this.#lastG = batch.g; this.synced = true; this.#clearGap(); }
      else if (last === undefined || batch.g > last) {
        if (last !== undefined && batch.g > last + 1 && this.#gapTimer === null) {
          this.#gapTimer = this.#w.clock.setTimeout(() => { this.#gapTimer = null; this.#ask(); }, GAP_MS);
        }
        this.#lastG = batch.g;
      }
      this.#apply(puts, batch.dels, from.tab, batch.full);
      if (this.synced && (batch.full || (last !== undefined && batch.g === last + 1))) this.#setSeen(batch.g);
      // R190: once the table is here, what's pending goes again.
      if (batch.full && this.#pending.size) this.#resend([...this.#pending.keys()]);
    });
    return this.#work;
  }

  #clearGap(): void {
    if (this.#gapTimer !== null) this.#w.clock.clearTimeout(this.#gapTimer);
    this.#gapTimer = null;
  }

  #setSeen(g: number): void {
    if (g === this.#seen) return;
    this.#seen = g;
    this.#write(this.#w.local, this.#seenKey, String(g));
  }

  // Seq: seq-sync.md#1.9, seq-edit.md#1.8: newer than what was applied from that page, and not
  // pending, unless it is the GM's answer to ours.
  #takes(rid: Rid, by: string, s: number): boolean {
    if (!this.#w.stamps.fresh(rid, by, s)) return false;
    const p = this.#pending.get(rid);
    if (!p) return true;
    if (by !== this.#w.link.tab || s < p.s) return false;
    this.#pending.delete(rid);
    this.#keepPending();
    return true;
  }

  #apply(puts: Put[], dels: Del[], gmTab: string, full: boolean): void {
    const held = this.#w.held ?? (() => false);
    const now: Put[] = [], gone: Rid[] = [];
    for (const d of dels) {
      const by = d.by ?? gmTab;
      if (!this.#takes(d.rid, by, d.s)) continue;
      if (held(d.rid)) { this.#deferred.set(d.rid, { del: d, by }); continue; }
      this.#w.stamps.mark(d.rid, by, d.s);
      gone.push(d.rid);
    }
    for (const p of puts) {
      const by = p.by ?? gmTab;
      if (LOCAL.has(p.rid) || !this.#takes(p.rid, by, p.s)) continue;
      if (held(p.rid)) { this.#deferred.set(p.rid, { put: p, by }); continue; }
      this.#w.stamps.mark(p.rid, by, p.s);
      now.push(p);
    }
    // R172: a full table takes away what the GM's table doesn't have, except what's pending or held.
    if (full) {
      const have = new Set(puts.map(p => p.rid));
      for (const [rid] of this.#w.game.all()) {
        if (isPiece(rid) && !have.has(rid) && !this.#pending.has(rid) && !held(rid)) gone.push(rid);
      }
    }
    this.#quietly(now, gone);
  }

  #quietly(puts: { rid: Rid; rec: Rec }[], dels: Rid[]): void {
    if (!puts.length && !dels.length) return;
    this.#quiet = true;
    try {
      this.#w.game.change(w => {
        for (const p of puts) w.put(p.rid, p.rec);
        for (const rid of dels) w.del(rid);
      });
    } finally { this.#quiet = false; }
  }

  // R183: what waited for a held piece is checked again when it's let go.
  /** This page let go of `rid`. */
  release(rid: Rid): void {
    const d = this.#deferred.get(rid);
    if (!d) return;
    this.#deferred.delete(rid);
    if (d.put) this.#apply([{ ...d.put, by: d.by }], [], d.by, false);
    if (d.del) this.#apply([], [{ ...d.del, by: d.by }], d.by, false);
  }

  // Seq: seq-edit.md#1.1, seq-edit.md#1.2, seq-edit.md#1.3 | R172
  #changed(rids: ReadonlySet<Rid>): void {
    const mine = [...rids].filter(rid => isPiece(rid) || rid === 'yards');
    if (!mine.length) return;
    const s = this.#w.stamps.next(), at = this.#w.clock.now();
    for (const rid of mine) {
      this.#w.stamps.mark(rid, this.#w.link.tab, s);
      this.#pending.set(rid, { s, at, tries: 0, base: this.#seen, group: s });
    }
    this.#keepPending();
    this.#sendEdit(s, this.#seen, mine);
  }

  // R173: nothing goes before the table has arrived, so a stale copy can't overwrite the GM's.
  #sendEdit(s: number, base: number, rids: Rid[]): void {
    const gm = this.#gmPeer;
    if (!gm || !this.synced) return;
    const { game, sealer, link } = this.#w;
    const edit: Edit = { s, base, puts: [], dels: [] };
    for (const rid of rids) {
      const rec = game.get(rid);
      if (rec) edit.puts.push({ rid, rec }); else if (isPiece(rid)) edit.dels.push(rid);
    }
    this.#work = this.#work.then(async () => {
      link.send('edit', { box: await sealer.seal(gm.sealKey, 'edit', link.tab, gm.tab, edit) });
    });
  }

  // Seq: seq-edit.md#2.1: each change goes again as it went first: with what was changed with it,
  // and as old as its copy, so one refused as stale can't take a fresh one down with it.
  #resend(rids: Rid[]): void {
    const groups = new Map<number, { base: number; rids: Rid[] }>();
    for (const rid of rids) {
      const p = this.#pending.get(rid);
      if (!p) continue;
      const g = groups.get(p.group) ?? { base: p.base, rids: [] };
      g.rids.push(rid);
      groups.set(p.group, g);
    }
    const now = this.#w.clock.now();
    for (const { base, rids: group } of groups.values()) {
      const s = this.#w.stamps.next();
      for (const rid of group) {
        const p = this.#pending.get(rid)!;
        p.s = s;
        p.at = now;
        this.#w.stamps.mark(rid, this.#w.link.tab, s);
      }
      this.#sendEdit(s, base, group);
    }
    this.#keepPending();
  }
}
