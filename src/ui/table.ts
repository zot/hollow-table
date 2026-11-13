// CRC: crc-TableView.md | Seq: seq-save.md#1.4 | R2, R15, R16, R32, R33, R60, R128, R215, R220, R298, R269, R270, R271, R272, R273, R285
// The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
// DOM a view of the records. Panning and zooming are the seat's: they never touch the game.

import type { Game } from '../model/game.ts';
import { isPiece, ridOf, type Character, type PieceRecord, type Rid } from '../model/records.ts';
import { levelName } from '../rules/influence.ts';
import { cardClick, chipClick } from './actions.ts';
import type { Item } from '../rules/pool.ts';
import { gesture, paced } from './gesture.ts';
import { draw, type PieceWith } from './piece.ts';
import { chipFace, drawPool, type Box, type PoolWith } from './pool.ts';

/** How far under its pool a gathered card sits (R33). */
export const GATHER_GAP = 14;

export type View = { x: number; y: number; zoom: number };
// R270: as the mockup: a step of exp(-deltaY × 0.0012), a quarter to two and a half times.
export const ZOOM_MIN = 0.25, ZOOM_MAX = 2.5, ZOOM_RATE = 0.0012;
/** A box in world coordinates. */
export type Bounds = { left: number; top: number; right: number; bottom: number };

// R271: a first visit fits everything into the window: centred, at most full size, a margin round it.
/** The view that shows `b` in a table of `size`: zoom at most 1, 20 px a side, 14 px from the top. */
export function fitView(b: Bounds, size: { w: number; h: number }): View {
  const bw = b.right - b.left, bh = b.bottom - b.top;
  const zoom = Math.max(ZOOM_MIN, Math.min(1, (size.w - 40) / bw, (size.h - 30) / bh));
  return { x: (size.w - bw * zoom) / 2 - b.left * zoom, y: 14 - b.top * zoom, zoom };
}

// CRC: crc-TableView.md | R241
/** The pieces a mat covers, and how far down each must slide to sit just clear below it. */
export function pushClear(mat: Box, pieces: readonly { rid: Rid; box: Box }[], gap = GATHER_GAP): { rid: Rid; dy: number }[] {
  return pieces
    .filter(({ box: b }) => b.left < mat.right && b.right > mat.left && b.top < mat.bottom && b.bottom > mat.top)
    .map(({ rid, box }) => ({ rid, dy: mat.bottom + gap - box.top }));
}

export type TableWith = PieceWith & PoolWith & {
  game: Game;
  /** The view (the Seat's), and where to keep it. */
  view: View | null;
  keepView: (v: View) => void;
  /** Stores an image file's bytes and puts an Image record at `at` (R272). */
  addImage: (file: File, at: { x: number; y: number }) => void;
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
  /** What is in a hand (R220), this page's or another's, by rid or `rid#pool`: skipped by redraws. */
  #held = new Map<string, { el: HTMLElement; at: { x: number; y: number } }>();
  /** Run after every redraw (Hands draws its reactions again). */
  after: (() => void) | null = null;
  /** Inside still(): a redraw that moves a piece doesn't glide (R226). */
  #still = false;
  #sized = new ResizeObserver(entries => {
    for (const e of entries) { const rid = (e.target as HTMLElement).dataset.rid; if (rid) { this.#snap(rid); this.#push(rid); } }
  });
  /** Each mat's height when last seen outside a carry (R241). */
  #heights = new Map<Rid, number>();
  view: View;

  constructor(root: HTMLElement, world: HTMLElement, w: TableWith) {
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = w.view ? { ...w.view } : { x: 0, y: 0, zoom: 1 };
    this.#place();
    w.game.listen(rids => this.render(rids));
    this.render(w.game.all().map(([rid]) => rid));
    this.#panZoom();
    this.#images();
    this.#raisePins();
    // R271: with no view kept, fit once the first draw has settled (pools sized, cards snapped).
    if (!w.view) w.schedule(() => w.schedule(() => this.#fit()));
    // R226: a glide lasts until the piece arrives.
    world.addEventListener('transitionend', e => {
      const t = e.target as HTMLElement;
      if (t.parentElement === world && (e.propertyName === 'left' || e.propertyName === 'top')) t.classList.remove('glide');
    });
  }

  // CRC: crc-TableView.md | R220, R298: the hand, this page's or another's (Hands).
  /** Holds a piece (`rid`, or `rid#pool`): into the world layer at `at`, squared up and raised, skipped by redraws. */
  lift(key: string, el: HTMLElement, at: { x: number; y: number }): void {
    this.#held.set(key, { el, at });
    if (el.parentElement !== this.#world) this.#world.append(el);
    el.classList.add('obj', 'lifted');
    el.classList.remove('glide');
    el.style.pointerEvents = 'none';   // hit tests see what's under it
    this.place(key, at);
    if (!key.endsWith('#pool')) this.render([key]);   // its pool, if it came from one, is drawn without it
  }

  /** Puts a held piece at `at`. */
  place(key: string, at: { x: number; y: number }): void {
    const h = this.#held.get(key);
    if (!h) return;
    h.at = at;
    h.el.style.left = `${at.x}px`;
    h.el.style.top = `${at.y}px`;
  }

  /** What holds `key`, if it's held. */
  held(key: string): HTMLElement | undefined { return this.#held.get(key)?.el; }

  /**
   * Lets go of a held piece: a chip or card back in the loose layer if it was loose, and gone if it
   * was a hand's own; paper, cards and pools stay, for their record to draw.
   */
  letGo(key: string): void {
    const h = this.#held.get(key);
    this.#held.delete(key);
    if (!h) return;
    const { el } = h;
    el.style.pointerEvents = '';
    el.classList.remove('lifted', 'carried');
    const rid = key.replace(/#pool$/, '');
    if (this.#loose.get(rid) !== el && this.#els.get(rid) !== el && this.#pools.get(rid) !== el) el.remove();
  }

  /**
   * The element drawing a chip or card, wherever it lies (a slot, a drawer, loose), or a new one
   * shaped as a loose one for a piece drawn only in a pile.
   */
  handFor(rid: Rid, make = true): HTMLElement | undefined {
    const i = this.#w.game.get(rid) as Item | undefined;
    if (!i || (i.kind !== 'chip' && i.kind !== 'influence')) return undefined;
    const drawn = this.#loose.get(rid) ?? this.#world.querySelector<HTMLElement>(`.pool [data-rid="${rid}"]`);
    if (drawn || !make) return drawn ?? undefined;
    const e = this.#world.ownerDocument.createElement('div');
    e.dataset.rid = rid;
    this.#shape(e, i);
    return e;
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
  /** Every pool mat, for opening the strip a carry is over (R244). */
  pools(): HTMLElement[] { return [...this.#pools.values()]; }

  #items(): Item[] {
    return this.#w.game.all().map(([, r]) => r).filter((r): r is Item => 'kind' in r && (r.kind === 'chip' || r.kind === 'influence'));
  }

  // R33: a gathered card is drawn under its pool's drawer, wherever that ends; the same on every page.
  #snap(rid: Rid): void {
    const c = this.#w.game.get(rid) as Character | undefined, card = this.#els.get(rid), mat = this.#pools.get(rid);
    if (!c || c.kind !== 'character' || !card || !mat || !c.gathered || this.#held.has(rid)) return;
    card.style.left = `${c.pool.x}px`;
    card.style.top = `${c.pool.y + mat.offsetHeight + GATHER_GAP}px`;
  }

  // R241: on the GM's page, a mat that grew pushes the pieces it now covers just clear below it, in
  // one change (they glide on every page). Not mid-carry: a drawer's gap is only there for a moment.
  #push(rid: Rid): void {
    const { game, viewer } = this.#w, mat = this.#pools.get(rid), c = game.get(rid) as Character | undefined;
    if (!mat || !c || c.kind !== 'character' || mat.ownerDocument.body.classList.contains('dragging')) return;
    // The docked roll row is this page's alone (R68): it never pushes anyone's pieces.
    const row = mat.querySelector<HTMLElement>('.roller'), own = row ? row.offsetHeight + parseFloat(getComputedStyle(row).marginBottom || '0') : 0;
    const h = mat.offsetHeight - own, was = this.#heights.get(rid);
    this.#heights.set(rid, h);
    if (was === undefined || h <= was || !viewer?.gm) return;
    const box = (e: HTMLElement, less = 0): Box => {
      const left = parseFloat(e.style.left), top = parseFloat(e.style.top);
      return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight - less };
    };
    const pieces: { rid: Rid; box: Box }[] = [];
    for (const [r, e] of this.#els) {
      const p = game.get(r) as PieceRecord | undefined;
      if (!p || r === rid || (p.kind === 'character' ? p.gathered : 'pin' in p && !!p.pin)) continue;   // they follow their pool or card
      pieces.push({ rid: r, box: box(e) });
    }
    for (const [r, e] of this.#pools) if (r !== rid) pieces.push({ rid: `${r}#pool`, box: box(e) });
    for (const [r, e] of this.#loose) pieces.push({ rid: r, box: box(e) });
    const moves = pushClear(box(mat, own), pieces);
    if (!moves.length) return;
    game.change(w => {
      const out = new Map<Rid, PieceRecord>();
      const cur = (r: Rid) => out.get(r) ?? game.get(r) as PieceRecord;
      const down = <P extends { y: number }>(p: P, dy: number): P => ({ ...p, y: Math.round(p.y + dy) });
      for (const { rid: key, dy } of moves) {
        const pool = key.endsWith('#pool'), r = pool ? key.slice(0, -5) : key, p = cur(r);
        if (p.kind === 'character' && pool) out.set(r, { ...p, pool: down(p.pool, dy) });
        else if (p.kind === 'character') {
          out.set(r, { ...p, card: down(p.card, dy) });
          for (const [r2, o] of game.all()) {   // what's pinned to the card comes with it
            const q = o as PieceRecord;
            if ('kind' in q && 'pin' in q && q.pin?.card === p.oid && 'place' in q) out.set(r2, { ...q, place: down(q.place, dy) } as PieceRecord);
          }
        } else if ('place' in p) out.set(r, { ...p, place: down(p.place, dy) } as PieceRecord);
        else if ((p.kind === 'chip' || p.kind === 'influence') && typeof p.where === 'object' && 'table' in p.where) {
          out.set(r, { ...p, where: { table: down(p.where.table, dy) } } as PieceRecord);
        }
      }
      for (const [r, p] of out) w.put(r, p);
    });
  }

  #drawPools(rids: Rid[]): void {
    const items = this.#items().filter(i => !this.#held.has(ridOf(i.oid)));
    for (const rid of rids) {
      const c = this.#w.game.get(rid) as Character | undefined, old = this.#pools.get(rid);
      if (!c || c.kind !== 'character') { if (old) { this.#sized.unobserve(old); old.remove(); this.#pools.delete(rid); } continue; }
      const e = drawPool(c, items, old, this.#w);
      if (e !== old) { this.#world.append(e); this.#pools.set(rid, e); this.#sized.observe(e); }
      // R220: a pool in hand keeps its place in the hand; its contents are still drawn.
      const held = this.#held.get(`${rid}#pool`);
      if (held) { e.style.left = `${held.at.x}px`; e.style.top = `${held.at.y}px`; }
      this.#snap(rid);
    }
  }

  // R60: a chip or a tap can lie loose on the table.
/** A loose chip's or card's look: a chip's face, or a card's name and Level (returned, for its clicks). */
  #shape(e: HTMLElement, i: Item): HTMLElement | null {
    e.className = `obj loose-item ${i.kind === 'chip' ? `chip ${i.sign > 0 ? 'pos' : 'neg'}` : `icard ${i.sign > 0 ? 'pos' : 'neg'} tapped`}`;
    if (i.kind === 'chip') { e.textContent = chipFace(i); return null; }
    const level = e.ownerDocument.createElement('button');
    level.className = 'level';
    level.textContent = `${i.sign > 0 ? '+' : '−'}${levelName(i.points)}`;
    e.replaceChildren(`${i.name} `, level);
    return level;
  }

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
      // R40, R42: a loose chip answers clicks as in a slot (a loose card's Level does, R269).
      const click = (shift: boolean) => {
        if ((this.#w.game.get(rid) as Item | undefined)?.kind !== 'chip') return;
        const ch = chipClick(this.#w.game, rid, shift, this.#w.mint());
        if (ch) this.#w.game.change(ch);
      };
      gesture(e, { click: () => click(false), shift: () => click(true), drag: (d, m) => this.#w.dragItem(rid, d, m) });
      this.#world.append(e);
      this.#loose.set(rid, e);
    }
    const level = this.#shape(e, i);
    if (level) {
      // R269: a loose card's Level answers clicks as in a drawer.
      const click = (shift: boolean) => { const ch = cardClick(this.#w.game, rid, shift, this.#w.mint()); if (ch) this.#w.game.change(ch); };
      gesture(level, { click: () => click(false), shift: () => click(true) });
    }
    e.style.left = `${where.x}px`;
    e.style.top = `${where.y}px`;
    e.style.zIndex = String(where.z);
  }

  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids: Iterable<Rid>): void {
    // R226: where everything was, so a piece another page changed slides to its new place.
    const was = new Map<HTMLElement, string>();
    for (const m of [this.#els, this.#pools, this.#loose]) for (const e of m.values()) was.set(e, `${e.style.left},${e.style.top}`);
    this.#render(rids);
    if (!this.#still) {
      for (const [e, at] of was) {
        if (e.isConnected && !e.classList.contains('lifted') && at !== ',' && at !== `${e.style.left},${e.style.top}`) e.classList.add('glide');
      }
    }
    this.after?.();
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
      // R220: a piece in hand isn't redrawn under it; the drop draws it (gone, it still goes).
      if (r && this.#held.has(rid)) continue;
      const e = r ? draw(r, old, this.#w) : null;
      if (!e) {
        if (old) { old.remove(); this.#els.delete(rid); if (old.dataset.blob) this.#w.imageGone(old.dataset.blob); }
        continue;
      }
      if (e !== old) { old?.remove(); this.#world.append(e); this.#els.set(rid, e); }
    }
    this.#pinZ();
    // A chip or card changing can change any pool (it may have moved between two).
    if (!items) { this.#drawPools([...characters]); return; }
    const pools = new Set<Rid>();
    for (const [rid, r] of this.#w.game.all()) if ((r as PieceRecord).kind === 'character') pools.add(rid);
    for (const rid of this.#pools.keys()) pools.add(rid);
    this.#drawPools([...pools]);
  }

  #fit(): void {
    const els = [...this.#world.children].filter((e): e is HTMLElement => e instanceof HTMLElement && !e.classList.contains('lifted'));
    if (!els.length) return;
    const b: Bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const e of els) {
      b.left = Math.min(b.left, e.offsetLeft); b.top = Math.min(b.top, e.offsetTop);
      b.right = Math.max(b.right, e.offsetLeft + e.offsetWidth); b.bottom = Math.max(b.bottom, e.offsetTop + e.offsetHeight);
    }
    const r = this.#root.getBoundingClientRect();
    this.view = fitView(b, { w: r.width, h: r.height });
    this.#place();
    this.#w.keepView(this.view);
  }

  // R272: image files dropped from the desktop, each where it was dropped, a step of 24 apart.
  #images(): void {
    this.#root.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
    this.#root.addEventListener('drop', e => {
      const files = [...(e.dataTransfer?.files ?? [])].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      const p = this.toWorld(e.clientX, e.clientY);
      files.forEach((f, i) => this.#w.addImage(f, { x: Math.round(p.x + i * 24), y: Math.round(p.y + i * 24) }));
    });
  }

  // R273: pinned paper lies on its card: at least one above it, and over it while the card is written on.
  #pinZ(): void {
    const game = this.#w.game;
    for (const [rid, r] of game.all()) {
      const p = r as PieceRecord, e = this.#els.get(rid);
      if (!e || !('pin' in p)) continue;
      e.classList.toggle('pinned', !!p.pin);
      if (!p.pin) { delete e.dataset.pin; continue; }
      const card = game.get(ridOf(p.pin.card)) as Character | undefined;
      e.dataset.pin = p.pin.card;
      if (card?.kind === 'character' && 'place' in p) e.style.zIndex = String(Math.max(p.place.z, card.card.z + 1));
    }
  }

  #raisePins(): void {
    const mark = (e: FocusEvent, on: boolean) => {
      const card = (e.target as HTMLElement).closest?.('.obj.card') as HTMLElement | null;
      const oid = card?.dataset.rid?.slice(2);
      if (oid) for (const p of this.#world.querySelectorAll<HTMLElement>(`.obj.pinned[data-pin="${oid}"]`)) p.classList.toggle('atop', on);
    };
    this.#root.addEventListener('focusin', e => mark(e, true));
    this.#root.addEventListener('focusout', e => mark(e, false));
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
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.view.zoom * Math.exp(-e.deltaY * ZOOM_RATE)));
      const k = zoom / this.view.zoom;
      this.view = { x: px - (px - this.view.x) * k, y: py - (py - this.view.y) * k, zoom };
      zoomed.to(this.view);
    }, { passive: false });
  }
}
