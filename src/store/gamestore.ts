// CRC: crc-GameStore.md | Seq: seq-save.md#1.5, seq-restore.md#1.1 | R129, R130, R131, R133, R134, R135, R137, R140, R141
// The browser's games: the list, each game's records, its checkpoints, and the write-through that
// keeps them current. Reaches the database only through Db; the clock and localStorage are passed in.

import { Game, same } from '../model/game.ts';
import type { Rec, Rid } from '../model/records.ts';
import type { Db, Tx } from './db.ts';
import { PLAYTEST, playtest, singletons } from './playtest.ts';

export type GameInfo = { id: string; name: string; made: number; opened: number; copyOf?: string };
export type Checkpoint = { id: string; name: string; at: number; auto: boolean; records: Record<Rid, Rec> };
export type CheckpointInfo = Omit<Checkpoint, 'records'>;
export type Clock = { now(): number; setTimeout(fn: () => void, ms: number): unknown; clearTimeout(h: unknown): void };
/** The part of localStorage the store uses. */
export type KeyValue = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export const SAVE_PAUSE = 400;
export const KEEP_AUTO = 20;
export const LAST = 'hollow.last';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

export class GameStore {
  /** The open game. */
  game = new Game();
  /** What the open game is, or null before one is opened. */
  current: GameInfo | null = null;
  #db: Db;
  #clock: Clock;
  #storage: KeyValue;
  #pending = new Set<Rid>();
  #timer: unknown = null;
  #saving: Promise<void> = Promise.resolve();
  #busy = 0;
  #savedAt: number | null = null;
  #quiet = false;
  #seq = 0;

  constructor(db: Db, clock: Clock, storage: KeyValue) {
    this.#db = db;
    this.#clock = clock;
    this.#storage = storage;
    // R129: write-through. Opening a game loads what is stored, which has nothing to write.
    this.game.listen(rids => {
      if (this.#quiet) return;
      for (const rid of rids) this.#pending.add(rid);
      if (this.#timer !== null) this.#clock.clearTimeout(this.#timer);
      this.#timer = this.#clock.setTimeout(() => { this.#timer = null; void this.save(); }, SAVE_PAUSE);
    });
  }

  #id(prefix: string): string {
    return `${prefix}${pad(this.#clock.now(), 14)}-${pad(++this.#seq, 4)}`;
  }

  // R131: the last game opens on load; the first visit makes one from the playtest scene.
  /** Opens the game last open, or the newest, or (on a first visit) makes the playtest game. */
  async start(): Promise<GameInfo> {
    const last = this.#read(LAST);
    const games = await this.list();
    const pick = games.find(g => g.id === last) ?? games[0] ?? await this.add(PLAYTEST, playtest());
    return this.open(pick.id);
  }

  /** The browser's own games, newest opened first; players' copies are left out. */
  async list(): Promise<GameInfo[]> {
    const all = await this.#db.tx(['games'], 'readonly', t => t.all<GameInfo>('games'));
    return all.map(([, g]) => g).filter(g => !g.copyOf).sort((a, b) => b.opened - a.opened);
  }

  // R133: New game is an empty table beside the others.
  /** Stores a new game (not opened): its records, and any checkpoints it brings (an import). */
  async add(name: string, records: Iterable<[Rid, Rec]> = singletons(), checkpoints: Omit<Checkpoint, 'id'>[] = [], copyOf?: string, id = this.#id('g')): Promise<GameInfo> {
    const now = this.#clock.now();
    const info: GameInfo = { id, name, made: now, opened: now, ...(copyOf && { copyOf }) };
    await this.#db.tx(['games', 'records', 'checkpoints'], 'readwrite', async t => {
      await t.put('games', id, info);
      for (const [rid, rec] of records) await t.put('records', [id, rid], rec);
      for (const cp of checkpoints) {
        const cid = this.#id('c');
        await t.put('checkpoints', [id, cid], { ...cp, id: cid });
      }
    });
    return info;
  }

  /** Saves the open game, then opens another. */
  async open(id: string): Promise<GameInfo> {
    await this.save();
    const { info, records } = await this.#db.tx(['games', 'records'], 'readwrite', async t => {
      const info = await t.get<GameInfo>('games', id);
      if (!info) throw new Error(`no game ${id}`);
      const opened = { ...info, opened: this.#clock.now() };
      await t.put('games', id, opened);
      return { info: opened, records: await this.#records(t, id) };
    });
    this.#quiet = true;
    try { this.game.load(records); } finally { this.#quiet = false; }
    this.current = info;
    if (!info.copyOf) this.#write(LAST, id);
    return info;
  }

  async rename(name: string): Promise<void> {
    const cur = this.#open();
    this.current = { ...cur, name };
    await this.#db.tx(['games'], 'readwrite', t => t.put('games', cur.id, this.current));
  }

  // R140, R141: a player's copy, per room; never listed, never the last game.
  /** Opens this page's copy of a room's table, making an empty one the first time. */
  async copyFor(room: string): Promise<GameInfo> {
    const id = `m-${room}`;
    const have = await this.#db.tx(['games'], 'readonly', t => t.get<GameInfo>('games', id));
    if (!have) await this.add(room, singletons(), [], room, id);
    return this.open(id);
  }

  // Seq: seq-save.md#1.5, seq-save.md#1.5.1
  /** Writes what changed now, in one transaction: only records that differ from what's stored. */
  save(): Promise<void> {
    if (this.#timer !== null) { this.#clock.clearTimeout(this.#timer); this.#timer = null; }
    const cur = this.current, rids = [...this.#pending];
    this.#pending.clear();
    if (!cur || !rids.length) return this.#saving;
    const records = rids.map(rid => [rid, this.game.get(rid)] as const);
    this.#busy++;
    this.#saving = this.#saving.then(() => this.#db.tx(['records'], 'readwrite', async t => {
      for (const [rid, rec] of records) {
        const stored = await t.get<Rec>('records', [cur.id, rid]);
        if (same(stored, rec)) continue;
        if (rec === undefined) await t.del('records', [cur.id, rid]);
        else await t.put('records', [cur.id, rid], rec);
      }
    })).then(() => { this.#savedAt = this.#clock.now(); }).finally(() => { this.#busy--; });
    return this.#saving;
  }

  // R134, R137: named checkpoints are kept; automatic ones keep the newest 20.
  /** A copy of the whole open game. */
  async checkpoint(name: string, auto: boolean): Promise<CheckpointInfo> {
    const cur = this.#open();
    await this.save();
    const cp: Checkpoint = { id: this.#id('c'), name, at: this.#clock.now(), auto, records: Object.fromEntries(this.game.all()) };
    await this.#db.tx(['checkpoints'], 'readwrite', async t => {
      await t.put('checkpoints', [cur.id, cp.id], cp);
      if (!auto) return;
      const autos = (await this.#checkpoints(t, cur.id)).filter(c => c.auto);
      for (const old of autos.slice(KEEP_AUTO)) await t.del('checkpoints', [cur.id, old.id]);
    });
    const { records: _, ...info } = cp;
    return info;
  }

  /** The open game's checkpoints, newest first. */
  async checkpoints(): Promise<CheckpointInfo[]> {
    const cur = this.#open();
    const all = await this.#db.tx(['checkpoints'], 'readonly', t => this.#checkpoints(t, cur.id));
    return all.map(({ records: _, ...info }) => info);
  }

  // Seq: seq-restore.md#1.2, seq-restore.md#1.3, seq-restore.md#1.4 | R135
  /** Checkpoints the table first, so the restore can be undone; the book is not taken back. */
  async restore(id: string): Promise<void> {
    const cur = this.#open();
    const cp = await this.#db.tx(['checkpoints'], 'readonly', t => t.get<Checkpoint>('checkpoints', [cur.id, id]));
    if (!cp) throw new Error(`no checkpoint ${id}`);
    await this.checkpoint(`Before restoring “${cp.name}”`, true);
    const book = this.game.get('book');
    const records = Object.entries(cp.records).filter(([rid]) => rid !== 'book');
    this.game.load(book ? [...records, ['book', book]] : records);
    await this.save();
  }

  /** A game as stored, with its checkpoints oldest first (for Exchange). */
  async read(id: string): Promise<{ info: GameInfo; records: [Rid, Rec][]; checkpoints: Checkpoint[] }> {
    if (id === this.current?.id) await this.save();
    return this.#db.tx(['games', 'records', 'checkpoints'], 'readonly', async t => {
      const info = await t.get<GameInfo>('games', id);
      if (!info) throw new Error(`no game ${id}`);
      return { info, records: await this.#records(t, id), checkpoints: (await this.#checkpoints(t, id)).reverse() };
    });
  }

  /** For the Ledger: "Saving…" while something is unwritten, else when it last saved. */
  status(): string {
    if (this.#pending.size || this.#busy) return 'Saving…';
    return this.#savedAt === null ? 'Saved' : `Saved ${new Date(this.#savedAt).toTimeString().slice(0, 8)}`;
  }

  #open(): GameInfo {
    if (!this.current) throw new Error('no game is open');
    return this.current;
  }

  async #records(t: Tx, id: string): Promise<[Rid, Rec][]> {
    return (await t.all<Rec>('records', id)).map(([k, v]) => [(k as [string, string])[1], v]);
  }

  async #checkpoints(t: Tx, id: string): Promise<Checkpoint[]> {
    return (await t.all<Checkpoint>('checkpoints', id)).map(([, c]) => c).sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1));
  }

  // localStorage may be missing or blocked; the store still works without `last`.
  #read(key: string): string | null {
    try { return this.#storage.getItem(key); } catch { return null; }
  }
  #write(key: string, value: string): void {
    try { this.#storage.setItem(key, value); } catch { /* blocked: nothing remembered */ }
  }
}
