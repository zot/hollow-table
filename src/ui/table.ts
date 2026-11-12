// CRC: crc-TableView.md | Seq: seq-save.md#1.4 | R2, R15, R16, R128
// The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
// DOM a view of the records. Panning and zooming are the seat's: they never touch the game.

import type { Game } from '../model/game.ts';
import { isPiece, type PieceRecord, type Rid } from '../model/records.ts';
import { draw, type PieceWith } from './piece.ts';

export type View = { x: number; y: number; zoom: number };
export const ZOOM_MIN = 0.25, ZOOM_MAX = 3;

export type TableWith = PieceWith & {
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

  /** The element drawing a piece, if any. */
  element(rid: Rid): HTMLElement | undefined { return this.#els.get(rid); }

  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids: Iterable<Rid>): void {
    for (const rid of rids) {
      if (!isPiece(rid)) continue;
      const r = this.#w.game.get(rid) as PieceRecord | undefined, old = this.#els.get(rid);
      const e = r ? draw(r, old, this.#w) : null;
      if (!e) {
        if (old) { old.remove(); this.#els.delete(rid); if (old.dataset.blob) this.#w.imageGone(old.dataset.blob); }
        continue;
      }
      if (e !== old) { old?.remove(); this.#world.append(e); this.#els.set(rid, e); }
    }
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
