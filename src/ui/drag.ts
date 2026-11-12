// CRC: crc-Drag.md | Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.4, seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R27, R30, R32, R48, R55, R57, R60, R179, R183
// Lifting, carrying and dropping, and deciding what a drop means. While carried, a piece goes to the
// room every 100 ms (Moves); the drop is one Game.change. This part moves paper and pins it; pools,
// the bar and Boot Hill add their drop targets as they land.

import type { Game } from '../model/game.ts';
import { ridOf, type Character, type Influence, type Oid, type PieceRecord, type Pin, type Place, type Rid, type SlotName } from '../model/records.ts';
import { feedFrom, killCard, tapOut, toDrawer, toSlot, toTable, vanish, type Change } from './actions.ts';
import type { MoveItem, Moves } from '../net/moves.ts';
import type { PointerLike } from './gesture.ts';
import { placeOf } from './piece.ts';
import type { TableView } from './table.ts';

export type DragWith = { game: Game; table: TableView; moves: Moves | null; mint: () => () => Oid };

/** How close a carried chip or card comes to a pool before the pool widens (R30). */
export const NEAR_PX = 60;

type Carried = { rid: Rid; el: HTMLElement; from: Place; part?: string };

const pinnable = (r: PieceRecord): r is Extract<PieceRecord, { pin?: Pin }> =>
  r.kind === 'sticky' || r.kind === 'text' || r.kind === 'image';

export class Drag {
  #w: DragWith;
  constructor(w: DragWith) { this.#w = w; }

  /** The highest z on the table, so a dropped piece lands on top. */
  #top(): number {
    let z = 0;
    for (const [, r] of this.#w.game.all()) { const at = 'kind' in r ? placeOf(r as PieceRecord) : null; if (at) z = Math.max(z, at.z); }
    return z + 1;
  }

  // Seq: seq-drag.md#1.2: lift; seq-drag.md#1.3: carry; seq-drag.md#1.6: drop.
  /** Carries a piece from the press that started it, and what's pinned to it. */
  start(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, table, moves } = this.#w;
    const rec = game.get(rid) as PieceRecord | undefined, at = rec && placeOf(rec), el = table.element(rid);
    if (!rec || !at || !el) return;
    const doc = el.ownerDocument;
    // R32: a card dragged alone leaves its pool from where it was drawn (gathered, under the drawer).
    const drawn: Place = rec.kind === 'character' && rec.gathered ? { ...at, x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : at;
    // R27: what's pinned to a card travels with it.
    const carried: Carried[] = [{ rid, el, from: drawn, ...(rec.kind === 'character' && { part: 'card' }) }];
    if (rec.kind === 'character') {
      for (const [r2, other] of game.all()) {
        const o = other as PieceRecord;
        if ('kind' in o && pinnable(o) && o.pin?.card === rec.oid) {
          const e2 = table.element(r2);
          if (e2) carried.push({ rid: r2, el: e2, from: o.place });
        }
      }
    }
    const p0 = table.toWorld(down.clientX, down.clientY);
    for (const c of carried) { c.el.classList.add('lifted'); c.el.classList.remove('glide'); moves?.hold(c.rid); }
    doc.body.classList.add('dragging');
    const z = this.#top();
    const items = (dx: number, dy: number): MoveItem[] => carried.slice(0, 8).map(c => ({
      rid: c.rid, x: Math.round(c.from.x + dx), y: Math.round(c.from.y + dy), z, ...(c.part && { part: c.part }),
    }));
    const delta = (e: PointerLike) => { const p = table.toWorld(e.clientX, e.clientY); return { dx: p.x - p0.x, dy: p.y - p0.y }; };
    const show = (dx: number, dy: number) => {
      for (const c of carried) { c.el.style.left = `${c.from.x + dx}px`; c.el.style.top = `${c.from.y + dy}px`; }
    };
    const onMove = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      const { dx, dy } = delta(e);
      show(dx, dy);
      moves?.drag(items(dx, dy));
    };
    const onUp = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('pointercancel', onUp);
      doc.body.classList.remove('dragging');
      const { dx, dy } = delta(e);
      for (const c of carried) { c.el.classList.remove('lifted'); c.el.classList.add('glide'); }
      moves?.drop(items(dx, dy));
      this.#drop(rec, carried, dx, dy, z, e);
      for (const c of carried) moves?.release(c.rid);
    };
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onUp);
    onMove(move);
  }

  // R32: dragging a pool by its name brings its gathered card (and what's pinned to it).
  /** Carries a character's pool. */
  startPool(rid: Rid, down: PointerLike, _move: PointerLike): void {
    const { game, table, moves } = this.#w;
    const c = game.get(rid) as Character | undefined, mat = table.pool(rid);
    if (!c || c.kind !== 'character' || !mat) return;
    const doc = mat.ownerDocument, z = this.#top();
    const carried: Carried[] = [{ rid, el: mat, from: c.pool, part: 'pool' }];
    const card = table.element(rid);
    const followers = c.gathered && card ? [card, ...this.#pinned(c)] : [];
    const start = followers.map(e => ({ e, x: parseFloat(e.style.left), y: parseFloat(e.style.top) }));
    const p0 = table.toWorld(down.clientX, down.clientY);
    mat.classList.add('lifted'); mat.classList.remove('glide');
    moves?.hold(rid);
    doc.body.classList.add('dragging');
    const delta = (e: PointerLike) => { const p = table.toWorld(e.clientX, e.clientY); return { dx: p.x - p0.x, dy: p.y - p0.y }; };
    const item = (dx: number, dy: number): MoveItem[] => [{ rid, x: Math.round(c.pool.x + dx), y: Math.round(c.pool.y + dy), z, part: 'pool' }];
    const show = (dx: number, dy: number) => {
      mat.style.left = `${c.pool.x + dx}px`; mat.style.top = `${c.pool.y + dy}px`;
      for (const f of start) { f.e.style.left = `${f.x + dx}px`; f.e.style.top = `${f.y + dy}px`; }
    };
    this.#follow(doc, down, e => { const { dx, dy } = delta(e); show(dx, dy); moves?.drag(item(dx, dy)); }, e => {
      doc.body.classList.remove('dragging');
      mat.classList.remove('lifted'); mat.classList.add('glide');
      const { dx, dy } = delta(e);
      moves?.drop(item(dx, dy));
      this.#drop(c, carried, dx, dy, z, e);
      moves?.release(rid);
    });
  }

  /** Pieces pinned to a character's card. */
  #pinned(c: Character): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const [rid, r] of this.#w.game.all()) {
      const o = r as PieceRecord;
      if ('kind' in o && pinnable(o) && o.pin?.card === c.oid) { const e = this.#w.table.element(rid); if (e) out.push(e); }
    }
    return out;
  }

  /** Follows one pointer on the document until it lets go. */
  #follow(doc: Document, down: PointerLike, onMove: (e: PointerLike) => void, onUp: (e: PointerLike) => void): void {
    const move = (ev: Event) => { const e = ev as PointerLike; if (e.pointerId === down.pointerId) onMove(e); };
    const up = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', up);
      onUp(e);
    };
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', up);
  }

  // Seq: seq-drag.md#1.4: a pool widens as a chip or card comes near; only that one.
  #widen(x: number, y: number): void {
    for (const mat of this.#w.table.pools()) {
      const r = mat.getBoundingClientRect();
      const near = x > r.left - NEAR_PX && x < r.right + NEAR_PX * 4 && y > r.top - NEAR_PX && y < r.bottom + NEAR_PX;
      mat.classList.toggle('wide', near);
    }
  }

  /** A ghost of what's carried, under the pointer, outside the table's transform. */
  #ghost(doc: Document, from: HTMLElement | null, text: string): HTMLElement {
    const g = (from?.cloneNode(true) as HTMLElement | undefined) ?? doc.createElement('div');
    if (!from) g.textContent = text;
    g.classList.add('ghost');
    g.style.cssText = 'position:fixed;pointer-events:none;z-index:1000001;left:0;top:0;';
    doc.body.append(g);
    return g;
  }

  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R49, R60: in this order: a slot,
  // a drawer, the kill box, the bar, else the table.
  /** Carries a chip or an Influence card (from a slot, a drawer, a pile or the table). */
  startItem(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, mint } = this.#w;
    const i = game.get(rid) as Influence | undefined;
    if (!i) return;
    const doc = (down.target as Node | null)?.ownerDocument ?? document;
    const src = (down.target as HTMLElement | null)?.closest?.('[data-rid]') as HTMLElement | null;
    const ghost = this.#ghost(doc, src, '');
    if (src) src.style.visibility = 'hidden';
    this.#carry(doc, ghost, { x: 12, y: 12 }, down, move, e => {
      if (src) src.style.visibility = '';
      const change = this.#itemDrop(rid, e, mint());
      if (change) game.change(change);
    });
  }

  /** Carries a ghost under the pointer, widening the pool it nears, until it is let go. */
  #carry(doc: Document, ghost: HTMLElement, offset: { x: number; y: number }, down: PointerLike, move: PointerLike, onDrop: (e: PointerLike) => void): void {
    const at = (e: PointerLike) => { ghost.style.transform = `translate(${e.clientX - offset.x}px, ${e.clientY - offset.y}px)`; this.#widen(e.clientX, e.clientY); };
    doc.body.classList.add('dragging');
    at(move);
    this.#follow(doc, down, at, e => {
      doc.body.classList.remove('dragging');
      ghost.remove();
      for (const mat of this.#w.table.pools()) mat.classList.remove('wide');
      onDrop(e);
    });
  }

  /** Where a drop at the pointer lies on the table: on top of everything. */
  #placeAt(e: PointerLike): Place {
    const p = this.#w.table.toWorld(e.clientX, e.clientY);
    return { x: Math.round(p.x), y: Math.round(p.y), z: this.#top(), tilt: 0 };
  }

  #hits(e: PointerLike): HTMLElement[] {
    const doc = (e.target as Node | null)?.ownerDocument ?? document;
    return (doc.elementsFromPoint?.(e.clientX, e.clientY) ?? []) as HTMLElement[];
  }

  #itemDrop(rid: Rid, e: PointerLike, mint: () => Oid): Change | null {
    const { game } = this.#w, hits = this.#hits(e);
    const first = (sel: string) => { for (const h of hits) { const m = h.closest?.(sel) as HTMLElement | null; if (m) return m; } return null; };
    const slot = first('.slot');
    if (slot) return toSlot(game, rid, slot.dataset.owner!, slot.dataset.slot as SlotName, mint);
    if (first('.kill')) return killCard(game, rid);
    const drawer = first('.drawer');
    if (drawer) return toDrawer(game, rid, drawer.dataset.drawer!);
    if (first('#bar')) {
      const i = game.get(rid) as Influence;
      return i.kind === 'influence' ? toDrawer(game, rid, i.home) : vanish(game, rid);
    }
    return toTable(game, rid, this.#placeAt(e));
  }

  // R55, R57: a glyph dropped on a resource-made card feeds it; anywhere else it makes a card at Min.
  /** Carries a tap glyph (`<character oid>:<source>`). */
  startGlyph(source: string, down: PointerLike, move: PointerLike): void {
    const { game, mint } = this.#w;
    const doc = (down.target as Node | null)?.ownerDocument ?? document;
    const ghost = this.#ghost(doc, null, '▭');
    this.#carry(doc, ghost, { x: 6, y: 10 }, down, move, e => {
      const target = this.#hits(e).map(h => h.closest?.('.tapped[data-rid]') as HTMLElement | null).find(Boolean);
      const change = target ? feedFrom(game, target.dataset.rid!, source, mint())
        : tapOut(game, source, { table: this.#placeAt(e) }, mint());
      if (change) game.change(change);
    });
  }

  /** The card under the pointer, other than the piece itself. */
  #cardAt(e: PointerLike, not: HTMLElement): Character | undefined {
    const doc = not.ownerDocument;
    for (const hit of doc.elementsFromPoint?.(e.clientX, e.clientY) ?? []) {
      const card = (hit as HTMLElement).closest?.('.obj.card') as HTMLElement | null;
      if (card && card !== not) return this.#w.game.get(card.dataset.rid!) as Character | undefined;
    }
    return undefined;
  }

  // Seq: seq-drag.md#1.7 | R27: one change: the new places, pinned to a card or let go of one.
  #drop(rec: PieceRecord, carried: Carried[], dx: number, dy: number, z: number, e: PointerLike): void {
    const { game } = this.#w;
    const moved = (p: Place): Place => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    game.change(w => {
      for (const c of carried) {
        const r = game.get(c.rid) as PieceRecord | undefined;
        if (!r) continue;
        if (r.kind === 'character') {
          if (c.part === 'pool') w.put(c.rid, { ...r, pool: moved(r.pool) });
          else w.put(c.rid, { ...r, card: moved(c.from), gathered: false });
          continue;
        }
        if (!('place' in r)) continue;
        const place = moved(r.place);
        if (c.rid !== ridOf(rec.oid) || !pinnable(r)) { w.put(c.rid, { ...r, place }); continue; }
        const card = this.#cardAt(e, carried[0]!.el);
        const { pin: _old, ...loose } = r;
        w.put(c.rid, card ? { ...loose, place, pin: { card: card.oid, dx: place.x - card.card.x, dy: place.y - card.card.y } } : { ...loose, place });
      }
    });
  }
}
