// CRC: crc-TableView.md | Seq: seq-save.md#1.4 | R2, R15, R16, R32, R33, R60, R128
// The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
// DOM a view of the records. Panning and zooming are the seat's: they never touch the game.

import type { Game } from '../model/game.ts';
import { isPiece, type Character, type PieceRecord, type Rid } from '../model/records.ts';
import { levelName } from '../rules/influence.ts';
import type { Item } from '../rules/pool.ts';
import { gesture } from './gesture.ts';
import { draw, type PieceWith } from './piece.ts';
import { drawPool, type PoolWith } from './pool.ts';

/** How far under its pool a gathered card sits (R33). */
export const GATHER_GAP = 14;

export type View = { x: number; y: number; zoom: number };
export const ZOOM_MIN = 0.25, ZOOM_MAX = 3;

export type TableWith = PieceWith & PoolWith & {
  game: Game;
  /** The view (the Seat's), and where to keep it. */
  view: View;
  keepView: (v: View) => void;
};

export class TableView {
  #root: HTMLElement;
  #world: HTMLElement;
  #w: TableWith;
  #els = new Map<Rid, HTMLElement>();
  #pools = new Map<Rid, HTMLElement>();
  #loose = new Map<Rid, HTMLElement>();
  #sized = new ResizeObserver(entries => {
    for (const e of entries) { const rid = (e.target as HTMLElement).dataset.rid; if (rid) this.#snap(rid); }
  });
  view: View;

  constructor(root: HTMLElement, world: HTMLElement, w: TableWith) {
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = { ...w.view };
    this.#place();
    w.game.listen(rids => this.render(rids));
    this.render(w.game.all().map(([rid]) => rid));
    this.#panZoom();
  }

  /** The element drawing a piece (a character's card), if any. */
  element(rid: Rid): HTMLElement | undefined { return this.#els.get(rid); }
  /** A character's pool mat, or a chip or card lying loose on the table. */
  pool(rid: Rid): HTMLElement | undefined { return this.#pools.get(rid); }
  loose(rid: Rid): HTMLElement | undefined { return this.#loose.get(rid); }
  /** Every pool mat, for widening as something is carried near (R30). */
  pools(): HTMLElement[] { return [...this.#pools.values()]; }

  #items(): Item[] {
    return this.#w.game.all().map(([, r]) => r).filter((r): r is Item => 'kind' in r && (r.kind === 'chip' || r.kind === 'influence'));
  }

  // R33: a gathered card is drawn under its pool's drawer, wherever that ends; the same on every page.
  #snap(rid: Rid): void {
    const c = this.#w.game.get(rid) as Character | undefined, card = this.#els.get(rid), mat = this.#pools.get(rid);
    if (!c || c.kind !== 'character' || !card || !mat || !c.gathered) return;
    card.style.left = `${c.pool.x}px`;
    card.style.top = `${c.pool.y + mat.offsetHeight + GATHER_GAP}px`;
  }

  #drawPools(rids: Rid[]): void {
    const items = this.#items();
    for (const rid of rids) {
      const c = this.#w.game.get(rid) as Character | undefined, old = this.#pools.get(rid);
      if (!c || c.kind !== 'character') { if (old) { this.#sized.unobserve(old); old.remove(); this.#pools.delete(rid); } continue; }
      const e = drawPool(c, items, old, this.#w);
      if (e !== old) { this.#world.append(e); this.#pools.set(rid, e); this.#sized.observe(e); }
      this.#snap(rid);
    }
  }

  // R60: a chip or a tap can lie loose on the table.
  #drawLoose(rid: Rid): void {
    const i = this.#w.game.get(rid) as Item | undefined, old = this.#loose.get(rid);
    const where = i && typeof i.where === 'object' && 'table' in i.where ? i.where.table : null;
    if (!i || !where) { old?.remove(); this.#loose.delete(rid); return; }
    const doc = this.#world.ownerDocument;
    let e = old;
    if (!e) {
      e = doc.createElement('div');
      e.dataset.rid = rid;
      gesture(e, { drag: (d, m) => this.#w.dragItem(rid, d, m) });
      this.#world.append(e);
      this.#loose.set(rid, e);
    }
    e.className = `obj glide loose-item ${i.kind === 'chip' ? `chip ${i.sign > 0 ? 'pos' : 'neg'}` : `icard ${i.sign > 0 ? 'pos' : 'neg'} tapped`}`;
    e.textContent = i.kind === 'chip' ? `${i.sign < 0 ? '−' : ''}${i.points}` : `${i.name} ${i.sign > 0 ? '+' : '−'}${levelName(i.points)}`;
    e.style.left = `${where.x}px`;
    e.style.top = `${where.y}px`;
    e.style.zIndex = String(where.z);
  }

  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids: Iterable<Rid>): void {
    const characters = new Set<Rid>();
    let items = false;
    for (const rid of rids) {
      if (!isPiece(rid)) continue;
      const r = this.#w.game.get(rid) as PieceRecord | undefined;
      if (!r || r.kind === 'character') characters.add(rid);
      if (!r || r.kind === 'chip' || r.kind === 'influence') { items = true; this.#drawLoose(rid); if (r) continue; }
      const old = this.#els.get(rid);
      const e = r ? draw(r, old, this.#w) : null;
      if (!e) {
        if (old) { old.remove(); this.#els.delete(rid); if (old.dataset.blob) this.#w.imageGone(old.dataset.blob); }
        continue;
      }
      if (e !== old) { old?.remove(); this.#world.append(e); this.#els.set(rid, e); }
    }
    // A chip or card changing can change any pool (it may have moved between two).
    if (!items) { this.#drawPools([...characters]); return; }
    const pools = new Set<Rid>();
    for (const [rid, r] of this.#w.game.all()) if ((r as PieceRecord).kind === 'character') pools.add(rid);
    for (const rid of this.#pools.keys()) pools.add(rid);
    this.#drawPools([...pools]);
  }

  /** Screen to table coordinates, for drops. */
  toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.#root.getBoundingClientRect();
    return { x: (clientX - r.left - this.view.x) / this.view.zoom, y: (clientY - r.top - this.view.y) / this.view.zoom };
  }

  #place(): void {
    this.#world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
  }

  // R15: drag empty table to pan; the wheel zooms about the pointer. R16: a press that no piece
  // takes (a pool's empty space beside its name included) lands here.
  #panZoom(): void {
    const root = this.#root, doc = root.ownerDocument;
    let from: { x: number; y: number; vx: number; vy: number; id: number } | null = null;
    root.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      (doc.activeElement as HTMLElement | null)?.blur?.();
      from = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, id: e.pointerId };
      doc.body.classList.add('panning');
    });
    doc.addEventListener('pointermove', e => {
      if (!from || e.pointerId !== from.id) return;
      this.view = { ...this.view, x: from.vx + e.clientX - from.x, y: from.vy + e.clientY - from.y };
      this.#place();
    });
    const end = (e: PointerEvent) => {
      if (!from || e.pointerId !== from.id) return;
      from = null;
      doc.body.classList.remove('panning');
      this.#w.keepView(this.view);
    };
    doc.addEventListener('pointerup', end);
    doc.addEventListener('pointercancel', end);
    root.addEventListener('wheel', e => {
      e.preventDefault();
      const r = root.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.view.zoom * Math.exp(-e.deltaY * 0.0015)));
      const k = zoom / this.view.zoom;
      this.view = { x: px - (px - this.view.x) * k, y: py - (py - this.view.y) * k, zoom };
      this.#place();
      this.#w.keepView(this.view);
    }, { passive: false });
  }
}
