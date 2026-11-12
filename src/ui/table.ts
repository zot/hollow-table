// CRC: crc-TableView.md | Seq: seq-save.md#1.4 | R2, R15, R16, R32, R33, R60, R128, R215
// The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
// DOM a view of the records. Panning and zooming are the seat's: they never touch the game.

import type { Game } from '../model/game.ts';
import { isPiece, ridOf, type Character, type PieceRecord, type Rid } from '../model/records.ts';
import { levelName } from '../rules/influence.ts';
import type { Item } from '../rules/pool.ts';
import { gesture, paced } from './gesture.ts';
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
  /** The next frame, or 100 ms in a hidden tab (R215). */
  schedule: (fn: () => void) => void;
};

export class TableView {
  #root: HTMLElement;
  #world: HTMLElement;
  #w: TableWith;
  #els = new Map<Rid, HTMLElement>();
  #pools = new Map<Rid, HTMLElement>();
  #loose = new Map<Rid, HTMLElement>();
  /** Chips and cards in hand (R220): skipped by pools and the loose layer until let go. */
  #held = new Map<Rid, HTMLElement>();
  /** Inside still(): a redraw that moves a piece doesn't glide (R226). */
  #still = false;
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
    // R226: a glide lasts until the piece arrives.
    world.addEventListener('transitionend', e => {
      const t = e.target as HTMLElement;
      if (t.parentElement === world && (e.propertyName === 'left' || e.propertyName === 'top')) t.classList.remove('glide');
    });
  }

  // R220: the hand.
  /** Holds a chip or card: into the world layer at `at`, squared up and raised, skipped by redraws. */
  lift(rid: Rid, el: HTMLElement, at: { x: number; y: number }): void {
    this.#held.set(rid, el);
    if (el.parentElement !== this.#world) this.#world.append(el);
    el.classList.add('obj', 'lifted');
    el.classList.remove('glide');
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    el.style.pointerEvents = 'none';   // hit tests see what's under it
    this.render([rid]);               // its pool, if it came from one, is drawn without it
  }

  /** Lets go of a held chip or card: back in the loose layer if it was loose, otherwise gone. */
  letGo(rid: Rid): void {
    const el = this.#held.get(rid);
    this.#held.delete(rid);
    if (!el) return;
    el.style.pointerEvents = '';
    el.classList.remove('lifted');
    if (this.#loose.get(rid) !== el) el.remove();
  }

  // R226, R217: what this page let go itself is drawn where it landed, without gliding.
  /** Runs `fn` (a change of this page's own) with gliding off. */
  still(fn: () => void): void {
    const was = this.#still;
    this.#still = true;
    try { fn(); } finally { this.#still = was; }
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
    const items = this.#items().filter(i => !this.#held.has(ridOf(i.oid)));
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
    if (this.#held.has(rid)) return;
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
    e.className = `obj loose-item ${i.kind === 'chip' ? `chip ${i.sign > 0 ? 'pos' : 'neg'}` : `icard ${i.sign > 0 ? 'pos' : 'neg'} tapped`}`;
    e.textContent = i.kind === 'chip' ? `${i.sign < 0 ? '−' : ''}${i.points}` : `${i.name} ${i.sign > 0 ? '+' : '−'}${levelName(i.points)}`;
    e.style.left = `${where.x}px`;
    e.style.top = `${where.y}px`;
    e.style.zIndex = String(where.z);
  }

  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids: Iterable<Rid>): void {
    // R226, R178: where everything was, so a piece another page moved slides to its new place.
    const was = new Map<HTMLElement, string>();
    for (const m of [this.#els, this.#pools, this.#loose]) for (const e of m.values()) was.set(e, `${e.style.left},${e.style.top}`);
    this.#render(rids);
    if (this.#still) return;
    for (const [e, at] of was) {
      if (e.isConnected && !e.classList.contains('lifted') && at !== ',' && at !== `${e.style.left},${e.style.top}`) e.classList.add('glide');
    }
  }

  #render(rids: Iterable<Rid>): void {
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
    // R215: a pan sets where the view is headed; the next frame places it. A wheel tick is an
    // increment, so it folds into the view at once, and only the placing and the saving are paced.
    const pan = paced<{ x: number; y: number }>(this.#w.schedule, ({ x, y }) => { this.view = { ...this.view, x, y }; this.#place(); });
    const zoomed = paced<View>(this.#w.schedule, v => { this.#place(); this.#w.keepView(v); });
    root.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      (doc.activeElement as HTMLElement | null)?.blur?.();
      from = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, id: e.pointerId };
      doc.body.classList.add('panning');
    });
    doc.addEventListener('pointermove', e => {
      if (!from || e.pointerId !== from.id) return;
      pan.to({ x: from.vx + e.clientX - from.x, y: from.vy + e.clientY - from.y });
    });
    const end = (e: PointerEvent) => {
      if (!from || e.pointerId !== from.id) return;
      from = null;
      pan.flush();
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
      zoomed.to(this.view);
    }, { passive: false });
  }
}
