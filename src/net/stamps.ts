// CRC: crc-Stamps.md | Seq: seq-move.md#1, seq-sync.md#1.5, seq-sync.md#1.9 | R180, R181, R182
// Ordering without a clock. Each page numbers what it sends, moves and changes alike, on one
// counter that a reload continues; each piece remembers the highest number it has applied from each
// page, and anything lower is stale.

import type { Rid } from '../model/records.ts';
import type { KeyValue } from '../store/gamestore.ts';

export const SEQ_KEY = 'hollow.seq';

export class Stamps {
  #storage: KeyValue;
  #seq = 0;
  #peers = new Map<string, number>();
  #highest = new Map<Rid, Map<number, number>>();

  /** `storage` is sessionStorage on the page, so a reload continues the count. */
  constructor(storage: KeyValue) {
    this.#storage = storage;
    try { this.#seq = Number(storage.getItem(SEQ_KEY)) || 0; } catch { /* blocked: start at 0 */ }
  }

  // R180: one counter for moves and changes.
  /** The next number. A deletion takes one too, never the piece's last (crc-Stamps.md). */
  next(): number {
    this.#seq++;
    try { this.#storage.setItem(SEQ_KEY, String(this.#seq)); } catch { /* blocked: this load only */ }
    return this.#seq;
  }

  /** A sending page's small local number; each page numbers the others in the order it meets them. */
  peer(tab: string): number {
    let n = this.#peers.get(tab);
    if (n === undefined) this.#peers.set(tab, n = this.#peers.size + 1);
    return n;
  }

  /** The highest number applied to `rid` from that page (0 if none). */
  highest(rid: Rid, tab: string): number {
    return this.#highest.get(rid)?.get(this.peer(tab)) ?? 0;
  }

  // R181: lower than what was applied from that page is stale.
  fresh(rid: Rid, tab: string, s: number): boolean {
    return s >= this.highest(rid, tab);
  }

  /** Forget what was applied to `rid` from one page: a change given up on lets the GM's version win. */
  forget(rid: Rid, tab: string): void {
    this.#highest.get(rid)?.delete(this.peer(tab));
  }

  mark(rid: Rid, tab: string, s: number): void {
    let m = this.#highest.get(rid);
    if (!m) this.#highest.set(rid, m = new Map());
    const p = this.peer(tab);
    if (s > (m.get(p) ?? 0)) m.set(p, s);
  }
}
