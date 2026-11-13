// CRC: crc-Moves.md | Seq: seq-move.md#1, seq-move.md#1.1, seq-move.md#1.2, seq-move.md#1.3, seq-move.md#1.5, seq-move.md#2 | R298, R299, R300, R182, R183
// Drags go straight to the room, without passing through the GM's page. A receiving page queues
// what arrives and an actor works through it in passes, newest arrival first, and shows the winners
// (Hands). A move saves nothing: the drop's change does.

import type { Oid, Rid, SlotName } from '../model/records.ts';
import type { Stamps } from './stamps.ts';

export const SEND_MS = 100;

// R299: what a carried piece is aimed at, as the carrying page decided it.
/** What a piece would land on, the strip it opened, and whether a card shows as a chip. */
export type Aim = {
  slot?: { owner: Oid; name: SlotName };
  drawer?: { owner: Oid; at?: number };
  kill?: Oid;
  merge?: Rid;
  card?: Rid;
  reach?: { owner: Oid; at: SlotName; from: SlotName | null };
  chip?: boolean;
};

/** A piece in hand: the one held (what follows it, each page works out), where, and its aim. */
export type MoveItem = { rid: Rid; x: number; y: number; z: number; part?: string; aim?: Aim };
export type Move = { s: number; items: MoveItem[]; drop?: boolean };
/** One item of a move as the actor sees it: who sent it, under what number, and whether it let go. */
export type Command = MoveItem & { tab: string; s: number; drop?: boolean };

export type Timers = { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(h: unknown): void };
/** Runs `fn` once, on the next animation frame or after SEND_MS, whichever comes first. */
export type Schedule = (fn: () => void) => void;

export type MovesWith = {
  stamps: Stamps;
  /** This page's tab id. */
  tab: string;
  /** Sends a move to the room. */
  send: (move: Move) => void;
  /** Shows a pass's winners (Hands): moves in hand, or let go. */
  place: (commands: Command[]) => void;
  timers: Timers;
  schedule: Schedule;
};

export class Moves {
  #w: MovesWith;
  #filling: Command[] = [];
  #draining: Command[] = [];
  #acting = false;
  #inHand: MoveItem[] = [];
  #timer: unknown = null;
  #held = new Set<Rid>();
  /** The one command waiting for each held piece, and the pass that saw it (R218). */
  #waiting = new Map<Rid, { c: Command; pass: number }>();
  #pass = 0;

  constructor(w: MovesWith) { this.#w = w; }

  // Seq: seq-move.md#1 | R178: at most every SEND_MS while in hand.
  /** The pieces in hand moved: they go out within SEND_MS, as they are then. */
  drag(items: MoveItem[]): void {
    this.#inHand = items;
    if (this.#timer === null) {
      this.#timer = this.#w.timers.setTimeout(() => { this.#timer = null; this.#sendNow(this.#inHand); }, SEND_MS);
    }
  }

  // Seq: seq-move.md#2: a drop is a move with its own number; what it changed goes out after it.
  /** The pieces were let go: their places go out now. */
  drop(items: MoveItem[]): void {
    if (this.#timer !== null) { this.#w.timers.clearTimeout(this.#timer); this.#timer = null; }
    this.#sendNow(items.map(({ aim: _, ...i }) => i), true);
  }

  #sendNow(items: MoveItem[], drop = false): void {
    if (!items.length) return;
    const s = this.#w.stamps.next();
    for (const i of items) this.#w.stamps.mark(i.rid, this.#w.tab, s);
    this.#w.send({ s, items, ...(drop && { drop: true }) });
  }

  // Seq: seq-move.md#1.1, seq-move.md#1.2
  /** A move from another page joins the queue; an actor starts if none is running. */
  receive(from: string, move: Move): void {
    for (const i of move.items) this.#filling.push({ ...i, tab: from, s: move.s, ...(move.drop && { drop: true }) });
    this.#startActor();
  }

  // Seq: seq-move.md#1.3, seq-move.md#1.5 | R182
  /**
   * Swaps the buffers and works through what arrived, newest arrival first. The first command to
   * reach a piece places it; an older arrival changes it only if it is from the same page with a
   * higher number. Anything lower than what was applied from its page is discarded.
   */
  pass(): void {
    this.#pass++;
    const run = this.#filling;
    this.#filling = this.#draining;
    this.#draining = run;
    const placed = new Map<Rid, Command>();
    for (let k = run.length - 1; k >= 0; k--) {
      const c = run[k]!;
      if (this.#held.has(c.rid)) { this.#hold(c); continue; }
      if (!this.#w.stamps.fresh(c.rid, c.tab, c.s)) continue;
      this.#w.stamps.mark(c.rid, c.tab, c.s);
      const first = placed.get(c.rid);
      if (first && (first.tab !== c.tab || c.s <= first.s)) continue;
      placed.set(c.rid, c);
    }
    run.length = 0;
    if (placed.size) this.#w.place([...placed.values()]);
    if (this.#filling.length) this.#later();
    else this.#acting = false;
  }

  // R183: a piece in your hand, or one you're writing in, waits until you let go.
  /** Whether this page holds `rid` (in hand, or being written in). */
  holds(rid: Rid): boolean { return this.#held.has(rid); }

  /** This page holds `rid`: what arrives for it waits. */
  hold(rid: Rid): void { this.#held.add(rid); }

  /** Let go of `rid`: what waited for it is checked again, as if it had just arrived. */
  release(rid: Rid): void {
    this.#held.delete(rid);
    const waited = this.#waiting.get(rid);
    if (!waited) return;
    this.#waiting.delete(rid);
    this.#filling.push(waited.c);
    this.#startActor();
  }

  /** Starts an actor if none is running. */
  #startActor(): void {
    if (!this.#acting) { this.#acting = true; this.#later(); }
  }

  /** The next pass. `schedule` is called detached, so a native like requestAnimationFrame works as given. */
  #later(): void {
    const { schedule } = this.#w;
    schedule(() => this.pass());
  }

  // R218: a held piece keeps only the most recent move for it, by the pass's own rule, never the
  // moves in between: a later pass's arrival replaces it, unless it is the same page's with a lower
  // number; within one pass (newest first) only the same page's higher number does.
  #hold(c: Command): void {
    const w = this.#waiting.get(c.rid), same = !!w && w.c.tab === c.tab;
    const newer = !w || (w.pass === this.#pass ? same && c.s > w.c.s : !(same && w.c.s > c.s));
    if (newer) this.#waiting.set(c.rid, { c, pass: this.#pass });
  }
}
