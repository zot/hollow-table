// CRC: crc-GameStore.md | Seq: seq-save.md#1.5, seq-restore.md#1.1 | R129, R130, R131, R133, R134, R135, R137, R483, R141, R487
// The browser's games: the list, each game's records, its checkpoints, and the write-through that
// keeps them current. Reaches the database only through Db; the clock and localStorage are passed in.

import { Game, same } from '../model/game.ts';
import type { Rec, Rid } from '../model/records.ts';
import type { Db, Tx } from './db.ts';
import { PLAYTEST, playtest, singletons } from './playtest.ts';
import { ownedTorn } from '../rules/yards.ts';

export type GameInfo = { id: string; name: string; made: number; opened: number; copyOf?: string; as?: string };
export type Checkpoint = { id: string; name: string; at: number; auto: boolean; records: Record<Rid, Rec> };
export type CheckpointInfo = Omit<Checkpoint, 'records'>;
export type Clock = { now(): number; setTimeout(fn: () => void, ms: number): unknown; clearTimeout(h: unknown): void };
/** The part of localStorage the store uses. */
export type KeyValue = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export const SAVE_PAUSE = 400;
export const KEEP_AUTO = 20;
export const LAST = 'hollow.last';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

// R292: a restore's own checkpoint; restoring one of those again says undoing, so names never nest.
/** The name of the checkpoint made before restoring `name`. */
export function beforeRestoring(name: string): string {
  const m = /^Before (?:restoring|undoing) “(.*)”$/.exec(name);
  return m ? `Before undoing “${m[1]}”` : `Before restoring “${name}”`;
}

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
  /** Why the last save failed, until one succeeds (R291). */
  #failed: string | null = null;
  /** R454: the last checkpoint the store refused, said until one is kept. */
  #lost: string | null = null;
  /** R455: asking the browser to keep this origin's storage, once, after the first save; its answer. */
  #keep: (() => Promise<boolean>) | undefined;
  #kept: boolean | null = null;
  #quiet = false;
  #seq = 0;

  constructor(db: Db, clock: Clock, storage: KeyValue, keep?: () => Promise<boolean>) {
    this.#db = db;
    this.#clock = clock;
    this.#storage = storage;
    this.#keep = keep;
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

  // R483, R141: a player's copy, per room and name; never listed, never the last game. The name keeping
  // the browser's key (`own`) keeps the copy from before names had their own; any other is keyed by its
  // user id, which a rename keeps. R485: `as` is the name it was joined as, kept up to date.
  /** Opens a name's copy of a room's table, making an empty one the first time. */
  async copyFor(room: string, user: string, own: boolean, as: string): Promise<GameInfo> {
    const id = own ? `m-${room}` : `m-${room}.${user}`;
    const have = await this.#db.tx(['games'], 'readonly', t => t.get<GameInfo>('games', id));
    if (!have) await this.add(room, singletons(), [], room, id);
    const info = await this.open(id);
    if (info.as === as) return info;
    this.current = { ...info, as };
    await this.#db.tx(['games'], 'readwrite', t => t.put('games', id, this.current));
    return this.current;
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
    })).then(() => {
      this.#savedAt = this.#clock.now();
      this.#failed = null;
      const keep = this.#keep;
      this.#keep = undefined;
      if (keep) void keep().then(k => { this.#kept = k; }, () => { this.#kept = false; });
    }, (e: unknown) => {
      // R291: a failed save says why, and its records are tried again with the next change.
      this.#failed = e instanceof Error ? e.message : String(e);
      for (const [rid] of records) this.#pending.add(rid);
    }).finally(() => { this.#busy--; });
    return this.#saving;
  }

  // R134, R137: named checkpoints are kept; automatic ones keep the newest 20.
  /** A copy of the whole open game. */
  async checkpoint(name: string, auto: boolean): Promise<CheckpointInfo> {
    const cur = this.#open();
    await this.save();
    const cp: Checkpoint = { id: this.#id('c'), name, at: this.#clock.now(), auto, records: Object.fromEntries(this.game.all()) };
    // R454: a checkpoint the store refuses is said until one is kept.
    try {
      await this.#db.tx(['checkpoints'], 'readwrite', async t => {
        await t.put('checkpoints', [cur.id, cp.id], cp);
        if (!auto) return;
        const autos = (await this.#checkpoints(t, cur.id)).filter(c => c.auto);
        for (const old of autos.slice(KEEP_AUTO)) await t.del('checkpoints', [cur.id, old.id]);
      });
    } catch (e) {
      this.#lost = `Checkpoint “${name}” not kept: ${e instanceof Error ? e.message : String(e)}`;
      throw e;
    }
    this.#lost = null;
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
    await this.checkpoint(beforeRestoring(cp.name), true);
    const book = this.game.get('book');
    // R487: a checkpoint from before torn rolls were each page's own comes back as the GM's own.
    const records = ownedTorn(Object.entries(cp.records).filter(([rid]) => rid !== 'book'));
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

  /** For the Ledger: "Saving…" while something is unwritten, "Not saved: " and why, or when it last saved (R291). */
  status(): string {
    if (this.#busy) return 'Saving…';
    if (this.#failed !== null) return `Not saved: ${this.#failed}`;
    if (this.#lost !== null) return this.#lost;
    if (this.#pending.size) return 'Saving…';
    return this.#savedAt === null ? 'Saved' : `Saved ${new Date(this.#savedAt).toTimeString().slice(0, 8)}`;
  }

  // R485: the copies this browser keeps of tables it joined as a player.
  /** The copies of joined tables, newest opened first. */
  async joined(): Promise<GameInfo[]> {
    const all = await this.#db.tx(['games'], 'readonly', t => t.all<GameInfo>('games'));
    return all.map(([, g]) => g).filter(g => g.copyOf).sort((a, b) => b.opened - a.opened);
  }

  // R457: a game or a copy goes with its records and checkpoints; never the one on the table.
  /** Deletes a game or a copy forever. */
  async forget(id: string): Promise<void> {
    if (id === this.current?.id) throw new Error("the game on the table can't be deleted");
    await this.#db.tx(['games', 'records', 'checkpoints'], 'readwrite', async t => {
      for (const k of await t.keys('records', id)) await t.del('records', k);
      for (const k of await t.keys('checkpoints', id)) await t.del('checkpoints', k);
      await t.del('games', id);
    });
  }

  /** Deletes one of the open game's checkpoints forever (R457). */
  async forgetCheckpoint(id: string): Promise<void> {
    const cur = this.#open();
    await this.#db.tx(['checkpoints'], 'readwrite', t => t.del('checkpoints', [cur.id, id]));
  }

  // R459: every image still used, buried ones in Boot Hill's yards included, so nothing is freed that
  // could be dug up or restored.
  /** The hash of every image any game, copy or checkpoint in this browser uses, and the table as it stands. */
  async images(): Promise<string[]> {
    const used = new Set<string>();
    const look = (v: unknown): void => {
      if (Array.isArray(v)) { for (const x of v) look(x); return; }
      if (!v || typeof v !== 'object') return;
      const o = v as { kind?: unknown; blob?: unknown };
      if (o.kind === 'image' && typeof o.blob === 'string') used.add(o.blob);
      for (const x of Object.values(o)) look(x);
    };
    await this.#db.tx(['records', 'checkpoints'], 'readonly', async t => {
      for (const [, r] of await t.all('records')) look(r);
      for (const [, c] of await t.all('checkpoints')) look(c);
    });
    for (const [, r] of this.game.all()) look(r);
    return [...used];
  }

  /** R455: whether the browser keeps this storage: null until it has been asked. */
  kept(): boolean | null { return this.#kept; }

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
