// CRC: crc-Hands.md | Seq: seq-move.md#1.4, seq-move.md#2.1, seq-move.md#2.2, seq-drag.md#1.3, seq-drag.md#1.4 | R298, R299, R300, R301, R218, R220, R222, R240, R243, R244
// Every piece in a hand, this page's and other pages', drawn the same way: lifted at its place, with
// what its aim does (the place lit, a drawer's gap, a pool's strip, a card as a chip). Nothing here
// is sent or saved; each page draws the aims in its own layout.

import type { Game } from '../model/game.ts';
import { ridOf, type PieceRecord, type Rid, type SlotName } from '../model/records.ts';
import type { Item } from '../rules/pool.ts';
import type { Aim, MoveItem } from '../net/moves.ts';
import { chipFace, reach, showGap } from './pool.ts';
import { GATHER_GAP, type TableView } from './table.ts';

/** How long a piece another page let go waits for the drop's change before going back (R300). */
export const LAND_MS = 1000;

export type HandsWith = { game: Game; table: TableView };

// R243: a card over the slots is a chip: its points in the middle, its name on hover.
function asChip(el: HTMLElement, i: Item): void {
  el.className = `loose-item chip ${i.sign > 0 ? 'pos' : 'neg'}`;
  el.textContent = chipFace(i);
  if (i.kind === 'influence') el.title = i.name;
}

/** One piece in a hand: what holds it (it and what follows it), where, and what it's aimed at. */
type Piece = { rid: Rid; keys: string[]; aim: Aim | undefined; t: number; own: boolean; landing?: ReturnType<typeof setTimeout> };

const pinnable = (r: PieceRecord): r is Extract<PieceRecord, { pin?: unknown }> =>
  r.kind === 'sticky' || r.kind === 'text' || r.kind === 'image';

export class Hands {
  #w: HandsWith;
  /** hand → key → piece. */
  #hands = new Map<string, Map<string, Piece>>();
  #t = 0;
  /** What is drawn now: lit places, gaps, strips, cards shown as chips (with their own look). */
  #lit = new Set<HTMLElement>();
  #gaps = new Set<HTMLElement>();
  #chips = new Map<HTMLElement, { cls: string; kids: Node[]; title: string }>();

  constructor(w: HandsWith) {
    this.#w = w;
    // R300: a piece in another page's hand is let go here once its record changes: the drop's
    // change, which can overtake the drop itself (and then the late drop is stale).
    w.game.listen(rids => {
      for (const [hand, pieces] of this.#hands) for (const [key, p] of pieces) if (!p.own && rids.has(p.rid)) this.#land(hand, key);
    });
  }

  // Seq: seq-move.md#1.4, seq-drag.md#1.3 | R298, R218: each piece lifted at its place, with what follows it.
  /** A hand's pieces are at these places, aimed so. Another page's slide there (`carried`). */
  show(hand: string, items: MoveItem[], own: boolean): void {
    const { table, game } = this.#w;
    const pieces = this.#hands.get(hand) ?? new Map<string, Piece>();
    this.#hands.set(hand, pieces);
    for (const i of items) {
      const key = i.part === 'pool' ? `${i.rid}#pool` : i.rid;
      const old = pieces.get(key);
      if (old?.landing) { clearTimeout(old.landing); delete old.landing; }
      const at = { x: i.x, y: i.y };
      const keys = this.#hold(key, i.rid, at, own);
      if (!keys.length) continue;
      // R27, R32: a pool brings its card; a card brings what's pinned to it.
      const r = game.get(i.rid) as PieceRecord | undefined;
      if (r?.kind === 'character') {
        let card = at;
        if (i.part === 'pool') {
          const mat = table.pool(i.rid);
          card = r.gathered && mat ? { x: at.x, y: at.y + mat.offsetHeight + GATHER_GAP } : { x: r.card.x + at.x - r.pool.x, y: r.card.y + at.y - r.pool.y };
          keys.push(...this.#hold(i.rid, i.rid, card, own));
        }
        for (const [r2, o] of game.all()) {
          const q = o as PieceRecord;
          if ('kind' in q && pinnable(q) && q.pin?.card === r.oid) keys.push(...this.#hold(r2, r2, { x: card.x + q.pin.dx, y: card.y + q.pin.dy }, own));
        }
      }
      pieces.set(key, { rid: i.rid, keys: [...new Set(keys)], aim: i.aim, t: ++this.#t, own });
    }
    this.react();
  }

  /** Holds one piece at `at`, lifting it first if it isn't held; the keys it holds. */
  #hold(key: string, rid: Rid, at: { x: number; y: number }, own: boolean): string[] {
    const { table } = this.#w;
    if (!table.held(key)) {
      const el = key.endsWith('#pool') ? table.pool(rid) : table.element(rid) ?? table.handFor(rid);
      if (!el) return [];
      table.lift(key, el, at);
    }
    const el = table.held(key)!;
    el.classList.toggle('carried', !own);
    table.place(key, at);
    return [key];
  }

  // Seq: seq-move.md#2.1 | R300: this page's let go at once; another page's wait for the drop's change.
  /** The hand let go of these pieces, here. */
  drop(hand: string, items: MoveItem[], own: boolean): void {
    const pieces = this.#hands.get(hand);
    if (!pieces) return;
    if (own) { for (const key of [...pieces.keys()]) this.#release(hand, key); this.react(false); return; }
    this.show(hand, items.map(({ aim: _, ...i }) => i), false);
    for (const i of items) {
      const key = i.part === 'pool' ? `${i.rid}#pool` : i.rid, p = pieces.get(key);
      if (p) p.landing = setTimeout(() => this.#land(hand, key), LAND_MS);
    }
    this.react(false);
  }

  // R301: a page that leaves lets go of what it held.
  /** Lets go of everything `hand` holds. */
  leave(hand: string): void {
    const pieces = this.#hands.get(hand);
    if (!pieces) return;
    for (const key of [...pieces.keys()]) this.#land(hand, key);
    this.#hands.delete(hand);
  }

  // Seq: seq-move.md#2.2: let go, and drawn where its record says.
  #land(hand: string, key: string): void {
    const p = this.#hands.get(hand)?.get(key);
    if (!p) return;
    this.#release(hand, key);
    this.#w.table.render(p.keys.map(k => k.replace(/#pool$/, '')));
    this.react(false);
  }

  #release(hand: string, key: string): void {
    const pieces = this.#hands.get(hand), p = pieces?.get(key);
    if (!p) return;
    if (p.landing) clearTimeout(p.landing);
    pieces!.delete(key);
    for (const k of p.keys) { const el = this.#w.table.held(k); if (el) this.#unchip(el); this.#w.table.letGo(k); }
  }

  // Seq: seq-drag.md#1.4 | R299, R222, R240, R244, R243: every hand's aims, latest last; only what
  // differs from what's drawn is drawn.
  /** Draws what the aims do. Run again after every redraw (a drawer's redraw drops its gap). */
  react(animate = true): void {
    const { table, game } = this.#w;
    const lit = new Set<HTMLElement>(), gaps = new Map<HTMLElement, number>(), strips = new Map<HTMLElement, { at: SlotName; from: SlotName | null }>();
    const chips = new Map<HTMLElement, Item>();
    const all = [...this.#hands.values()].flatMap(m => [...m.values()]).sort((a, b) => a.t - b.t);
    for (const p of all) {
      const a = p.aim;
      if (!a) continue;
      const pool = (oid: string) => table.pool(ridOf(oid));
      let target: HTMLElement | null | undefined = null;
      if (a.slot) target = pool(a.slot.owner)?.querySelector<HTMLElement>(`.slot-${a.slot.name}`);
      else if (a.drawer) {
        target = pool(a.drawer.owner)?.querySelector<HTMLElement>('.drawer');
        if (target && a.drawer.at !== undefined) gaps.set(target, a.drawer.at);
      } else if (a.kill) target = pool(a.kill)?.querySelector<HTMLElement>('.kill');
      else if (a.merge) target = table.held(a.merge) ? null : table.handFor(a.merge, false);
      else if (a.card) target = table.element(a.card);
      if (target) lit.add(target);
      if (a.reach) { const m = pool(a.reach.owner); if (m) strips.set(m, { at: a.reach.at, from: a.reach.from }); }
      const el = table.held(p.rid), i = game.get(p.rid) as Item | undefined;
      if (a.chip && el && i?.kind === 'influence') chips.set(el, i);
    }
    for (const e of this.#lit) if (!lit.has(e)) e.classList.remove('over');
    for (const e of lit) e.classList.add('over');
    this.#lit = lit;
    for (const d of this.#gaps) if (!gaps.has(d)) showGap(d, null, animate);
    for (const [d, at] of gaps) showGap(d, at, animate);
    this.#gaps = new Set(gaps.keys());
    for (const m of table.pools()) { const s = strips.get(m); reach(m, s?.at ?? null, s?.from ?? null); }
    for (const e of [...this.#chips.keys()]) if (!chips.has(e)) this.#unchip(e);
    for (const [e, i] of chips) {
      if (this.#chips.has(e)) continue;
      const carried = e.classList.contains('carried');
      this.#chips.set(e, { cls: e.className, kids: [...e.childNodes], title: e.title });
      asChip(e, i);
      e.classList.add('obj', 'lifted');
      e.classList.toggle('carried', carried);
    }
  }

  /** Puts a card shown as a chip back to its own look. */
  #unchip(e: HTMLElement): void {
    const was = this.#chips.get(e);
    if (!was) return;
    this.#chips.delete(e);
    const carried = e.classList.contains('carried');
    e.className = was.cls; e.replaceChildren(...was.kids); e.title = was.title;
    e.classList.toggle('carried', carried);
  }

  /** Whether `rid` is shown as a chip in a hand now. */
  chip(rid: Rid): boolean { const e = this.#w.table.held(rid); return !!e && this.#chips.has(e); }
}
