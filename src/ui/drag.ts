// CRC: crc-Drag.md | Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.4, seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R215, R244, R240, R216, R217, R220, R221, R222, R223, R243, R225, R226, R21, R27, R32, R48, R55, R57, R60, R179, R183
// Lifting, carrying and dropping, and deciding what a drop means. While carried, a piece goes to the
// room every 100 ms (Moves); the drop is one Game.change. This part moves paper and pins it; pools,
// the bar and Boot Hill add their drop targets as they land.

import type { Game } from '../model/game.ts';
import { ridOf, type Character, type Oid, type PieceRecord, type Pin, type Place, type Rid, type SlotName } from '../model/records.ts';
import type { Item } from '../rules/pool.ts';
import { gapAt, reach, showGap } from './pool.ts';
import { killCard, mergeTap, tapOut, toDrawer, toSlot, toTable, vanish, type Change } from './actions.ts';
import type { MoveItem, Moves } from '../net/moves.ts';
import { paced, type PointerLike } from './gesture.ts';
import { placeOf } from './piece.ts';
import type { TableView } from './table.ts';

export type DragWith = {
  game: Game; table: TableView; moves: Moves | null; mint: () => () => Oid;
  /** The next frame, or 100 ms in a hidden tab (R215). */
  schedule: (fn: () => void) => void;
};


type Carried = { rid: Rid; el: HTMLElement; from: Place; part?: string };

/** The slot a carried chip or card came from (R244). */
type Source = { owner: Oid; slot: SlotName };

/** Where a carried chip or card would land, and the element lit for it (R222). */
type Target = { kind: 'merge' | 'slot' | 'kill' | 'drawer' | 'bar'; el: HTMLElement; at?: number };

/** How far into a tapped card its glyph's centre sits, the name after it (R225). */
const TAP_GLYPH_X = 10;

// R243: a card over the slots is a chip: its points in the middle, its name on hover.
function asChip(el: HTMLElement, i: Item): void {
  el.className = `loose-item chip ${i.sign > 0 ? 'pos' : 'neg'}`;
  el.textContent = `${i.sign < 0 ? '−' : ''}${i.points}`;
  if (i.kind === 'influence') el.title = i.name;
}

// R222: one place lit at a time.
function light(was: HTMLElement | null, now: HTMLElement | null): HTMLElement | null {
  if (was !== now) { was?.classList.remove('over'); now?.classList.add('over'); }
  return now;
}

// R223: picking something up leaves any writing and clears the text selection.
function leaveWriting(doc: Document): void {
  (doc.activeElement as HTMLElement | null)?.blur?.();
  doc.getSelection?.()?.removeAllRanges();
}

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
    leaveWriting(doc);
    for (const c of carried) { c.el.classList.add('lifted'); moves?.hold(c.rid); }
    doc.body.classList.add('dragging');
    const z = this.#top();
    const items = (dx: number, dy: number): MoveItem[] => carried.slice(0, 8).map(c => ({
      rid: c.rid, x: Math.round(c.from.x + dx), y: Math.round(c.from.y + dy), z, ...(c.part && { part: c.part }),
    }));
    const delta = (e: PointerLike) => { const p = table.toWorld(e.clientX, e.clientY); return { dx: p.x - p0.x, dy: p.y - p0.y }; };
    const show = (dx: number, dy: number) => {
      for (const c of carried) { c.el.style.left = `${c.from.x + dx}px`; c.el.style.top = `${c.from.y + dy}px`; }
    };
    // R222: a sticky, text or image lights the card it would pin to.
    let lit: HTMLElement | null = null;
    const pins = pinnable(rec);
    // R215: a move sets where the pieces are headed; the next frame puts them there.
    const pace = paced<{ dx: number; dy: number; cx: number; cy: number }>(this.#w.schedule, ({ dx, dy, cx, cy }) => {
      show(dx, dy);
      moves?.drag(items(dx, dy));
      if (pins) lit = light(lit, this.#cardAt(doc, cx, cy, el)?.el ?? null);
    });
    const onMove = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      pace.to({ ...delta(e), cx: e.clientX, cy: e.clientY });
    };
    const onUp = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('pointercancel', onUp);
      pace.cancel();
      light(lit, null);
      doc.body.classList.remove('dragging');
      const { dx, dy } = delta(e);
      for (const c of carried) c.el.classList.remove('lifted');
      moves?.drop(items(dx, dy));
      this.#drop(rec, carried, dx, dy, z, e);
      for (const c of carried) moves?.release(c.rid);
    };
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onUp);
    onMove(move);
    pace.flush();
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
    leaveWriting(doc);
    mat.classList.add('lifted');
    moves?.hold(rid);
    doc.body.classList.add('dragging');
    const delta = (e: PointerLike) => { const p = table.toWorld(e.clientX, e.clientY); return { dx: p.x - p0.x, dy: p.y - p0.y }; };
    const item = (dx: number, dy: number): MoveItem[] => [{ rid, x: Math.round(c.pool.x + dx), y: Math.round(c.pool.y + dy), z, part: 'pool' }];
    const show = (dx: number, dy: number) => {
      mat.style.left = `${c.pool.x + dx}px`; mat.style.top = `${c.pool.y + dy}px`;
      for (const f of start) { f.e.style.left = `${f.x + dx}px`; f.e.style.top = `${f.y + dy}px`; }
    };
    const pace = paced<{ dx: number; dy: number }>(this.#w.schedule, ({ dx, dy }) => { show(dx, dy); moves?.drag(item(dx, dy)); });
    this.#follow(doc, down, e => pace.to(delta(e)), e => {
      pace.cancel();
      doc.body.classList.remove('dragging');
      mat.classList.remove('lifted');
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

  // Seq: seq-drag.md#1.4 | R244: over a pool's slots, the strip under the pointer opens (trading
  // with the slot it came from, or an empty one); it stays open over open slots, and the pool goes
  // back when the carry leaves its slots.
  #reach(x: number, y: number, from: Source | null): void {
    for (const pool of this.#w.table.pools()) {
      const r = pool.querySelector('.slots')?.getBoundingClientRect();
      if (!r || x < r.left || x >= r.right || y < r.top || y >= r.bottom) { reach(pool, null, null); continue; }
      const under = [...pool.querySelectorAll<HTMLElement>('.slot')].find(s => {
        const b = s.getBoundingClientRect();
        return x >= b.left && x < b.right;
      });
      if (!under?.classList.contains('narrow')) continue;
      const fromHere = from && from.owner === under.dataset.owner ? from.slot : null;
      reach(pool, under.dataset.slot as SlotName, fromHere);
    }
  }

  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R49, R60, R220, R243: in this order:
  // a tap's merge, a slot, the kill box, a drawer, the bar, else the table.
  /** Carries a chip or an Influence card (from a slot, a drawer, a pile or the table): the piece itself. */
  startItem(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, table } = this.#w;
    const i = game.get(rid) as Item | undefined;
    const el = (down.target as HTMLElement | null)?.closest?.('[data-rid]') as HTMLElement | null;
    if (!i || !el) return;
    const r = el.getBoundingClientRect(), corner = table.toWorld(r.left, r.top), p = table.toWorld(down.clientX, down.clientY);
    // R244: the slot it came from, which pays for the strip it's carried over if it's left empty.
    const from = typeof i.where === 'object' && 'slot' in i.where ? { owner: i.where.slot, slot: i.where.name } : null;
    // R216, R243: held where it was pressed; a card stays a card in hand, a chip only over the slots.
    this.#carryItem(rid, el, { x: p.x - corner.x, y: p.y - corner.y }, down, move, from);
  }

  // R55, R225: the tap is a card from the first pixel, its Level spent, carried by its glyph; dropped
  // on a resource-made card it merges into it.
  /** Taps a glyph (`<character oid>:<source>`) and carries the card it makes. */
  startGlyph(source: string, down: PointerLike, move: PointerLike): void {
    const { game, table, mint } = this.#w;
    const oid = mint()(), rid = ridOf(oid), p = table.toWorld(down.clientX, down.clientY);
    const change = tapOut(game, source, { table: { x: Math.round(p.x), y: Math.round(p.y), z: this.#top(), tilt: 0 } }, () => oid);
    if (!change) return;
    table.still(() => game.change(change));
    const el = table.loose(rid);
    if (el) this.#carryItem(rid, el, { x: TAP_GLYPH_X, y: el.offsetHeight / 2 }, down, move);
  }

  /** Carries a held chip or card in the world layer, lighting where it would land, until let go. */
  #carryItem(rid: Rid, el: HTMLElement, grip: { x: number; y: number }, down: PointerLike, move: PointerLike, from: Source | null = null): void {
    const { game, table, mint } = this.#w;
    const doc = el.ownerDocument;
    // R243: a card in hand is a card, and a chip centred on the pointer only while over a pool's slots.
    const item = game.get(rid) as Item | undefined, isCard = item?.kind === 'influence' && el.classList.contains('icard');
    let chip = false, card: { cls: string; kids: Node[]; title: string } | null = null;
    const form = (cx: number, cy: number) => {
      const over = isCard && ((doc.elementsFromPoint?.(cx, cy) ?? []) as HTMLElement[]).some(h => h.closest?.('.slots'));
      if (over === chip || !item) return;
      chip = over;
      if (chip) { card = { cls: el.className, kids: [...el.childNodes], title: el.title }; asChip(el, item); el.classList.add('obj', 'lifted'); }
      else if (card) { el.className = card.cls; el.replaceChildren(...card.kids); el.title = card.title; }
    };
    // R216: the grip is kept in world coordinates, so the piece stays glued at any zoom.
    const at = (cx: number, cy: number) => {
      const p = table.toWorld(cx, cy), g = chip ? { x: el.offsetWidth / 2, y: el.offsetHeight / 2 } : grip;
      return { x: Math.round(p.x - g.x), y: Math.round(p.y - g.y) };
    };
    leaveWriting(doc);
    table.lift(rid, el, at(move.clientX, move.clientY));
    // R221: the pointing hand for the whole carry.
    doc.body.classList.add('dragging', 'tapping');
    let lit: HTMLElement | null = null, gapIn: HTMLElement | null = null;
    // R240: the gap follows the card from drawer to drawer.
    const gap = (t: Target | null) => {
      const into = t?.kind === 'drawer' && t.at !== undefined ? t : null;
      if (gapIn && gapIn !== into?.el) showGap(gapIn, null);
      if (into) showGap(into.el, into.at!);
      gapIn = into?.el ?? null;
    };
    // R215, R222, R244: a move sets where it's headed; the next frame puts it there, opens a strip,
    // lights the place it would land and opens the gap there.
    const pace = paced<{ x: number; y: number }>(this.#w.schedule, ({ x, y }) => {
      form(x, y);
      const a = at(x, y);
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
      this.#reach(x, y, from);
      const t = this.#itemTarget(rid, doc, x, y);
      lit = light(lit, t?.el ?? null);
      gap(t);
    });
    const to = (e: PointerLike) => pace.to({ x: e.clientX, y: e.clientY });
    to(move);
    pace.flush();
    this.#follow(doc, down, to, e => {
      pace.cancel();
      light(lit, null);
      doc.body.classList.remove('dragging', 'tapping');
      for (const pool of table.pools()) reach(pool, null, null);
      const t = this.#itemTarget(rid, doc, e.clientX, e.clientY);
      if (gapIn) showGap(gapIn, null, false);
      const place: Place = { ...at(e.clientX, e.clientY), z: this.#top(), tilt: 0 };
      table.letGo(rid);
      const change = this.#itemDrop(rid, t, place, mint());
      // R217, R226: drawn where it was let go, without gliding there.
      table.still(() => { if (change) game.change(change); });
      table.render([rid]);   // refused: back where its record says
    });
  }

  /** Where a carried chip or card would land at the pointer, and the element to light. */
  #itemTarget(rid: Rid, doc: Document, x: number, y: number): Target | null {
    const { game } = this.#w, i = game.get(rid) as Item | undefined;
    const hits = (doc.elementsFromPoint?.(x, y) ?? []) as HTMLElement[];
    const first = (sel: string) => { for (const h of hits) { const m = h.closest?.(sel) as HTMLElement | null; if (m) return m; } return null; };
    if (i?.kind === 'influence' && i.tap) {
      const into = first('.tapped[data-rid]');
      if (into && mergeTap(game, rid, into.dataset.rid!, () => '')) return { kind: 'merge', el: into };
    }
    const slot = first('.slot');
    if (slot) return { kind: 'slot', el: slot };
    const kill = first('.kill');
    if (kill) return { kind: 'kill', el: kill };
    const drawer = first('.drawer');
    // R240: where among its cards a card would go.
    if (drawer) return { kind: 'drawer', el: drawer, ...(i?.kind === 'influence' && { at: gapAt(drawer, x, y) }) };
    const bar = first('#bar');
    return bar ? { kind: 'bar', el: bar } : null;
  }

  #itemDrop(rid: Rid, t: Target | null, place: Place, mint: () => Oid): Change | null {
    const { game } = this.#w;
    switch (t?.kind) {
      case 'merge': return mergeTap(game, rid, t.el.dataset.rid!, mint);
      case 'slot': return toSlot(game, rid, t.el.dataset.owner!, t.el.dataset.slot as SlotName, mint);
      case 'kill': return killCard(game, rid);
      case 'drawer': return toDrawer(game, rid, t.el.dataset.drawer!, t.at);
      case 'bar': {
        const i = game.get(rid) as Item;
        return i.kind === 'influence' ? toDrawer(game, rid, i.home) : vanish(game, rid);
      }
      default: return toTable(game, rid, place);
    }
  }

  /** The card under the pointer, other than the piece itself, and its element. */
  #cardAt(doc: Document, x: number, y: number, not: HTMLElement): { card: Character; el: HTMLElement } | undefined {
    for (const hit of doc.elementsFromPoint?.(x, y) ?? []) {
      const el = (hit as HTMLElement).closest?.('.obj.card') as HTMLElement | null;
      const card = el && el !== not ? this.#w.game.get(el.dataset.rid!) as Character | undefined : undefined;
      if (el && card) return { card, el };
    }
    return undefined;
  }

  // Seq: seq-drag.md#1.7 | R27: one change: the new places, pinned to a card or let go of one.
  #drop(rec: PieceRecord, carried: Carried[], dx: number, dy: number, z: number, e: PointerLike): void {
    const { game } = this.#w;
    const moved = (p: Place): Place => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    // R217, R226: one change of this page's own, drawn where it was let go.
    this.#w.table.still(() => game.change(w => {
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
        const card = this.#cardAt(carried[0]!.el.ownerDocument, e.clientX, e.clientY, carried[0]!.el)?.card;
        const { pin: _old, ...loose } = r;
        w.put(c.rid, card ? { ...loose, place, pin: { card: card.oid, dx: place.x - card.card.x, dy: place.y - card.card.y } } : { ...loose, place });
      }
    }));
  }
}
