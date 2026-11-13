// CRC: crc-Drag.md | Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.3.1, seq-drag.md#1.4, seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R298, R299, R300, R211, R260, R215, R244, R240, R216, R217, R220, R221, R222, R223, R243, R225, R226, R21, R27, R32, R251, R48, R55, R57, R60, R183, R285, R119, R122, R288
// Lifting, carrying and dropping, and deciding what a drop means. Everything is carried one way
// (carry): each frame works out the piece's place and aim, which Hands draws on this page and Moves
// sends to the room; the drop is one Game.change. Each kind gives only its place, aim and drop.

import type { Game } from '../model/game.ts';
import { ridOf, type Character, type Oid, type PieceRecord, type Pin, type Place, type Rid, type SlotName, type Yards } from '../model/records.ts';
import type { Item } from '../rules/pool.ts';
import { gapAt } from './pool.ts';
import { killCard, mergeTap, tapOut, toDrawer, toSlot, toTable, vanish, type Change } from './actions.ts';
import { burialOf, bury, empty, graveName } from '../rules/yards.ts';
import type { Aim, MoveItem, Moves } from '../net/moves.ts';
import { paced, type PointerLike } from './gesture.ts';
import type { Hands } from './hands.ts';
import { placeOf } from './piece.ts';
import type { TableView } from './table.ts';

export type DragWith = {
  game: Game; table: TableView; hands: Hands; moves: Moves | null; mint: () => () => Oid;
  /** This page's own hand (its tab). */
  hand: string;
  /** The next frame, or 100 ms in a hidden tab (R215). */
  schedule: (fn: () => void) => void;
  /** The graveyard being browsed (the Seat), where a put-away piece is buried (R122, R288). */
  yard: () => { cur: number; name: string };
};

/** The slot a carried chip or card came from (R244). */
type Source = { owner: Oid; slot: SlotName };

/** Where the piece is for a pointer, and what it's aimed at. */
type Frame = { x: number; y: number; aim?: Aim };

/** What one kind of carry gives: the rest is the same for everything (carry). */
type Carry = {
  rid: Rid;
  part?: 'pool' | 'card';
  /** For a chip or card: the element in hand (the one pressed). */
  el?: HTMLElement;
  frame: (cx: number, cy: number) => Frame;
  /** Whether letting go over the bar buries it (R288). */
  buries: boolean;
  /** The pointing hand on the whole page (R221). */
  pointing?: boolean;
  /** What the drop changes, from the last frame; `away` is over the bar. */
  drop: (last: Frame, away: boolean, z: number) => Change | null;
  done?: () => void;
};

/** How far into a tapped card its glyph's centre sits, the name after it (R225). */
const TAP_GLYPH_X = 10;

// R223: picking something up leaves any writing and clears the text selection.
function leaveWriting(doc: Document): void {
  (doc.activeElement as HTMLElement | null)?.blur?.();
  doc.getSelection?.()?.removeAllRanges();
}

const pinnable = (r: PieceRecord): r is Extract<PieceRecord, { pin?: Pin }> =>
  r.kind === 'sticky' || r.kind === 'text' || r.kind === 'image';

/** A world point minus a grip, rounded. */
const less = (p: { x: number; y: number }, g: { x: number; y: number }) => ({ x: Math.round(p.x - g.x), y: Math.round(p.y - g.y) });

export class Drag {
  #w: DragWith;
  constructor(w: DragWith) { this.#w = w; }

  /** The highest z on the table, so a dropped piece lands on top. */
  #top(): number {
    let z = 0;
    for (const [, r] of this.#w.game.all()) { const at = 'kind' in r ? placeOf(r as PieceRecord) : null; if (at) z = Math.max(z, at.z); }
    return z + 1;
  }

  // Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.3.1, seq-drag.md#1.6 | R298, R299, R300, R215,
  // R217, R223, R183: the one carry. Each frame: the place and aim, drawn by Hands here and sent
  // through Moves; at the release, let go everywhere, then the drop's one change.
  #carry(c: Carry, down: PointerLike, move: PointerLike): void {
    const { game, table, hands, moves, hand } = this.#w;
    const doc = (c.el ?? table.element(c.rid) ?? table.pool(c.rid))?.ownerDocument;
    if (!doc) return;
    leaveWriting(doc);
    const z = this.#top();
    const item = (f: Frame): MoveItem => ({ rid: c.rid, x: f.x, y: f.y, z, ...(c.part && { part: c.part }), ...(f.aim && { aim: f.aim }) });
    let last = c.frame(move.clientX, move.clientY);
    if (c.el) table.lift(c.rid, c.el, last);
    moves?.hold(c.rid);
    doc.body.classList.add('dragging');
    if (c.pointing) doc.body.classList.add('tapping');
    // R215: a move sets where it's headed; the next frame puts it there.
    const pace = paced<{ cx: number; cy: number }>(this.#w.schedule, ({ cx, cy }) => {
      last = c.frame(cx, cy);
      hands.show(hand, [item(last)], true);
      moves?.drag([item(last)]);
      this.#lightBar(doc, cy, c.buries);
    });
    const to = (e: PointerLike) => pace.to({ cx: e.clientX, cy: e.clientY });
    to(move);
    pace.flush();
    this.#follow(doc, down, to, e => {
      pace.cancel();
      last = c.frame(e.clientX, e.clientY);
      const away = this.#overBar(doc, e.clientY);
      this.#lightBar(doc, null, false);
      doc.body.classList.remove('dragging', 'tapping');
      hands.drop(hand, [], true);
      // R300: the drop is a move; its change goes out right after it.
      moves?.drop([item(last)]);
      const change = c.drop(last, away, z);
      // R217, R226: drawn where it was let go, without gliding there.
      table.still(() => { if (change) game.change(change); });
      moves?.release(c.rid);
      table.render([c.rid]);   // nothing changed: back where its record says
      c.done?.();
    });
  }

  // Seq: seq-drag.md#1.2 | R27, R32, R222: paper, or a character's card (what's pinned to it follows,
  // Hands); paper is aimed at the card it would pin to.
  /** Carries a piece from the press that started it, and what's pinned to it. */
  start(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, table } = this.#w;
    const rec = game.get(rid) as PieceRecord | undefined, at = rec && placeOf(rec), el = table.element(rid);
    if (!rec || !at || !el) return;
    // R32: a card dragged alone leaves its pool from where it was drawn (gathered, under the drawer).
    const from: Place = rec.kind === 'character' && rec.gathered ? { ...at, x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : at;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - from.x, y: p0.y - from.y };
    const pins = pinnable(rec);
    this.#carry({
      rid, ...(rec.kind === 'character' && { part: 'card' as const }),
      frame: (cx, cy) => {
        const f: Frame = less(table.toWorld(cx, cy), grip), card = pins ? this.#cardAt(el.ownerDocument, cx, cy, el) : undefined;
        return card ? { ...f, aim: { card: ridOf(card.oid) } } : f;
      },
      buries: rec.kind !== 'reference' && !this.#fresh.has(rid),
      drop: (last, away, z) => away ? this.#putAway(rec) : this.#drop(rec, 'card', from, last, z, last.aim),
    }, down, move);
  }

  // R32, R251: dragging a pool brings its card, gathered or not, and what's pinned to it (Hands).
  /** Carries a character's pool. */
  startPool(rid: Rid, down: PointerLike, move: PointerLike, done?: () => void): void {
    const { game, table } = this.#w;
    const c = game.get(rid) as Character | undefined;
    if (!c || c.kind !== 'character' || !table.pool(rid)) return;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - c.pool.x, y: p0.y - c.pool.y };
    let away = false;
    this.#carry({
      rid, part: 'pool',
      frame: (cx, cy) => less(table.toWorld(cx, cy), grip),
      buries: !this.#fresh.has(rid),
      drop: (last, over, z) => { away = over; return over ? this.#putAway(c) : this.#drop(c, 'pool', c.pool, last, z); },
      done: () => { if (!away) done?.(); },
    }, down, move);
  }

  // Seq: seq-drag.md#1.2 | R220, R287: the chip or card itself, found by its rid when the press was
  // elsewhere (a chip just taken from the bar was pressed on the supply).
  /** Carries a chip or an Influence card (from a slot, a drawer, a pile or the table): the piece itself. */
  startItem(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, table } = this.#w;
    const i = game.get(rid) as Item | undefined;
    const pressed = (down.target as HTMLElement | null)?.closest?.('[data-rid]') as HTMLElement | null;
    const el = pressed?.dataset.rid === rid ? pressed : table.loose(rid) ?? pressed;
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

  // R216, R243, R221: a chip or card, glued at its grip (in world coordinates, so at any zoom); a card
  // over a pool's slots is a chip centred on the pointer.
  #carryItem(rid: Rid, el: HTMLElement, grip: { x: number; y: number }, down: PointerLike, move: PointerLike, from: Source | null = null): void {
    const { game, table, hands, hand, mint } = this.#w;
    const doc = el.ownerDocument, item = game.get(rid) as Item | undefined;
    const isCard = item?.kind === 'influence' && el.classList.contains('icard');
    let strip: Aim['reach'];
    this.#carry({
      rid, el, pointing: true, buries: false,
      frame: (cx, cy) => {
        const aim = this.#itemAim(rid, doc, cx, cy, from, isCard, strip);
        strip = aim.reach;
        // The look comes first: a chip is gripped at its centre.
        if (!!aim.chip !== hands.chip(rid) && table.held(rid)) hands.show(hand, [{ rid, x: parseFloat(el.style.left), y: parseFloat(el.style.top), z: 0, aim: { chip: !!aim.chip } }], true);
        const g = aim.chip ? { x: el.offsetWidth / 2, y: el.offsetHeight / 2 } : grip;
        return { ...less(table.toWorld(cx, cy), g), aim };
      },
      drop: (last, away, z) => this.#itemDrop(rid, last.aim, away, { x: last.x, y: last.y, z, tilt: 0 }, mint()),
    }, down, move);
  }

  // R299, R222, R240, R243, R244: what a chip or card is aimed at, under the pointer, in this order: a
  // tap's merge, a slot, the kill box, a drawer (and where among its cards); the strip it opens; a
  // card over the slots shows as a chip.
  #itemAim(rid: Rid, doc: Document, x: number, y: number, from: Source | null, isCard: boolean, strip: Aim['reach']): Aim {
    const { game } = this.#w, i = game.get(rid) as Item | undefined;
    const hits = (doc.elementsFromPoint?.(x, y) ?? []) as HTMLElement[];
    const first = (sel: string) => { for (const h of hits) { const m = h.closest?.(sel) as HTMLElement | null; if (m) return m; } return null; };
    const aim: Aim = {};
    const into = i?.kind === 'influence' && i.tap ? first('.tapped[data-rid]') : null;
    const slot = first('.slot'), kill = first('.kill'), drawer = first('.drawer');
    if (into && mergeTap(game, rid, into.dataset.rid!, () => '')) aim.merge = into.dataset.rid!;
    else if (slot) aim.slot = { owner: slot.dataset.owner!, name: slot.dataset.slot as SlotName };
    else if (kill) { const pool = kill.closest<HTMLElement>('.pool')?.dataset.rid; if (pool) aim.kill = pool.slice(2); }
    else if (drawer) aim.drawer = { owner: drawer.dataset.drawer!, ...(i?.kind === 'influence' && { at: gapAt(drawer, x, y) }) };
    const reach = this.#reach(x, y, from, strip);
    if (reach) aim.reach = reach;
    if (isCard && hits.some(h => h.closest?.('.slots'))) aim.chip = true;
    return aim;
  }

  // Seq: seq-drag.md#1.4 | R244: over a pool's slots, the strip under the pointer opens (trading
  // with the slot it came from, or an empty one); it stays open over open slots, and the pool goes
  // back when the carry leaves its slots.
  #reach(x: number, y: number, from: Source | null, was: Aim['reach']): Aim['reach'] {
    for (const pool of this.#w.table.pools()) {
      const r = pool.querySelector('.slots')?.getBoundingClientRect();
      if (!r || x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      const owner = pool.dataset.rid!.slice(2), kept = was?.owner === owner ? was : undefined;
      const under = [...pool.querySelectorAll<HTMLElement>('.slot')].find(s => {
        const b = s.getBoundingClientRect();
        return x >= b.left && x < b.right;
      });
      if (!under?.classList.contains('narrow')) return kept;
      return { owner, at: under.dataset.slot as SlotName, from: from && from.owner === owner ? from.slot : null };
    }
    return undefined;
  }

  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R268, R60, R211, R260: the
  // drop, from the last aim.
  #itemDrop(rid: Rid, aim: Aim | undefined, away: boolean, place: Place, mint: () => Oid): Change | null {
    const { game } = this.#w, i = game.get(rid) as Item | undefined;
    if (!i) return null;
    if (aim?.merge) return mergeTap(game, rid, aim.merge, mint);
    // R211, R260: a card a slot refuses (a Damage card, a Motivation's) goes home to its drawer.
    if (aim?.slot) return toSlot(game, rid, aim.slot.owner, aim.slot.name, mint) ?? (i.kind === 'influence' ? toDrawer(game, rid, i.home) : null);
    if (aim?.kill) return killCard(game, rid);
    if (aim?.drawer) return toDrawer(game, rid, aim.drawer.owner, aim.drawer.at);
    if (away) return i.kind === 'influence' ? toDrawer(game, rid, i.home) : vanish(game, rid);
    return toTable(game, rid, place);
  }


  /** Pieces just taken from the bar (R19): put back there, they are never made. */
  #fresh = new Set<Rid>();
  fresh(rid: Rid): void { this.#fresh.add(rid); }

  // R288: over the bar, anything carried turns it red; "→ <graveyard>" when letting go would bury it.
  #overBar(doc: Document, cy: number): boolean {
    const bar = doc.getElementById('bar');
    return !!bar && cy < bar.getBoundingClientRect().bottom;
  }

  #lightBar(doc: Document, cy: number | null, buries: boolean): void {
    const bar = doc.getElementById('bar');
    if (!bar) return;
    const over = cy !== null && this.#overBar(doc, cy);
    bar.classList.toggle('toss', over);
    bar.classList.toggle('bury', over && buries);
    bar.dataset.yard = `→ ${this.#w.yard().name || 'Unnamed graveyard'}`;
  }

  // R119, R122, R288, R290: put away on the bar: the reference card vanishes; anything else is
  // buried in the current graveyard, a character with its cards and pinned paper, under its name.
  #putAway(rec: PieceRecord): Change {
    const { game } = this.#w, rid = ridOf(rec.oid);
    // R19: a supply dropped back on the bar makes nothing.
    if (this.#fresh.delete(rid) || rec.kind === 'reference') return w => w.del(rid);
    const all = game.all().map(([, r]) => r).filter((r): r is PieceRecord => 'kind' in r);
    const recs = burialOf(rec, all), y = (game.get('yards') as Yards | undefined) ?? empty();
    const cur = Math.min(this.#w.yard().cur, y.yards.length - 1);
    return w => {
      w.put('yards', bury(y, cur, recs, graveName(rec)));
      for (const r of recs) w.del(ridOf(r.oid));
    };
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


  /** The card under the pointer, other than the piece itself. */
  #cardAt(doc: Document, x: number, y: number, not: HTMLElement): Character | undefined {
    for (const hit of doc.elementsFromPoint?.(x, y) ?? []) {
      const el = (hit as HTMLElement).closest?.('.obj.card') as HTMLElement | null;
      const card = el && el !== not ? this.#w.game.get(el.dataset.rid!) as Character | undefined : undefined;
      if (card) return card;
    }
    return undefined;
  }

  // Seq: seq-drag.md#1.7 | R27, R32: one change: the carried part from where it started (`from`) to
  // where it was let go (`to`); a pool's card comes too unless gathered; a card's pinned paper moves
  // with it; paper is pinned to the card it was aimed at, or let go of one.
  #drop(rec: PieceRecord, part: 'pool' | 'card', from: { x: number; y: number }, to: { x: number; y: number }, z: number, aim?: Aim): Change {
    const { game } = this.#w, rid = ridOf(rec.oid), dx = to.x - from.x, dy = to.y - from.y;
    this.#fresh.delete(rid);   // made now: later, the bar buries it
    const moved = <P extends { x: number; y: number; z: number }>(p: P): P => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    return w => {
      if (rec.kind === 'character') {
        if (part === 'pool') { w.put(rid, { ...rec, pool: moved(rec.pool), card: rec.gathered ? rec.card : moved(rec.card) }); return; }
        w.put(rid, { ...rec, card: { ...rec.card, x: to.x, y: to.y, z }, gathered: false });
        for (const [r2, o] of game.all()) {
          const q = o as PieceRecord;
          if ('kind' in q && pinnable(q) && q.pin?.card === rec.oid) w.put(r2, { ...q, place: moved(q.place) });
        }
        return;
      }
      if (!('place' in rec)) return;
      const place = moved(rec.place);
      if (!pinnable(rec)) { w.put(rid, { ...rec, place }); return; }
      const card = aim?.card ? game.get(aim.card) as Character | undefined : undefined;
      const { pin: _old, ...loose } = rec;
      w.put(rid, card?.kind === 'character' ? { ...loose, place, pin: { card: card.oid, dx: place.x - card.card.x, dy: place.y - card.card.y } } : { ...loose, place });
    };
  }
}
