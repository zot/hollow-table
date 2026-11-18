// CRC: crc-Seat.md | Seq: seq-restore.md#1.6 | R127, R128, R136, R364, R397
// Your seat at the table: how you're looking, kept per game and per viewer in localStorage, never
// checkpointed, exported or sent. Every read and write survives a blocked or empty storage.

import type { Oid, Rid, RollType } from '../model/records.ts';
import { ridOf } from '../model/records.ts';
import type { KeyValue } from './gamestore.ts';

// R381: the roll row is the game's (`rows`), not the seat's.
export type { Roller } from '../model/records.ts';

export type Seat = {
  /** Pan and zoom; null until the table has been fitted once (a first visit, R271). */
  view: { x: number; y: number; zoom: number } | null;
  /** Who the GM is viewing as, or null for the GM's own view. */
  viewAs: string | null;
  tapeUp: boolean;
  boothill: { cur: number; open: boolean };
  /** Opened things, each named by the oid it belongs to: used piles and piles by oid, slots as
   * `<oid>:<slot>`, card columns as `<oid>:<damage>`, the Info card slid out as `<oid>:<k>` (R397). */
  open: { used: Oid[]; piles: Oid[]; slots: string[]; columns: string[]; info: string[] };
  /** R364: the roll type this viewer last chose for each action on each card, by `<oid>:<label>`. */
  types: Record<string, RollType>;
};

export const seatKey = (game: string, viewer: string) => `hollow.seat.${game}.${viewer}`;

export function fresh(): Seat {
  return {
    view: null, viewAs: null, tapeUp: false,
    boothill: { cur: 0, open: false }, open: { used: [], piles: [], slots: [], columns: [], info: [] }, types: {},
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// R127: kept per game and per viewer.
/** The seat saved for this game and viewer, or a fresh one; a broken or blocked storage gives a fresh one. */
export function load(storage: KeyValue, game: string, viewer: string): Seat {
  let saved: unknown;
  try { saved = JSON.parse(storage.getItem(seatKey(game, viewer)) ?? 'null'); } catch { return fresh(); }
  if (!isObject(saved)) return fresh();
  const base = fresh();
  return {
    ...base, ...saved,
    view: isObject(saved.view) ? { x: 0, y: 0, zoom: 1, ...saved.view } : null,
    boothill: { ...base.boothill, ...(isObject(saved.boothill) ? saved.boothill : {}) },
    open: { ...base.open, ...(isObject(saved.open) ? saved.open : {}) },
    types: isObject(saved.types) ? saved.types as Seat['types'] : {},
  } as Seat;
}

/** Keeps the seat; a blocked storage keeps nothing and says nothing. */
export function save(storage: KeyValue, game: string, viewer: string, seat: Seat): void {
  try { storage.setItem(seatKey(game, viewer), JSON.stringify(seat)); } catch { /* blocked */ }
}

// Seq: seq-restore.md#1.6 | R136: a restore keeps your seat, skipping whatever has vanished.
/** The seat without what refers to records that no longer exist; the graveyard browsed stays within `yards`. */
export function prune(seat: Seat, exists: (rid: Rid) => boolean, yards: number): Seat {
  const here = (oid: Oid) => exists(ridOf(oid));
  const owner = (s: string) => here(s.slice(0, s.indexOf(':')));
  // R381: a seat saved before still names a roll row; it is the game's now.
  const { roller: _, ...rest } = seat as Seat & { roller?: unknown };
  return {
    ...rest,
    boothill: { ...seat.boothill, cur: Math.max(0, Math.min(seat.boothill.cur, yards - 1)) },
    open: {
      used: seat.open.used.filter(here), piles: seat.open.piles.filter(here),
      slots: seat.open.slots.filter(owner), columns: seat.open.columns.filter(owner), info: seat.open.info.filter(owner),
    },
  };
}
