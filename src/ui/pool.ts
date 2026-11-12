// CRC: crc-PoolView.md | Seq: seq-drag.md#1.4, seq-drag.md#1.8, seq-drag.md#1.9 | R28, R29, R30, R31, R32, R33, R36, R37, R38, R39, R41, R47, R49, R50, R52, R53, R64
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
  const opened = w.poolOpen();
  for (const slotEl of e.querySelectorAll<HTMLElement>('.slot')) {
    const s = slotEl.dataset.slot as SlotName, mine = items.filter(i => at(i, c.oid, s));
    // R29, R31: an empty slot narrows to a strip with its letter, unless reached for.
    slotEl.classList.toggle('narrow', !mine.length && !opened.slots.has(`${c.oid}:${s}`));
    units(slotEl, mine, w);
  }
  drawer(e.querySelector('.drawer')!, c, items.filter(i => i.kind === 'influence' && i.home === c.oid) as Influence[], w);
  e.dataset.rid = rid;
  return e;
}

function make(doc: Document, c: Character, w: PoolWith): HTMLElement {
  const e = el(doc, 'div', 'obj glide pool');
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
    const label = el(doc, 'span', 'label', LABEL[s]);
    label.dataset.letter = LABEL[s][0]!;
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
  const drawer = el(doc, 'div', 'drawer');
  drawer.dataset.drawer = c.oid;
  e.append(hd, slots, drawer);
  return e;
}

// R39, R52, R53: positives from the top, negatives from the bottom, strongest nearest the edge;
// three equal cards are one pile that opens to list them.
function units(slotEl: HTMLElement, items: Item[], w: PoolWith): void {
  const doc = slotEl.ownerDocument, { units } = rollUp(items, () => '');
  const opened = w.poolOpen();
  for (const sign of [1, -1] as const) {
    const box = slotEl.querySelector<HTMLElement>(sign > 0 ? '.pos' : '.neg')!;
    const mine = units.filter(u => u.sign === sign).sort((a, b) => sign > 0 ? worthOf(b) - worthOf(a) : worthOf(a) - worthOf(b));
    box.replaceChildren(...mine.map(u => isPile(u) ? pile(doc, u, opened.piles, w) : chip(doc, u, w)));
  }
}

const worthOf = (u: Unit): number => isPile(u) ? u.points : worth(u);

// R36, R37, R38, R47: a chip shows its points, a red one its sign; a +1 rides on it; a card in a
// slot is a chip with its name on hover.
function chip(doc: Document, i: Item, w: PoolWith): HTMLElement {
  const b = el(doc, 'button', `chip ${i.sign > 0 ? 'pos' : 'neg'}${i.kind === 'influence' ? ' card-chip' : ''}`, `${i.sign < 0 ? '−' : ''}${i.points}`);
  const rid = ridOf(i.oid);
  b.dataset.rid = rid;
  if (i.kind === 'influence') b.title = i.name;
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

function pile(doc: Document, p: Exclude<Unit, Item>, open: Set<string>, w: PoolWith): HTMLElement {
  const first = (p.members[0] as Item | undefined)?.oid ?? '';
  const d = el(doc, 'div', `pile ${p.sign > 0 ? 'pos' : 'neg'}`);
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

// R47, R49, R50, R51, R64: the drawer's cards, its writers, its used pile and its kill box.
function drawer(box: HTMLElement, c: Character, cards: Influence[], w: PoolWith): void {
  const doc = box.ownerDocument, opened = w.poolOpen();
  const visible = canSee(w.viewer, c);
  const here = cards.filter(k => k.where === 'drawer'), used = cards.filter(k => k.where === 'used');
  const parts: HTMLElement[] = here.sort((a, b) => a.n - b.n).map(k => card(doc, k, visible, w));
  for (const sign of [1, -1] as const) {
    const pen = el(doc, 'button', 'write', sign > 0 ? '+' : '−');
    pen.title = sign > 0 ? 'Write a + card' : 'Write a − card';
    gesture(pen, { click: () => run(w.game, writeCard(c.oid, sign, '', w.mint())) });
    parts.push(pen);
  }
  const pileTag = el(doc, 'button', 'used', `used ${used.length}`);
  gesture(pileTag, { click: () => w.toggle('used', c.oid) });
  parts.push(pileTag, Object.assign(el(doc, 'span', 'kill', 'kill'), { title: 'Drop a card here to delete it' }));
  if (opened.used.has(c.oid)) {
    const list = el(doc, 'div', 'usedlist');
    for (const k of used) {
      const u = card(doc, k, visible, w);
      gesture(u, { click: () => run(w.game, restoreUsed(w.game, ridOf(k.oid))) });
      list.append(u);
    }
    parts.push(list);
  }
  box.replaceChildren(...parts);
}

function card(doc: Document, k: Influence, visible: boolean, w: PoolWith): HTMLElement {
  const rid = ridOf(k.oid);
  const e = el(doc, 'span', `icard ${k.sign > 0 ? 'pos' : 'neg'}${k.used ? ' isused' : ''}${k.tap ? ' tapped' : ''}${k.crit ? ' crit' : ''}`);
  e.dataset.rid = rid;
  const drag = { drag: (d: PointerLike, m: PointerLike) => w.dragItem(rid, d, m) };
  if (!visible) { e.classList.add('facedown'); e.textContent = '?'; gesture(e, drag); return e; }
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
