// CRC: crc-TableView.md | Seq: seq-save.md#1.4 | R2, R15, R16, R32, R33, R60, R128, R215, R220, R298, R269, R270, R271, R272, R273, R285, R419, R421, R438, R479, R480, R481, R482, R486, R534, R535, R537, R539, R542, R543, R568, R572, R571, R573, R575, R576
// The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
// DOM a view of the records. Panning and zooming are the seat's: they never touch the game.

import type { Game } from '../model/game.ts';
import { isPiece, isPinnable, onTable, ridOf, type Character, type Docket, type Oid, type PieceRecord, type Pinnable, type Rid } from '../model/records.ts';
import { path, pile, pileKeys, tapeOf, type Box as Rect, type Target } from '../rules/dockets.ts';
import { levelName } from '../rules/influence.ts';
import { cardClick, chipClick } from './actions.ts';
import type { Item } from '../rules/pool.ts';
import { claim, gesture, paced } from './gesture.ts';
import { draw, tiedHere, type PieceWith } from './piece.ts';
import { chipFace, drawPool, type Box, type PoolWith } from './pool.ts';

const SVG = 'http://www.w3.org/2000/svg';
/** A docket drawn here, with the papers pinned to it that this page holds, and its characters (R585). */
type DocketHere = { rid: Rid; d: Docket; papers: Rid[]; chars: Rid[] };

/** How far under its pool a gathered card sits (R33). */
export const GATHER_GAP = 14;

export type View = { x: number; y: number; zoom: number };
// R270: as the mockup: a step of exp(-deltaY × 0.0012), a quarter to two and a half times.
export const ZOOM_MIN = 0.25, ZOOM_MAX = 2.5, ZOOM_RATE = 0.0012;
/** A point on screen, relative to the table. */
export type Pt = { x: number; y: number };

// R479: a pinch is a sheet stuck to the fingers: the point under their midpoint stays under it, the
// zoom follows their spacing (within the wheel's limits), and nothing turns. Measured from where the
// pinch began, so it never drifts.
/** The view after fingers at a0, b0 (in view v) have moved to a1, b1. */
export function pinchView(v: View, a0: Pt, b0: Pt, a1: Pt, b1: Pt): View {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y), d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, d0 ? v.zoom * d1 / d0 : v.zoom));
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const k = zoom / v.zoom;
  return { x: m1.x - (m0.x - v.x) * k, y: m1.y - (m0.y - v.y) * k, zoom };
}

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
  /** Called after each placing of the view (R482). */
  #watchers = new Set<() => void>();
  /** R534: the red tapes, one SVG layer under the pieces, a path per docket; a tied docket's bow over its pile. */
  #tapeLayer: SVGSVGElement;
  #tapes = new Map<Rid, SVGPathElement>();
  #bows = new Map<Rid, HTMLElement>();
  /** R539: each piece leading a hand now, and the docket it is aimed at, if any (Hands). */
  #leads = new Map<Rid, Rid | undefined>();

  /** R271, R594: resolves once the view is settled: fitted on a first visit, else at once. */
  readonly settled: Promise<void>;
  #settle!: () => void;

  constructor(root: HTMLElement, world: HTMLElement, w: TableWith) {
    this.settled = new Promise(res => { this.#settle = res; });
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = w.view ? { ...w.view } : { x: 0, y: 0, zoom: 1 };
    this.#tapeLayer = world.ownerDocument.createElementNS(SVG, 'svg');
    this.#tapeLayer.classList.add('tapes');
    world.prepend(this.#tapeLayer);
    this.#place();
    w.game.listen(rids => this.render(rids));
    this.render(w.game.all().map(([rid]) => rid));
    this.#panZoom();
    this.#images();
    this.#raisePins();
    // R271: with no view kept, fit once the first draw has settled (pools sized, cards snapped).
    if (!w.view) w.schedule(() => w.schedule(() => { this.#fit(); this.#settle(); }));
    else this.#settle();
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
    const { game } = this.#w, c = game.get(rid) as Character | undefined, card = this.#els.get(rid), mat = this.#pools.get(rid);
    if (!c || c.kind !== 'character' || !card || !mat || !c.gathered || this.#held.has(rid)) return;
    card.style.left = `${c.pool.x}px`;
    card.style.top = `${c.pool.y + mat.offsetHeight + GATHER_GAP}px`;
    // R576: on the page holding the game, the card's record follows where it belongs (Gather, a drawer
    // growing or shrinking); the paper pinned to it follows the record (Dockets.repin). Not mid-carry.
    const at = this.gatheredAt(rid);
    if (!at || !game.get('book') || mat.ownerDocument.body.classList.contains('dragging')) return;
    const x = Math.round(at.x), y = Math.round(at.y);
    if (x !== c.card.x || y !== c.card.y) game.change(w => w.put(rid, { ...c, card: { ...c.card, x, y } }));
  }

  /** The height of this page's docked roll row in a mat, which is its own alone (R381). */
  #ownRow(mat: HTMLElement): number {
    const row = mat.querySelector<HTMLElement>('.roller');
    return row ? row.offsetHeight + parseFloat(getComputedStyle(row).marginBottom || '0') : 0;
  }

  // R575, R576: a gathered card belongs under its pool, a page's own docked roll row left out, so every
  // page puts it in the same place.
  /** Where a gathered card belongs, in table coordinates, or null when it isn't drawn here. */
  gatheredAt(rid: Rid): Pt | null {
    const c = this.#w.game.get(rid) as Character | undefined, mat = this.#pools.get(rid);
    if (!c || c.kind !== 'character' || !mat) return null;
    return { x: c.pool.x, y: c.pool.y + mat.offsetHeight - this.#ownRow(mat) + GATHER_GAP };
  }

  // R241: on the GM's page, a mat that grew pushes the pieces it now covers just clear below it, in
  // one change (they glide on every page). Not mid-carry: a drawer's gap is only there for a moment.
  #push(rid: Rid): void {
    const { game, viewer } = this.#w, mat = this.#pools.get(rid), c = game.get(rid) as Character | undefined;
    if (!mat || !c || c.kind !== 'character' || mat.ownerDocument.body.classList.contains('dragging')) return;
    // The docked roll row is this page's alone (R381): it never pushes anyone's pieces.
    const own = this.#ownRow(mat);
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

  #render(changed: Iterable<Rid>): void {
    const characters = new Set<Rid>(), game = this.#w.game;
    // R419, R421: a record or the Connection Table changing (or a piece going) redraws the cards, whose
    // folders show the records; R438: a player's too, which shows the records revealed to them.
    const rids = [...changed], kind = (rid: Rid) => (game.get(rid) as PieceRecord | undefined)?.kind;
    if (rids.some(rid => isPiece(rid) && (!game.get(rid) || kind(rid) === 'opinion' || kind(rid) === 'connections')))
      for (const [rid, r] of game.all()) if ((r as PieceRecord).kind === 'character' && !rids.includes(rid)) rids.push(rid);
    let items = false;
    for (const rid of rids) {
      if (!onTable(rid)) continue;   // R486: this page's torn rolls too
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
    // R451: the browser's own drag never starts from the table; WebKit's would take the pointer moves a carry needs.
    this.#root.addEventListener('dragstart', e => e.preventDefault());
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
      if (!e || !isPinnable(p)) continue;   // paper whose pin was taken out has no `pin`: its marks go too
      const holder = p.pin ? game.get(ridOf(p.pin.card)) as Character | Docket | undefined : undefined;
      e.classList.toggle('pinned', !!p.pin);
      // R568: pinned to a card, the paper shows its tack.
      e.classList.toggle('tacked', holder?.kind === 'character');
      if (!p.pin) { delete e.dataset.pin; continue; }
      e.dataset.pin = p.pin.card;
      let z: number | null = null;
      if (holder?.kind === 'character') z = holder.card.z;
      else if (holder?.kind === 'docket') z = holder.place.z;
      if (z !== null && 'place' in p) e.style.zIndex = String(Math.max(p.place.z, z + 1));
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

  // CRC: crc-TableView.md | R534, R535, R537, R539, R542, R543: the dockets' tapes and tied piles.
  /** A drawn piece's box in table coordinates. */
  box(rid: Rid): Rect | null {
    const e = this.#els.get(rid);
    if (!e) return null;
    const left = parseFloat(e.style.left), top = parseFloat(e.style.top);
    return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight };
  }

  /** The dockets drawn here, each with the papers pinned to it that this page holds (R535). */
  #dockets(): DocketHere[] {
    const all = this.#w.game.all(), out = new Map<Oid, DocketHere>();
    for (const [rid, r] of all) {
      const p = r as PieceRecord;
      if (p.kind === 'docket' && this.#els.has(rid)) out.set(p.oid, { rid, d: p, papers: [], chars: [] });
    }
    for (const [rid, r] of all) {
      const p = r as PieceRecord;
      if (isPinnable(p) && p.pin && this.#els.has(rid)) out.get(p.pin.card)?.papers.push(rid);
      else if (p.kind === 'character' && p.pin && this.#els.has(rid)) out.get(p.pin.card)?.chars.push(rid);
    }
    return [...out.values()];
  }

  /** The boxes a docket's tape goes round: its label, its papers and its characters' cards (piled, when
   * tied, pools and all, R588), less `leave`. */
  #boxes(k: DocketHere, leave: Rid | null, tied: boolean): Rect[] {
    const label = this.box(k.rid);
    if (!label) return [];
    const papers = k.papers.filter(r => r !== leave), chars = k.chars.filter(r => r !== leave);
    if (!tied) return [label, ...[...papers, ...chars].flatMap(r => this.box(r) ?? [])];
    return [label, ...[...this.#pile(label, papers, chars)].flatMap(([key, p]) => {
      const e = this.#elOf(key);
      return e ? [{ left: p.x, top: p.y, right: p.x + e.offsetWidth, bottom: p.y + e.offsetHeight }] : [];
    })];
  }

  /** A pile key's element: a pool mat for `rid#pool`, else the piece's. */
  #elOf(key: string): HTMLElement | undefined {
    return key.endsWith('#pool') ? this.#pools.get(key.slice(0, -5)) : this.#els.get(key);
  }

  // R542, R588: where a tied docket's papers and characters lie, piled under its label.
  #pile(label: Rect, papers: Rid[], chars: Rid[]): Map<string, { x: number; y: number }> {
    const game = this.#w.game, all = game.all();
    const items = [
      ...papers.map(r => ({ rid: r, z: (game.get(r) as { place: { z: number } }).place.z })),
      ...chars.map(r => {
        const c = game.get(r) as Character;
        const on = all.filter(([r2, q]) => isPinnable(q as PieceRecord) && (q as Pinnable).pin?.card === c.oid && this.#els.has(r2)).map(([r2]) => r2);
        return { rid: r, z: c.card.z, on };
      }),
    ];
    return pile(label, pileKeys(items).map((rid, z) => ({ rid, z })));
  }

  // R536, R538, R539, R543: the dockets a carried piece may join, each tape drawn without it.
  /** Every docket on this page as the aim sees it, `carried` left out of each tape. */
  targets(carried: Rid): Target[] {
    const tied = tiedHere(this.#w.game);
    return this.#dockets().filter(k => k.rid !== carried)
      .map(k => ({ oid: k.d.oid, z: k.d.place.z, tape: tapeOf(this.#boxes(k, carried, tied.has(k.d.oid))) }));
  }

  // R534, R539, R542: each docket's tape round its label and papers; a carried paper only while aimed at
  // it. A tied docket's papers lie piled under the label (marked piled), its bow over them.
  /** Draws the tapes, the pieces leading hands now (and their aims) given by Hands. */
  tapes(leads?: Map<Rid, Rid | undefined>): void {
    if (leads) this.#leads = leads;
    const doc = this.#tapeLayer.ownerDocument, tied = tiedHere(this.#w.game), seen = new Set<Rid>();
    const piled = new Set<HTMLElement>();
    for (const k of this.#dockets()) {
      seen.add(k.rid);
      const isTied = tied.has(k.d.oid);
      this.#els.get(k.rid)?.classList.toggle('tied', isTied);
      // A paper or card of this docket in hand is in its tape only while aimed back at it; another aimed at it is in.
      const back = (r: Rid) => !this.#leads.has(r) || this.#leads.get(r) === k.rid;
      const kept = k.papers.filter(back), keptChars = k.chars.filter(back);
      const boxes = this.#boxes({ ...k, papers: kept, chars: keptChars }, null, isTied);
      for (const [r, at] of this.#leads) if (at === k.rid && !k.papers.includes(r) && !k.chars.includes(r)) { const b = this.box(r); if (b) boxes.push(b); }
      if (isTied) {
        const label = this.box(k.rid), free = (r: Rid) => !this.#leads.has(r) && !this.#held.has(r);
        if (label) for (const [key, p] of this.#pile(label, k.papers.filter(free), k.chars.filter(free))) {
          const e = this.#elOf(key);
          if (!e || this.#held.has(key)) continue;
          e.style.left = `${p.x}px`; e.style.top = `${p.y}px`;
          piled.add(e);
        }
      }
      let line = this.#tapes.get(k.rid);
      if (!line) { line = doc.createElementNS(SVG, 'path'); this.#tapeLayer.append(line); this.#tapes.set(k.rid, line); }
      line.setAttribute('d', path(tapeOf(boxes)));
      this.#bow(k.rid, isTied ? boxes.slice(1) : [], [...k.papers, ...k.chars]);
    }
    for (const [rid, line] of this.#tapes) if (!seen.has(rid)) { line.remove(); this.#tapes.delete(rid); this.#bow(rid, [], []); }
    // Untied, or out of the docket: back where its record says.
    for (const e of this.#world.querySelectorAll<HTMLElement>('.obj.piled')) {
      if (piled.has(e)) continue;
      e.classList.remove('piled');
      const rid = e.dataset.rid!, r = this.#w.game.get(rid) as PieceRecord | undefined, pool = e.classList.contains('pool');
      if (!r || this.#held.has(pool ? `${rid}#pool` : rid)) continue;
      const at = r.kind === 'character' ? (pool ? r.pool : r.card) : 'place' in r ? r.place : null;
      if (at) { e.style.left = `${at.x}px`; e.style.top = `${at.y}px`; }
      if (r.kind === 'character' && !pool) this.#snap(rid);   // R33: a gathered card back under its pool
    }
    for (const e of piled) e.classList.add('piled');
  }

  // R542: the red tape crossed over a tied pile in a bow, above its papers.
  #bow(rid: Rid, pileBoxes: Rect[], papers: Rid[]): void {
    let b = this.#bows.get(rid);
    if (!pileBoxes.length) { b?.remove(); this.#bows.delete(rid); return; }
    if (!b) { b = this.#world.ownerDocument.createElement('div'); b.className = 'bow'; this.#world.append(b); this.#bows.set(rid, b); }
    const left = Math.min(...pileBoxes.map(x => x.left)), top = Math.min(...pileBoxes.map(x => x.top));
    const right = Math.max(...pileBoxes.map(x => x.right)), bottom = Math.max(...pileBoxes.map(x => x.bottom));
    const z = Math.max(0, ...papers.map(r => parseInt(this.#els.get(r)?.style.zIndex || '0', 10)));
    Object.assign(b.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px`, zIndex: String(z + 1) });
  }

  // R572, R571: the pin line, from the middle of a paper's tack (its tilt counted) to a card's middle or
  // the pointer, under the paper and over its card: one below the paper's height.
  #pin: SVGLineElement | null = null;
  /** Draws the pin line from the tack of paper `rid`, its corner at `at`, to `to`, raising `cards`; or takes it away. */
  pinLine(rid: Rid | null, at?: Pt, to?: Pt, cards: Rid[] = []): void {
    const e = rid ? this.#els.get(rid) : undefined;
    // R573: the cards it ends at raised, and the paper above them, over every other piece; down again after.
    for (const x of this.#world.querySelectorAll('.pinraised, .pinpaper')) x.classList.remove('pinraised', 'pinpaper');
    if (!e || !at || !to) { this.#pin?.ownerSVGElement?.remove(); this.#pin = null; return; }
    for (const c of cards) this.#els.get(c)?.classList.add('pinraised');
    e.classList.add('pinpaper');
    if (!this.#pin) {
      const doc = this.#world.ownerDocument, svg = doc.createElementNS(SVG, 'svg');
      svg.classList.add('pinline');
      this.#pin = doc.createElementNS(SVG, 'line');
      svg.append(this.#pin);
      this.#world.append(svg);
    }
    const m = new DOMMatrix(getComputedStyle(e).transform), turn = Math.atan2(m.b, m.a), h = e.offsetHeight / 2;
    // The tack is at the top middle: the paper's middle, then half its height up, turned by its tilt.
    const from = { x: at.x + e.offsetWidth / 2 + h * Math.sin(turn), y: at.y + h - h * Math.cos(turn) };
    const l = this.#pin, f = (n: number) => String(Math.round(n));
    l.ownerSVGElement!.style.zIndex = String((parseInt(getComputedStyle(e).zIndex, 10) || 1) - 1);
    l.setAttribute('x1', f(from.x)); l.setAttribute('y1', f(from.y)); l.setAttribute('x2', f(to.x)); l.setAttribute('y2', f(to.y));
  }

  /** Screen to table coordinates, for drops. */
  toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.#root.getBoundingClientRect();
    return { x: (clientX - r.left - this.view.x) / this.view.zoom, y: (clientY - r.top - this.view.y) / this.view.zoom };
  }

  #place(): void {
    this.#world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
  }

  // R482: a carry under a pinch re-frames when the view moves beneath its still finger.
  /** Calls `fn` after each move of the view; returns a function that stops it. */
  onView(fn: () => void): () => void {
    this.#watchers.add(fn);
    return () => this.#watchers.delete(fn);
  }

  /** Places the view and tells the watchers. */
  #moved(): void {
    this.#place();
    for (const fn of [...this.#watchers]) fn();
  }

  // R15: drag empty table to pan; the wheel zooms about the pointer. R16: a press that no piece
  // takes (a pool's empty space beside its name included) lands here. R479-R482: two fingers pinch.
  #panZoom(): void {
    const root = this.#root, doc = root.ownerDocument;
    // Every finger down on the table, and whether a piece holds it (a carry, or a control's own).
    const fingers = new Map<number, { at: Pt; held: boolean }>();
    let from: { x: number; y: number; vx: number; vy: number; id: number } | null = null;
    let pinch: { v: View; a: number; b: number; a0: Pt; b0: Pt } | null = null;
    // R215: a pan sets where the view is headed; the next frame places it. A wheel tick is an
    // increment, so it folds into the view at once, and only the placing and the saving are paced.
    const pan = paced<Pt>(this.#w.schedule, ({ x, y }) => { this.view = { ...this.view, x, y }; this.#moved(); });
    const look = paced<View>(this.#w.schedule, v => { this.view = v; this.#moved(); });
    const zoomed = paced<View>(this.#w.schedule, v => { this.#moved(); this.#w.keepView(v); });
    const local = (e: PointerEvent): Pt => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const panFrom = (id: number, at: Pt) => {
      from = { x: at.x, y: at.y, vx: this.view.x, vy: this.view.y, id };
      doc.body.classList.add('panning');
    };
    const settle = () => {
      pan.flush();
      look.flush();
      doc.body.classList.remove('panning');
      this.#w.keepView(this.view);
    };
    // R480, R481, R482: seen before any piece: a second finger is the table's and starts a pinch.
    root.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      fingers.delete(e.pointerId);   // a mouse let go outside the window never said so
      if (fingers.size >= 2) { e.stopPropagation(); return; }   // a third finger does nothing
      const at = local(e);
      if (fingers.size === 0) { fingers.set(e.pointerId, { at, held: true }); return; }
      e.stopPropagation();
      const [id, first] = [...fingers][0]!;
      if (first.held && claim(id)) first.held = false;
      fingers.set(e.pointerId, { at, held: false });
      if (from) { pan.flush(); from = null; }
      pinch = { v: { ...this.view }, a: id, b: e.pointerId, a0: first.at, b0: at };
      doc.body.classList.add('panning');
    }, { capture: true });
    root.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      (doc.activeElement as HTMLElement | null)?.blur?.();
      const f = fingers.get(e.pointerId);
      if (f) f.held = false;
      panFrom(e.pointerId, local(e));
    });
    doc.addEventListener('pointermove', e => {
      const f = fingers.get(e.pointerId);
      if (f) f.at = local(e);
      if (pinch && f) {
        look.to(pinchView(pinch.v, pinch.a0, pinch.b0, fingers.get(pinch.a)!.at, fingers.get(pinch.b)!.at));
      } else if (from && e.pointerId === from.id) {
        const at = local(e);
        pan.to({ x: from.vx + at.x - from.x, y: from.vy + at.y - from.y });
      }
    });
    const end = (e: PointerEvent) => {
      if (!fingers.delete(e.pointerId) && !(from && e.pointerId === from.id)) return;
      if (pinch && (e.pointerId === pinch.a || e.pointerId === pinch.b)) {
        const rest = e.pointerId === pinch.a ? pinch.b : pinch.a, f = fingers.get(rest);
        pinch = null;
        settle();
        if (f && !f.held) panFrom(rest, f.at);   // R480: the other finger pans on from where it is
      } else if (from && e.pointerId === from.id) {
        from = null;
        settle();
      }
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
