// CRC: crc-Seat.md | Seq: seq-restore.md#1.6 | R127, R128, R136
// Your seat at the table: how you're looking, kept per game and per viewer in localStorage, never
// checkpointed, exported or sent. Every read and write survives a blocked or empty storage.

import type { Die, Oid, Rid } from '../model/records.ts';
import { ridOf } from '../model/records.ts';
import type { KeyValue } from './gamestore.ts';

/** The docked roll row. */
export type Roller = {
  pool: Oid; action: string; opponent: Oid | null; defend: 'mental' | 'psych'; row: string | null;
  byHand: boolean; hand: { yellows: number; bonus: number }; dice: Die[];
};

export type Seat = {
  /** Pan and zoom; null until the table has been fitted once (a first visit, R271). */
  view: { x: number; y: number; zoom: number } | null;
  roller: Roller | null;
  /** Who the GM is viewing as, or null for the GM's own view. */
  viewAs: string | null;
  tapeUp: boolean;
  boothill: { cur: number; open: boolean };
  /** Opened things, each named by the oid it belongs to: used piles and piles by oid, slots as
   * `<oid>:<slot>`, card columns as `<oid>:<damage>`. */
  open: { used: Oid[]; piles: Oid[]; slots: string[]; columns: string[] };
};

export const seatKey = (game: string, viewer: string) => `hollow.seat.${game}.${viewer}`;

export function fresh(): Seat {
  return {
    view: null, roller: null, viewAs: null, tapeUp: false,
    boothill: { cur: 0, open: false }, open: { used: [], piles: [], slots: [], columns: [] },
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
  let roller: Roller | null = null;
  if (seat.roller && here(seat.roller.pool)) {
    const { opponent } = seat.roller;
    roller = { ...seat.roller, opponent: opponent && here(opponent) ? opponent : null };
  }
  return {
    ...seat, roller,
    boothill: { ...seat.boothill, cur: Math.max(0, Math.min(seat.boothill.cur, yards - 1)) },
    open: {
      used: seat.open.used.filter(here), piles: seat.open.piles.filter(here),
      slots: seat.open.slots.filter(owner), columns: seat.open.columns.filter(owner),
    },
  };
}
