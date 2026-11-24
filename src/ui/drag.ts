// CRC: crc-Drag.md | Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.3.1, seq-drag.md#1.4, seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R298, R299, R300, R211, R463, R215, R244, R240, R216, R217, R220, R221, R222, R223, R243, R225, R226, R21, R27, R32, R251, R48, R55, R57, R60, R183, R285, R119, R122, R288, R360, R409, R482, R488, R500, R513, R519, R520, R521, R522, R523, R532, R536, R538, R539, R540, R541, R543, R562, R555, R572, R571, R573
// Lifting, carrying and dropping, and deciding what a drop means. Everything is carried one way
// (carry): each frame works out the piece's place and aim, which Hands draws on this page and Moves
// sends to the room; the drop is one Game.change. Each kind gives only its place, aim and drop.

import type { Game } from '../model/game.ts';
import { isPinnable, ridFor, ridOf, type Character, type Docket, type Hill, type Desk, type Drawer, type Oid, type PieceRecord, type Place, type Rid, type SlotName, type Yards } from '../model/records.ts';
import { aimed } from '../rules/dockets.ts';
import type { Item } from '../rules/pool.ts';
import { gapAt } from './pool.ts';
import { killCard, mergeTap, tapOut, toDrawer, toSlot, toTable, vanish, type Change } from './actions.ts';
import { bury, buryOwn, empty, graveName, putAway } from '../rules/yards.ts';
import { LABEL, deskName, desksOf, drawerOf, filed } from '../rules/drawers.ts';
import type { Aim, MoveItem, Moves } from '../net/moves.ts';
import { paced, type PointerLike } from './gesture.ts';
import type { Hands } from './hands.ts';
import { placeOf, tiedHere } from './piece.ts';
import type { TableView } from './table.ts';

export type DragWith = {
  game: Game; table: TableView; hands: Hands; moves: Moves | null; mint: () => () => Oid;
  /** This page's own hand (its tab). */
  hand: string;
  /** The next frame, or 100 ms in a hidden tab (R215). */
  schedule: (fn: () => void) => void;
  /** R360: who is doing the putting, the name a chip put in a pool takes. */
  who: () => string | undefined;
  /** The graveyard being browsed (the Seat), where a put-away piece is buried (R122, R288). */
  yard: () => { cur: number; name: string };
  /** R521: whether this is the GM's page, whose desk files characters too. */
  gm: boolean;
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
  /** What the drop changes, from the last frame; `away` is over the bar, `file` the desk it is filed in (R519, R555). */
  drop: (last: Frame, away: boolean, z: number, file: number | null) => Change | null;
  /** R519, R520: the drawer it files in over the desk, or none (then the desk is the bar). */
  files?: Drawer | null;
  done?: () => void;
  /** R513: carried with no button held, until the next press (or Esc). */
  loose?: boolean;
};

/** How far into a tapped card its glyph's centre sits, the name after it (R225). */
const TAP_GLYPH_X = 10;

// R223: picking something up leaves any writing and clears the text selection.
function leaveWriting(doc: Document): void {
  (doc.activeElement as HTMLElement | null)?.blur?.();
  doc.getSelection?.()?.removeAllRanges();
}

/** A world point minus a grip, rounded. */
const less = (p: { x: number; y: number }, g: { x: number; y: number }) => ({ x: Math.round(p.x - g.x), y: Math.round(p.y - g.y) });

/** Where a paper lying at `at` has its tack: the middle of its top edge. */

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
    // R451: the browser may take up writing again as its text selection follows the pointer (WebKit does).
    const keepOut = () => { if ((doc.activeElement as HTMLElement | null)?.isContentEditable) leaveWriting(doc); };
    const pace = paced<{ cx: number; cy: number }>(this.#w.schedule, ({ cx, cy }) => {
      keepOut();
      last = c.frame(cx, cy);
      const it = item(last);
      hands.show(hand, [it], true);
      moves?.drag([it]);
      this.#lightBar(doc, cx, cy, c.buries, c.files ?? null);
    });
    let at = { cx: move.clientX, cy: move.clientY };
    const to = (e: PointerLike) => pace.to(at = { cx: e.clientX, cy: e.clientY });
    to(move);
    pace.flush();
    // R482: a pinch moves the table under a still finger; the piece stays glued to it (R216).
    const off = table.onView(() => { pace.to(at); pace.flush(); });
    const end = (e: PointerLike, put = false) => {
      off();
      pace.cancel();
      keepOut();
      last = c.frame(e.clientX, e.clientY);
      // R513: Esc takes a loose piece back as a press on the bar would. R519: over the desk, filed.
      const file = !put && !!c.files && this.#overDesk(doc, e.clientX, e.clientY), into = file ? this.#deskAt(doc, e.clientX, e.clientY) : null;
      const away = put || (!file && this.#overBar(doc, e.clientY));
      this.#lightBar(doc, null, null, false, null);
      doc.body.classList.remove('dragging', 'tapping');
      hands.drop(hand, [], true);
      // R300: the drop is a move; its change goes out right after it.
      moves?.drop([item(last)]);
      const change = c.drop(last, away, z, into);
      // R217, R226: drawn where it was let go, without gliding there.
      table.still(() => { if (change) game.change(change); });
      moves?.release(c.rid);
      table.render([c.rid]);   // nothing changed: back where its record says
      c.done?.();
    };
    if (c.loose) this.#loose(doc, move, to, end); else this.#follow(doc, down, to, end);
  }

  // Seq: seq-drag.md#1.2 | R27, R32, R222: paper, or a character's card (what's pinned to it follows,
  // Hands); paper is aimed at the card it would pin to.
  /** Carries a piece from the press that started it (or, `loose`, with no button held), and what's pinned to it. */
  start(rid: Rid, down: PointerLike, move: PointerLike, loose = false): void {
    const { game, table } = this.#w;
    const rec = game.get(rid) as PieceRecord | undefined, at = rec && placeOf(rec), el = table.element(rid);
    if (!rec || !at || !el) return;
    // R543: a press on a docket tied here carries the whole docket.
    if (isPinnable(rec) && rec.pin && tiedHere(game).has(rec.pin.card) && table.element(ridOf(rec.pin.card))) {
      this.start(ridOf(rec.pin.card), down, move, loose);
      return;
    }
    // R532: a docket just made, let go on the table, has its name selected, so typing names it.
    const named = rec.kind === 'docket' && this.#fresh.has(rid);
    // R32: a card dragged alone leaves its pool from where it was drawn (gathered, under the drawer).
    const from: Place = rec.kind === 'character' && rec.gathered ? { ...at, x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : at;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - from.x, y: p0.y - from.y };
    const pins = isPinnable(rec), held = this.#tackedTo(rec);
    this.#carry({
      rid, ...(rec.kind === 'character' && { part: 'card' as const }),
      // R538, R536, R539: paper is aimed at the card under the pointer, else at the docket on top whose
      // tape, drawn without it, it touches. R572: paper pinned to a card is aimed at nothing, its pin line drawn.
      frame: (cx, cy) => {
        const f: Frame = less(table.toWorld(cx, cy), grip);
        if (held) { table.pinLine(rid, f, this.#middle(held), [ridOf(held.oid)]); return f; }
        const card = pins ? this.#cardAt(el.ownerDocument, cx, cy, el) : undefined;
        if (card) return { ...f, aim: { card: ridOf(card.oid) } };
        const docket = pins ? aimed(table.targets(rid), { left: f.x, top: f.y, right: f.x + el.offsetWidth, bottom: f.y + el.offsetHeight }) : null;
        return docket ? { ...f, aim: { docket: ridOf(docket) } } : f;
      },
      buries: rec.kind !== 'reference' && rec.kind !== 'connections' && !this.#fresh.has(rid),
      // R19, R519: a fresh supply is never made, so never filed.
      files: this.#fresh.has(rid) ? null : drawerOf(rec, this.#w.gm),
      drop: (last, away, z, file) => {
        if (file !== null) return this.#file(rec, file);
        if (away) return this.#putAway(rec);
        return this.#drop(rec, 'card', from, last, z, last.aim);
      },
      done: () => {
        if (held) table.pinLine(null);
        const name = named && game.get(rid) ? table.element(rid)?.querySelector<HTMLElement>('.dname') : null;
        if (!name) return;
        name.focus();
        name.ownerDocument.getSelection()?.selectAllChildren(name);
      },
      loose,
    }, down, move);
  }

  // R568: the card a paper's tack holds it to, if any (a docket's paper has no tack).
  #tackedTo(rec: PieceRecord): Character | null {
    if (!isPinnable(rec) || !rec.pin) return null;
    const c = this.#w.game.get(ridOf(rec.pin.card)) as PieceRecord | undefined;
    return c?.kind === 'character' ? c : null;
  }

  /** The middle of a card as it is drawn, in table coordinates. */
  #middle(c: Character): { x: number; y: number } {
    const b = this.#w.table.box(ridOf(c.oid));
    return b ? { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 } : { x: c.card.x, y: c.card.y };
  }

  // R571: the tack's drag: the pin line from the tack runs to the pointer, the card under it lit; let go on
  // another card, the paper is pinned there where it lies; anywhere else, or Esc, nothing changes.
  /** Drags a pinned paper's tack. */
  startTack(rid: Rid, down: PointerLike, move: PointerLike): void {
    const { game, table } = this.#w;
    const rec = game.get(rid) as PieceRecord | undefined, el = table.element(rid), from = rec && this.#tackedTo(rec);
    if (!rec || !isPinnable(rec) || !el || !from) return;
    const doc = el.ownerDocument;
    let over: Character | undefined;
    const light = (c: Character | undefined) => {
      for (const e of doc.querySelectorAll('.obj.card.over')) e.classList.remove('over');
      if (c) table.element(ridOf(c.oid))?.classList.add('over');
    };
    const to = (e: PointerLike) => {
      over = this.#cardAt(doc, e.clientX, e.clientY, el);
      light(over);
      table.pinLine(rid, rec.place, over ? this.#middle(over) : table.toWorld(e.clientX, e.clientY), [ridOf(from.oid), ...(over ? [ridOf(over.oid)] : [])]);
    };
    const stop = () => { doc.removeEventListener('keydown', key, true); light(undefined); table.pinLine(null); };
    let gone = false;
    const key = (ev: Event) => {
      if ((ev as KeyboardEvent).key !== 'Escape') return;
      ev.preventDefault();
      gone = true;
      stop();
    };
    doc.addEventListener('keydown', key, true);
    to(move);
    this.#follow(doc, down, e => { if (!gone) to(e); }, e => {
      if (gone) return;
      to(e);
      stop();
      const card = over, now = game.get(rid) as typeof rec | undefined;
      if (!card || card.oid === from.oid || !now) return;
      game.change(w => w.put(rid, { ...now, pin: { card: card.oid, dx: now.place.x - card.card.x, dy: now.place.y - card.card.y } }));
    });
  }

  // R32, R251: dragging a pool brings its card, gathered or not, and what's pinned to it (Hands).
  /** Carries a character's pool. */
  startPool(rid: Rid, down: PointerLike, move: PointerLike, done?: () => void, loose = false): void {
    const { game, table } = this.#w;
    const c = game.get(rid) as Character | undefined;
    if (!c || c.kind !== 'character' || !table.pool(rid)) return;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - c.pool.x, y: p0.y - c.pool.y };
    let away = false;
    this.#carry({
      rid, part: 'pool',
      frame: (cx, cy) => less(table.toWorld(cx, cy), grip),
      buries: !this.#fresh.has(rid),
      files: this.#fresh.has(rid) ? null : drawerOf(c, this.#w.gm),
      drop: (last, over, z, file) => {
        away = over || file !== null;
        if (file !== null) return this.#file(c, file);
        if (over) return this.#putAway(c);
        return this.#drop(c, 'pool', c.pool, last, z);
      },
      done: () => { if (!away) done?.(); },
      loose,
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

  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R268, R60, R211, R463: the
  // drop, from the last aim.
  #itemDrop(rid: Rid, aim: Aim | undefined, away: boolean, place: Place, mint: () => Oid): Change | null {
    const { game } = this.#w, i = game.get(rid) as Item | undefined;
    if (!i) return null;
    if (aim?.merge) return mergeTap(game, rid, aim.merge, mint);
    // R211, R463: a card a slot refuses (a Damage card, a Motivation's) goes home to its drawer.
    if (aim?.slot) return toSlot(game, rid, aim.slot.owner, aim.slot.name, mint, this.#w.who()) ?? (i.kind === 'influence' ? toDrawer(game, rid, i.home) : null);
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

  // R519, R562: the desk on the bar, by the pointer, and the board of desks while it hangs below it.
  #overDesk(doc: Document, cx: number, cy: number): boolean {
    const inside = (r: DOMRect | undefined) => !!r && r.width > 0 && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    return inside(doc.querySelector('#bar .desk')?.getBoundingClientRect()) || inside(doc.querySelector('#bar .deskboard')?.getBoundingClientRect());
  }

  /** This page's desks (its `desk` record). */
  #desks(): Desk { return desksOf(this.#w.game.get('desk') as Desk | undefined); }

  // R555, R562: the desk a piece let go here is filed in: the board's row under the pointer, else the desk set out.
  #deskAt(doc: Document, cx: number | null, cy: number | null): number {
    const row = cx === null || cy === null ? null : (doc.elementFromPoint(cx, cy) as HTMLElement | null)?.closest<HTMLElement>('.deskrow');
    const all = this.#desks();
    return row ? Number(row.dataset.desk) : Math.max(0, Math.min(all.out ?? 0, all.desks.length - 1));
  }
  // R288, R520: over the bar it is red, with the graveyard it would be buried in; over the desk, with
  // the drawer it would be filed in instead.
  #lightBar(doc: Document, cx: number | null, cy: number | null, buries: boolean, files: Drawer | null): void {
    const bar = doc.getElementById('bar'), desk = doc.querySelector<HTMLElement>('#bar .desk');
    if (!bar) return;
    const over = cy !== null && this.#overBar(doc, cy), file = !!files && cx !== null && cy !== null && this.#overDesk(doc, cx, cy);
    bar.classList.toggle('toss', over);
    bar.classList.toggle('bury', over && buries && !file);
    bar.dataset.yard = `→ ${this.#w.yard().name || 'Unnamed graveyard'}`;
    desk?.classList.toggle('file', file);
    // R562, R555: the row under the pointer rolls its lid up; the hint names the desk too when there are several.
    const at = file ? this.#deskAt(doc, cx, cy) : -1;
    for (const row of doc.querySelectorAll<HTMLElement>('#bar .deskrow')) row.classList.toggle('over', Number(row.dataset.desk) === at);
    if (desk && files) {
      const all = this.#desks(), one = all.desks[at];
      desk.dataset.drawer = `→ ${all.desks.length > 1 && one ? `${deskName(one)}: ` : ''}${LABEL[files]}`;
    }
  }

  // R519, R523: filed in its drawer with what a burial would take, and gone from the table.
  #file(rec: PieceRecord, at: number): Change {
    const { game, gm } = this.#w, drawer = drawerOf(rec, gm);
    if (!drawer) return () => {};
    const all = game.all().map(([, r]) => r).filter((r): r is PieceRecord => 'kind' in r);
    const { shared, own } = putAway(rec, all), recs = [...shared, ...own];
    const d = this.#desks();
    return w => {
      w.put('desk', filed(d, at, drawer, recs, graveName(rec)));
      for (const r of recs) w.del(ridFor(r));
    };
  }

  // R119, R122, R288, R290: put away on the bar: the reference card vanishes; anything else is
  // buried in the current graveyard, a character with its cards and pinned paper, under its name.
  #putAway(rec: PieceRecord): Change {
    const { game } = this.#w, rid = ridFor(rec);
    // R19: a supply dropped back on the bar makes nothing.
    if (this.#fresh.delete(rid) || rec.kind === 'reference') return w => w.del(rid);
    // R409: the Connection Table is put away, kept for its supply, not buried.
    if (rec.kind === 'connections') return w => w.put(rid, { ...rec, away: true });
    // R488, R500: a torn roll and `mine` paper are buried on this page alone, in its Hill under the
    // graveyard's name (a character's pinned `mine` paper apart from it); the rest in Boot Hill.
    const all = game.all().map(([, r]) => r).filter((r): r is PieceRecord => 'kind' in r);
    const { shared, own } = putAway(rec, all), y = (game.get('yards') as Yards | undefined) ?? empty();
    const cur = Math.min(this.#w.yard().cur, y.yards.length - 1);
    return w => {
      if (shared.length) w.put('yards', bury(y, cur, shared, graveName(rec)));
      if (own.length) {
        let h = (game.get('hill') as Hill | undefined) ?? { hill: [] };
        for (const r of own) h = buryOwn(h, this.#w.yard().name, [r], graveName(r));
        w.put('hill', h);
      }
      for (const r of [...shared, ...own]) w.del(ridFor(r));
    };
  }

  // R513: a loose carry follows every pointer move until the next press, which it takes (no piece under
  // it is picked up, no key under it pressed, nor its click), or Esc, which puts the piece away.
  /** Follows the pointer with no button held until the next press or Esc. */
  #loose(doc: Document, from: PointerLike, onMove: (e: PointerLike) => void, onEnd: (e: PointerLike, put?: boolean) => void): void {
    let at = from;
    const swallow = (ev: Event) => { ev.preventDefault(); ev.stopImmediatePropagation(); };
    const stop = () => {
      doc.removeEventListener('pointermove', move, true);
      doc.removeEventListener('pointerdown', press, true);
      doc.removeEventListener('keydown', key, true);
    };
    const move = (ev: Event) => { at = ev as PointerLike; onMove(at); };
    const press = (ev: Event) => {
      swallow(ev);
      stop();
      // The press's own up and click are this carry's too.
      doc.addEventListener('click', swallow, { capture: true, once: true });
      doc.addEventListener('pointerup', () => setTimeout(() => doc.removeEventListener('click', swallow, true), 0), { capture: true, once: true });
      onEnd(ev as PointerLike);
    };
    const key = (ev: Event) => {
      if ((ev as KeyboardEvent).key !== 'Escape') return;
      swallow(ev);
      stop();
      onEnd(at, true);
    };
    doc.addEventListener('pointermove', move, true);
    doc.addEventListener('pointerdown', press, true);
    doc.addEventListener('keydown', key, true);
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
    const { game } = this.#w, rid = ridFor(rec), dx = to.x - from.x, dy = to.y - from.y;
    this.#fresh.delete(rid);   // made now: later, the bar buries it
    const moved = <P extends { x: number; y: number; z: number }>(p: P): P => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    /** The paper pinned to `holder` moves with it. */
    const bringPapers = (w: Parameters<Change>[0], holder: Oid) => {
      for (const [r2, o] of game.all()) {
        const q = o as PieceRecord;
        if ('kind' in q && isPinnable(q) && q.pin?.card === holder) w.put(r2, { ...q, place: moved(q.place) });
      }
    };
    return w => {
      if (rec.kind === 'character') {
        if (part === 'pool') { w.put(rid, { ...rec, pool: moved(rec.pool), card: rec.gathered ? rec.card : moved(rec.card) }); return; }
        w.put(rid, { ...rec, card: { ...rec.card, x: to.x, y: to.y, z }, gathered: false });
        bringPapers(w, rec.oid);
        return;
      }
      if (!('place' in rec)) return;
      const place = moved(rec.place);
      // R541: a docket brings its papers, by the same offset.
      if (rec.kind === 'docket') {
        w.put(rid, { ...rec, place });
        bringPapers(w, rec.oid);
        return;
      }
      if (!isPinnable(rec)) { w.put(rid, { ...rec, place }); return; }
      // R27, R536: pinned to the card or docket it was aimed at, at its offset from it; else loose.
      // R572: paper pinned to a card stays pinned to it, wherever it's let go.
      const card = this.#tackedTo(rec) ?? (aim?.card ? game.get(aim.card) as Character | undefined : undefined);
      const docket = aim?.docket ? game.get(aim.docket) as Docket | undefined : undefined;
      let holder: { oid: Oid; at: { x: number; y: number } } | null = null;
      if (card?.kind === 'character') holder = { oid: card.oid, at: card.card };
      else if (docket?.kind === 'docket') holder = { oid: docket.oid, at: docket.place };
      const { pin: _old, ...loose } = rec;
      w.put(rid, holder ? { ...loose, place, pin: { card: holder.oid, dx: place.x - holder.at.x, dy: place.y - holder.at.y } } : { ...loose, place });
    };
  }
}
