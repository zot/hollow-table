// CRC: crc-Drag.md | Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.6, seq-drag.md#1.7 | R27, R179, R183
// Lifting, carrying and dropping, and deciding what a drop means. While carried, a piece goes to the
// room every 100 ms (Moves); the drop is one Game.change. This part moves paper and pins it; pools,
// the bar and Boot Hill add their drop targets as they land.

import type { Game } from '../model/game.ts';
import { ridOf, type Character, type PieceRecord, type Pin, type Place, type Rid } from '../model/records.ts';
import type { MoveItem, Moves } from '../net/moves.ts';
import type { PointerLike } from './gesture.ts';
import { placeOf } from './piece.ts';
import type { TableView } from './table.ts';

export type DragWith = { game: Game; table: TableView; moves: Moves | null };

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
    // R27: what's pinned to a card travels with it.
    const carried: Carried[] = [{ rid, el, from: at, ...(rec.kind === 'character' && { part: 'card' }) }];
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
        if (r.kind === 'character') { w.put(c.rid, { ...r, card: moved(r.card) }); continue; }
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
