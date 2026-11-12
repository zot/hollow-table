// CRC: crc-PoolView.md | Seq: seq-drag.md#1.4, seq-drag.md#1.8, seq-drag.md#1.9 | R28, R244, R239, R240, R227, R228, R229, R230, R231, R232, R233, R234, R235, R236, R237, R238, R31, R32, R33, R36, R37, R38, R39, R41, R47, R49, R50, R52, R53, R64
// A character's pool mat: the seven slots, the drawer of Influence cards with its writers, used pile
// and kill box, and the header. What a click or a drop does is in actions.ts; this only draws and
// listens.

import type { Game } from '../model/game.ts';
import { SLOTS, ridOf, type Character, type Influence, type Oid, type SlotName } from '../model/records.ts';
import { levelName } from '../rules/influence.ts';
import { rollUp, worth, type Item, type Unit } from '../rules/pool.ts';
import { canSee, type Viewer } from '../rules/visibility.ts';
import { addLoose, cardClick, chipClick, restoreUsed, riderClick, writeCard, type Change } from './actions.ts';
import { gesture, type PointerLike } from './gesture.ts';

export type PoolWith = {
  game: Game; viewer: Viewer;
  /** A source of new oids for one change. */
  mint: () => () => Oid;
  /** Seat-tier openings: piles by first member, slots and used piles by `<oid>:<slot>` / oid. */
  poolOpen: () => { piles: Set<string>; slots: Set<string>; used: Set<string> };
  toggle: (kind: 'piles' | 'slots' | 'used', key: string, on?: boolean) => void;
  dragItem: (rid: string, down: PointerLike, move: PointerLike) => void;
  dragPool: (rid: string, down: PointerLike, move: PointerLike) => void;
};

// R228: the mat keeps its drawer's width; these are the sizes its slots are laid out with (theme.css
// draws them the same).
export const MAT_W = 430, SLOT_W = 72, STAGGER_W = 92, STRIP_W = 16, SLOT_GAP = 6, MAT_PAD = 6;

// CRC: crc-PoolView.md | R228
/**
 * Which slots are open: every slot `holding` anything (or opened by a click) stays open, the rest
 * open from the left while they fit in `width`, and the first that doesn't fit ends it; the others
 * are strips. Open slots stretch to fill what's left, so the slots always fill the mat.
 */
export function openSlots(holding: readonly boolean[], width = MAT_W): boolean[] {
  const full = (i: number) => SLOTS[i] === 'stagger' ? STAGGER_W : SLOT_W;
  const open = [...holding];
  const used = () => open.reduce((a, o, i) => a + (o ? full(i) : STRIP_W), 0) + SLOT_GAP * (open.length - 1);
  for (let i = 0; i < open.length; i++) {
    if (open[i]) continue;
    open[i] = true;
    if (used() > width - 2 * MAT_PAD) { open[i] = false; break; }
  }
  return open;
}

/** A box on screen. */
export type Box = { left: number; top: number; right: number; bottom: number };

// CRC: crc-PoolView.md | R240
/** Where among cards laid out in reading order (wrapping rows) a point falls: an index 0..length. */
export function insertAt(cards: readonly Box[], x: number, y: number): number {
  const k = cards.findIndex(r => y < r.top || (y <= r.bottom && x < (r.left + r.right) / 2));
  return k < 0 ? cards.length : k;
}

// CRC: crc-PoolView.md | R244
/**
 * The slots open while a carry is over strip `at`: it opens, and one slot closes to pay for it, the
 * one the chip came from (`from`) if that is now empty, else the first empty open slot left of
 * `from` (or of `at`). With none to close, the mat grows by that one slot.
 */
export function reachFor(holding: readonly boolean[], at: number | null, from: number | null, width = MAT_W): boolean[] {
  const open = openSlots(holding, width);
  if (at === null || open[at]) return open;
  open[at] = true;
  const free = (i: number) => open[i] && !holding[i] && i !== at;
  let close = from !== null && free(from) ? from : -1;
  for (let i = (from ?? at) - 1; close < 0 && i >= 0; i--) if (free(i)) close = i;
  if (close >= 0) open[close] = false;
  return open;
}

/** What a pool showed, by key (a chip's or card's oid, `pile:<first member>`): points, and where. */
export type Shown = Map<string, { points: number; place: string }>;

// CRC: crc-PoolView.md | R237
/**
 * What pops in a redraw: a chip or card whose points changed, a pile that formed, and a new chip in
 * a place that lost two or more (a Roll Up). Nothing pops on the first draw.
 */
export function pops(before: Shown | undefined, after: Shown): Set<string> {
  const out = new Set<string>();
  if (!before) return out;
  const lost = new Map<string, number>();
  for (const [k, b] of before) if (!after.has(k)) lost.set(b.place, (lost.get(b.place) ?? 0) + 1);
  for (const [k, a] of after) {
    const b = before.get(k);
    if (b ? b.points !== a.points : k.startsWith('pile:') || (lost.get(a.place) ?? 0) >= 2) out.add(k);
  }
  return out;
}

const LABEL: Record<SlotName, string> = {
  bonus: 'Bonus', main: 'Main', edge: 'Edge', stagger: 'Stagger', bias: 'Bias', affliction: 'Affliction', injury: 'Injury',
};

const el = (doc: Document, tag: string, cls?: string, text?: string): HTMLElement => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const run = (game: Game, c: Change | null) => { if (c) game.change(c); };
const isPile = (u: Unit): u is Exclude<Unit, Item> => 'members' in u;
const at = (i: Item, owner: Oid, slot?: SlotName) =>
  typeof i.where === 'object' && 'slot' in i.where && i.where.slot === owner && (!slot || i.where.name === slot);

/** Draws (or redraws) a character's pool from the items on the table. */
export function drawPool(c: Character, items: Item[], old: HTMLElement | undefined, w: PoolWith): HTMLElement {
  const doc = old?.ownerDocument ?? document, rid = ridOf(c.oid);
  const e = old ?? make(doc, c, w);
  e.style.left = `${c.pool.x}px`;
  e.style.top = `${c.pool.y}px`;
  e.style.zIndex = String(c.pool.z);
  e.querySelector('.name')!.textContent = c.name;
  e.querySelector('.owner')!.textContent = c.owner === 'open' ? 'open' : c.owner;
  e.querySelector<HTMLElement>('.gather')!.hidden = c.gathered;
  const opened = w.poolOpen(), shown: Shown = new Map(), drawn = new Map<string, HTMLElement>();
  const slotEls = [...e.querySelectorAll<HTMLElement>('.slot')];
  const mine = slotEls.map(slotEl => items.filter(i => at(i, c.oid, slotEl.dataset.slot as SlotName)));
  // R228, R31: slots open from the left as many as fit, holding ones always; the rest are strips.
  holdingOf.set(e, slotEls.map((slotEl, k) => mine[k]!.length > 0 || opened.slots.has(`${c.oid}:${slotEl.dataset.slot}`)));
  layout(e);
  slotEls.forEach((slotEl, k) => units(slotEl, mine[k]!, w, shown, drawn));
  drawer(e.querySelector('.drawer')!, c, items.filter(i => i.kind === 'influence' && i.home === c.oid) as Influence[], w, shown, drawn);
  // R237: what a Roll Up made, or whose points changed, pops.
  for (const k of pops(seen.get(e), shown)) pop(drawn.get(k));
  seen.set(e, shown);
  e.dataset.rid = rid;
  return e;
}

/** Which of each pool's slots hold anything (or were opened by a click), as last drawn. */
const holdingOf = new WeakMap<HTMLElement, boolean[]>();
/** The strip a carry is over in each pool, and the slot it came from there (R244). */
const reaching = new WeakMap<HTMLElement, { at: SlotName | null; from: SlotName | null }>();

// R228, R244: which slots are open, and which strips.
function layout(e: HTMLElement): void {
  const holding = holdingOf.get(e), r = reaching.get(e);
  if (!holding) return;
  const ix = (s: SlotName | null | undefined) => s ? SLOTS.indexOf(s) : null;
  const open = reachFor(holding, ix(r?.at), ix(r?.from));
  e.querySelectorAll<HTMLElement>('.slot').forEach((slotEl, k) => slotEl.classList.toggle('narrow', !open[k]));
}

// CRC: crc-PoolView.md | R244
/** A carry is over strip `at` of this pool (null: not over its slots), having come from slot `from` here. */
export function reach(pool: HTMLElement, at: SlotName | null, from: SlotName | null): void {
  const was = reaching.get(pool);
  if (was?.at === at && was.from === from) return;
  if (at) reaching.set(pool, { at, from }); else reaching.delete(pool);
  layout(pool);
}

/** What each pool showed at its last draw (R237). */
const seen = new WeakMap<HTMLElement, Shown>();

function pop(e: HTMLElement | undefined): void {
  if (!e) return;
  e.classList.remove('rolled');
  void e.offsetWidth;
  e.classList.add('rolled');
  e.addEventListener('animationend', () => e.classList.remove('rolled'), { once: true });
}

function make(doc: Document, c: Character, w: PoolWith): HTMLElement {
  const e = el(doc, 'div', 'obj pool');
  e.dataset.part = 'pool';
  const rid = ridOf(c.oid);
  const hd = el(doc, 'div', 'hd');
  const gather = el(doc, 'button', 'gather', 'gather');
  // R33: Gather snaps the card back under the drawer.
  gesture(gather, { click: () => { const cur = w.game.get(rid) as Character; w.game.change(x => x.put(rid, { ...cur, gathered: true })); } });
  const name = el(doc, 'span', 'name');
  hd.append(name, el(doc, 'span', 'owner'), gather);
  // R32: the name carries the pool (and a gathered card with it).
  gesture(name, { drag: (d, m) => w.dragPool(rid, d, m) });
  const slots = el(doc, 'div', 'slots');
  for (const s of SLOTS) {
    const slot = el(doc, 'div', `slot slot-${s}`);
    slot.dataset.slot = s;
    slot.dataset.owner = c.oid;
    // R227: the name in the middle; Stagger's "opposition only" under it.
    const label = el(doc, 'span', 'label', LABEL[s]);
    label.dataset.letter = LABEL[s][0]!;
    if (s === 'stagger') label.append(el(doc, 'small', '', 'opposition only'));
    slot.title = s === 'stagger' ? 'Stagger (opposition only)' : LABEL[s];
    slot.append(label, el(doc, 'div', 'pos'), el(doc, 'div', 'neg'));
    // R31: a narrow slot widens when clicked; R41: a wide one's empty space adds a loose ±1.
    gesture(slot, {
      click: ev => {
        if ((ev.target as HTMLElement).closest('.chip, .pile')) return;
        if (slot.classList.contains('narrow')) { w.toggle('slots', `${c.oid}:${s}`, true); return; }
        run(w.game, addLoose(w.game, c.oid, s, false, w.mint()));
      },
      shift: ev => {
        if ((ev.target as HTMLElement).closest('.chip, .pile') || slot.classList.contains('narrow')) return;
        run(w.game, addLoose(w.game, c.oid, s, true, w.mint()));
      },
    });
    slots.append(slot);
  }
  // R229: the drawer is a tray in the mat, its cards on the left and its tools on the right.
  const drawer = el(doc, 'div', 'drawer');
  drawer.dataset.drawer = c.oid;
  drawer.append(el(doc, 'div', 'cards'), el(doc, 'div', 'tools'));
  e.append(hd, slots, drawer);
  return e;
}

// R39, R52, R53, R235: positives from the top, negatives from the bottom, strongest nearest the
// edge and drawn on top, each tucked under the one before; three equal cards are one pile.
function units(slotEl: HTMLElement, items: Item[], w: PoolWith, shown: Shown, drawn: Map<string, HTMLElement>): void {
  const doc = slotEl.ownerDocument, { units } = rollUp(items, () => '');
  const opened = w.poolOpen(), place = slotEl.dataset.slot!;
  for (const sign of [1, -1] as const) {
    const box = slotEl.querySelector<HTMLElement>(sign > 0 ? '.pos' : '.neg')!;
    const mine = units.filter(u => u.sign === sign).sort((a, b) => sign > 0 ? worthOf(b) - worthOf(a) : worthOf(a) - worthOf(b));
    box.replaceChildren(...mine.map((u, k) => {
      const piled = isPile(u);
      const e = piled ? pile(doc, u, opened.piles, w) : chip(doc, u, w);
      e.style.zIndex = String(50 - k);
      const key = piled ? `pile:${(u.members[0] as Item | undefined)?.oid ?? ''}` : u.oid;
      shown.set(key, { points: u.points, place });
      drawn.set(key, e);
      return e;
    }));
  }
}

const worthOf = (u: Unit): number => isPile(u) ? u.points : worth(u);

// R36, R37, R38, R47, R234, R233: a chip shows its points, a red one its sign; a +1 rides on it; a
// card in a slot is a chip with a white inner ring and its name on hover, a resource-made one a
// glyph at its corner, a used one greyed with a tag.
function chip(doc: Document, i: Item, w: PoolWith): HTMLElement {
  const card = i.kind === 'influence';
  const b = el(doc, 'button', `chip ${i.sign > 0 ? 'pos' : 'neg'}${card ? ' card-chip' : ''}${card && i.tap ? ' res' : ''}${card && i.used ? ' used' : ''}`,
    `${i.sign < 0 ? '−' : ''}${i.points}`);
  const rid = ridOf(i.oid);
  b.dataset.rid = rid;
  if (card) { b.title = i.name; b.dataset.name = i.name; }
  if (i.kind === 'chip' && i.rider) {
    const r = el(doc, 'span', 'rider', '+1');
    gesture(r, { click: () => undefined, shift: () => run(w.game, riderClick(w.game, rid, true)) });
    b.append(r);
  }
  const click = i.kind === 'chip' ? chipClick : cardClick;
  gesture(b, {
    click: () => run(w.game, click(w.game, rid, false, w.mint())),
    shift: () => run(w.game, click(w.game, rid, true, w.mint())),
    drag: (d, m) => w.dragItem(rid, d, m),
  });
  return b;
}

// R236: a stack of discs in its colour; open, its members beside it, each with its name.
function pile(doc: Document, p: Exclude<Unit, Item>, open: Set<string>, w: PoolWith): HTMLElement {
  const first = (p.members[0] as Item | undefined)?.oid ?? '';
  const d = el(doc, 'div', `pile ${p.sign > 0 ? 'pos' : 'neg'}${open.has(first) ? ' open' : ''}`);
  const disc = el(doc, 'button', 'chip disc', `${p.sign < 0 ? '−' : ''}${p.points}`);
  disc.title = `${p.members.length} acting as one`;
  gesture(disc, { click: () => w.toggle('piles', first) });
  d.append(disc);
  if (open.has(first)) {
    const list = el(doc, 'div', 'members');
    for (const m of p.members) list.append(isPile(m) ? pile(doc, m, open, w) : chip(doc, m, w));
    d.append(list);
  }
  return d;
}

// R47, R49, R50, R51, R64, R229-R233: the drawer's cards, and its tools as tiles: the writers, the
// used pile (opening as a paper list) and the kill box.
function drawer(box: HTMLElement, c: Character, cards: Influence[], w: PoolWith, shown: Shown, drawn: Map<string, HTMLElement>): void {
  const doc = box.ownerDocument, opened = w.poolOpen();
  const visible = canSee(w.viewer, c);
  const here = cards.filter(k => k.where === 'drawer'), used = cards.filter(k => k.where === 'used');
  box.querySelector('.cards')!.replaceChildren(...here.sort((a, b) => a.n - b.n).map(k => {
    const e = card(doc, k, visible, w);
    shown.set(k.oid, { points: k.points, place: 'drawer' });
    drawn.set(k.oid, e);
    return e;
  }));
  const tools: HTMLElement[] = [];
  for (const sign of [1, -1] as const) {
    const pen = el(doc, 'button', `write ${sign > 0 ? 'pos' : 'neg'}`, sign > 0 ? '+' : '−');
    pen.title = sign > 0 ? 'Write a + card' : 'Write a − card';
    // R232: written as "Influence", its name selected, so typing names it.
    gesture(pen, { click: () => {
      const oid = w.mint()();
      run(w.game, writeCard(w.game, c.oid, sign, 'Influence', () => oid));
      const name = box.querySelector<HTMLElement>(`.icard[data-rid="${ridOf(oid)}"] .iname`);
      if (!name) return;
      name.focus();
      doc.getSelection()?.selectAllChildren(name);
    } });
    tools.push(pen);
  }
  const pileTile = el(doc, 'div', 'usedpile');
  const tag = el(doc, 'button', 'used', 'used');
  tag.append(el(doc, 'b', '', String(used.length)));
  tag.title = 'Used Influence cards: click to see them, click one to put it back';
  gesture(tag, { click: () => w.toggle('used', c.oid) });
  pileTile.append(tag);
  if (opened.used.has(c.oid) && visible) {
    const list = el(doc, 'div', 'usedlist');
    if (!used.length) list.append(el(doc, 'p', '', 'None used.'));
    for (const k of used) {
      const u = card(doc, k, visible, w);
      gesture(u, { click: () => run(w.game, restoreUsed(w.game, ridOf(k.oid))) });
      list.append(u);
    }
    pileTile.append(list);
  }
  tools.push(pileTile, Object.assign(el(doc, 'span', 'kill', 'kill'), { title: 'Drop a card here to delete it' }));
  box.querySelector('.tools')!.replaceChildren(...tools);
}

// R230, R238: a small white card with a band in its sign's colour, name and Level in handwriting; a
// drawer its viewer can't read shows striped backs.
function card(doc: Document, k: Influence, visible: boolean, w: PoolWith): HTMLElement {
  const rid = ridOf(k.oid);
  const e = el(doc, 'span', `icard ${k.sign > 0 ? 'pos' : 'neg'}${k.used ? ' isused' : ''}${k.tap ? ' tapped' : ''}${k.crit ? ' crit' : ''}`);
  e.dataset.rid = rid;
  const drag = { drag: (d: PointerLike, m: PointerLike) => w.dragItem(rid, d, m) };
  if (!visible) { e.classList.add('facedown'); gesture(e, drag); return e; }
  const name = el(doc, 'span', 'iname', k.name);
  // A freshly written card is named in place.
  name.contentEditable = 'true';
  name.spellcheck = false;
  name.addEventListener('input', () => {
    const cur = w.game.get(rid) as Influence | undefined;
    if (cur) w.game.change(x => x.put(rid, { ...cur, name: (name.textContent ?? '').slice(0, 200) }));
  });
  const level = el(doc, 'button', 'level', `${k.sign > 0 ? '+' : '−'}${levelName(k.points)}`);
  gesture(level, {
    click: () => run(w.game, cardClick(w.game, rid, false, w.mint())),
    shift: () => run(w.game, cardClick(w.game, rid, true, w.mint())),
  });
  e.append(name, level);
  gesture(e, drag);
  return e;
}

// ---- R240: the gap a carried card would go into ----

/** The drawer's cards, without the gap. */
const drawerCardEls = (cards: Element): HTMLElement[] => [...cards.querySelectorAll<HTMLElement>(':scope > .icard')];

/**
 * Where among a drawer's cards a screen point falls, measured as if there were no gap (so the gap
 * opening doesn't move the answer) and from layout, not from cards still sliding.
 */
export function gapAt(drawer: HTMLElement, x: number, y: number): number {
  const cards = drawer.querySelector<HTMLElement>('.cards')!, gap = cards.querySelector('.gap'), next = gap?.nextSibling ?? null;
  gap?.remove();
  const r = cards.getBoundingClientRect(), k = r.width / cards.offsetWidth || 1;
  const boxes = drawerCardEls(cards).map(e => {
    const left = e.offsetLeft - cards.offsetLeft, top = e.offsetTop - cards.offsetTop;
    return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight };
  });
  if (gap) cards.insertBefore(gap, next);
  return insertAt(boxes, (x - r.left) / k, (y - r.top) / k);
}

/** Opens the gap at `at` among a drawer's cards (null closes it); the cards slide to their places. */
export function showGap(drawer: HTMLElement, at: number | null, animate = true): void {
  const cards = drawer.querySelector<HTMLElement>('.cards');
  if (!cards) return;
  const els = drawerCardEls(cards);
  let gap = cards.querySelector<HTMLElement>('.gap');
  const now = gap ? [...cards.children].filter(c => c === gap || c.classList.contains('icard')).indexOf(gap) : -1;
  if (at === null ? !gap : now === at) return;
  const before = new Map(els.map(e => [e, e.getBoundingClientRect()]));
  if (at === null) gap!.remove();
  else {
    gap ??= Object.assign(cards.ownerDocument.createElement('div'), { className: 'gap' });
    cards.insertBefore(gap, els[at] ?? null);
  }
  const reduce = cards.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduce) return;
  const k = cards.getBoundingClientRect().width / cards.offsetWidth || 1;
  for (const [e, b] of before) {
    const a = e.getBoundingClientRect(), dx = (b.left - a.left) / k, dy = (b.top - a.top) / k;
    if (dx || dy) e.animate?.([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 150, easing: 'ease-out' });
  }
}
