// CRC: crc-Game.md | Seq: seq-save.md#1.1, seq-save.md#1.2, seq-save.md#1.3 | R126, R129, R170
// The open game in memory: every record by rid, and the one door every change goes through.
// Listeners hear each change's rids once and keep their own sets of what they still have to do, so
// saving and sending never diff the whole table.

import { check, type Rec, type Rid } from './records.ts';

export type Writer = { put(rid: Rid, value: Rec): void; del(rid: Rid): void };
export type Listener = (rids: ReadonlySet<Rid>) => void;

/** A record that failed `check`; the change it was in is dropped whole. */
export class Refused extends Error {
  rid: Rid;
  constructor(rid: Rid) {
    super(`refused: ${rid} is not a well-formed record`);
    this.rid = rid;
  }
}

/** Structural equality for plain records: same keys, same values, arrays in order. */
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const ob = b as Record<string, unknown>;
  return ka.every(k => Object.hasOwn(ob, k) && same((a as Record<string, unknown>)[k], ob[k]));
}

export class Game {
  #records = new Map<Rid, Rec>();
  #listeners = new Set<Listener>();

  get(rid: Rid): Rec | undefined { return this.#records.get(rid); }

  /** Every record, rid first. */
  all(): [Rid, Rec][] { return [...this.#records]; }

  // Seq: seq-save.md#1.2, seq-save.md#1.3
  /**
   * The only way to mutate. Puts are checked as they are made, and nothing is applied until `fn`
   * returns, so a refused put (or any throw) leaves the game as it was. Listeners then hear the
   * rids that really changed, once; a put equal to what is there is not a change.
   */
  change(fn: (w: Writer) => void): ReadonlySet<Rid> {
    const staged = new Map<Rid, Rec | undefined>();
    fn({
      put: (rid, value) => {
        if (!check(rid, value)) throw new Refused(rid);
        staged.set(rid, value);
      },
      del: rid => { staged.set(rid, undefined); },
    });
    const changed = new Set<Rid>();
    for (const [rid, value] of staged) {
      if (same(this.#records.get(rid), value)) continue;
      if (value === undefined) this.#records.delete(rid); else this.#records.set(rid, value);
      changed.add(rid);
    }
    this.#tell(changed);
    return changed;
  }

  /** Replaces everything (opening a game, a restore, a full table arriving); every rid is heard. */
  load(records: Iterable<[Rid, Rec]>): void {
    const changed = new Set(this.#records.keys());
    this.#records = new Map(records);
    for (const rid of this.#records.keys()) changed.add(rid);
    this.#tell(changed);
  }

  /** Hear each change's rids; the function returned stops it. */
  listen(fn: Listener): () => void {
    this.#listeners.add(fn);
    return () => { this.#listeners.delete(fn); };
  }

  #tell(rids: ReadonlySet<Rid>): void {
    if (rids.size) for (const fn of [...this.#listeners]) fn(rids);
  }
}
