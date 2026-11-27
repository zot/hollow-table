// CRC: crc-Desk.md | R591, R530, R512, R513, R514, R515, R516, R517, R520, R526, R527, R546, R547, R548, R551, R552, R553, R562, R556, R559, R560
// The desk on the bar: a little writing desk whose pigeonholes hold the paper supplies. A press opens the
// strip of pigeonholes and follows the pointer: dragged across them it holds each one's piece small,
// dragged out it hands the piece to the page to make and carry, and let go it decides what the
// release means (release, pure).

import { gesture, type PointerLike } from './gesture.ts';
import { LABEL, deskName, deskNext, deskPrev, deskRename, drawers, inDrawer, search } from '../rules/drawers.ts';
import type { Desk, Drawer } from '../model/records.ts';

/** What a pigeonhole holds. */
export type Paper = 'character' | 'sticky' | 'text' | 'image' | 'howto' | 'docket' | 'connections';
/** How a piece taken from the desk is carried: on the press, with no button held, or not at all (put just below the strip). */
export type Mode = 'press' | 'loose' | 'below';
/** A screen point. */
export type At = { clientX: number; clientY: number };

export type DeskWith = {
  /** R600: this build's; its page hooks end when it aborts. */
  signal: AbortSignal;
  /** R518: the GM's desk has the Connection Table's pigeonhole. */
  gm: boolean;
  /** Makes a supply at `move` and carries it (R512-R514). */
  take: (what: Exclude<Paper, 'image'>, down: PointerLike, move: PointerLike, mode: Mode) => void;
  /** R515: picked images, landing at `at` (null: the middle of the view); one alone carried with no button held when `carry`. */
  images: (files: File[], at: At | null, carry: boolean) => void;
  /** R526, R550: this page's desks (its `desk` record). */
  filed: () => Desk;
  /** R527: entry `k` of desk `at` taken out under the pointer, and carried. */
  takeOut: (at: number, k: number, move: PointerLike) => void;
  /** R552: the desk open (the GM's seat), and the desks changed with the one open after. */
  cur: () => number;
  setDesks: (desks: Desk, cur: number) => void;
  /** R559: sets desk `to` out: everyone's table switches to its desktop. */
  setOut: (to: number) => void;
};

/** What letting go means (R513-R516). */
export type Release = 'open' | 'close' | 'loose' | 'below' | 'picker';

/** The press, as it is when let go. */
export type Let = {
  /** The pointer moved past a click. */
  moved: boolean;
  /** Let go on the desk itself (not a pigeonhole). */
  onDesk: boolean;
  /** The pigeonhole let go in, if any. */
  hole: Paper | null;
  /** The image dragged out of the strip, carried small to here. */
  imageOut: boolean;
  touch: boolean;
  /** The whole desk was open when pressed. */
  open: boolean;
};

// R513-R516: a click on the desk opens it (or closes it, open); let go in a pigeonhole, its piece is made
// and carried loose, or on touch put just below the strip; the image's pigeonhole, or the image dragged
// out, opens the picker; anywhere else nothing.
export function release(l: Let): Release {
  if (l.imageOut || l.hole === 'image') return 'picker';
  if (l.hole) return l.touch ? 'below' : 'loose';
  if (!l.moved && l.onDesk) return l.open ? 'close' : 'open';
  return 'close';
}

const HOLES: [Paper, string, string, string][] = [
  ['character', 'supply card', 'character', 'A new character: card and pool'],
  ['sticky', 'supply note', 'note', 'Sticky note'],
  ['text', 'supply aa', 'Aa', 'Write on the table'],
  ['image', 'supply image', 'image', 'Add an image'],
  ['howto', 'supply howto', 'how to play', 'The reference sheet: how to use the table, the quick reference, quick character creation'],
  // R591, R530: a docket's label on its red tape.
  ['docket', 'supply docket', 'docket', 'A docket: a named bundle of paper, tied in red tape'],
];
// R518: the GM's alone.
const LINKS: [Paper, string, string, string] = ['connections', 'supply links', 'connections', 'The Connection Table: how the characters view each other'];

// R597: the writing desk, 66 × 58, seen a little from above: legs, the gallery's scalloped rail and case,
// its pigeonholes (a group the CSS lights, R598) with paper standing in them (a card, a sticky, manila,
// a sheet), three little drawers, the green leather top, and the apron's two drawers with brass rings.
// Flat fills: the drawing appears more than once, so it carries no gradient ids to collide.
const ART = `
<path d="M15 40h2l-.5 11h-1zM49 40h2l-.5 11h-1z" fill="#6e4b33"/>
<path d="M5 40h4l-1 16H6zM57 40h4l-1 16h-2z" fill="#7a5337"/>
<path d="M9 7q5-4 11-2t13-2q7 4 13 2t11 2v2H9z" fill="#6e4b33"/>
<rect x="8" y="8" width="50" height="16" rx="1" fill="#8f6444"/>
<rect x="8" y="8" width="50" height="1.5" fill="#a0714b"/>
<g class="holes">
<path d="M10 23V12q3.25-2 6.5 0v11zM18 23V12q3.25-2 6.5 0v11zM41.5 23V12q3.25-2 6.5 0v11zM49.5 23V12q3.25-2 6.5 0v11z"/>
</g>
<rect x="11" y="15" width="4.5" height="8" fill="#fbfaf6"/>
<rect x="19" y="17" width="4.5" height="6" fill="#fff200"/>
<rect x="42.5" y="14" width="4.5" height="9" fill="#ecd9a8"/>
<rect x="50.5" y="16" width="4.5" height="7" fill="#fbfaf6"/>
<g fill="#8a5d3d" stroke="rgba(0,0,0,.4)" stroke-width=".5">
<rect x="27" y="10" width="12" height="4"/><rect x="27" y="15" width="12" height="4"/><rect x="27" y="20" width="12" height="3.5"/>
</g>
<g fill="#d9b45a"><circle cx="33" cy="12" r=".8"/><circle cx="33" cy="17" r=".8"/><circle cx="33" cy="21.8" r=".8"/></g>
<path d="M7 24h52l4 7H3z" fill="#7a5337"/>
<path d="M9 24.6h48l3.5 5.6h-55z" fill="#5f6b2e"/>
<path d="M10.5 25.3h45l3.1 4.2H7.4z" fill="none" stroke="#c9a84a" stroke-width=".5" opacity=".8"/>
<rect x="3" y="31" width="60" height="10" rx="1" fill="#8f6444"/>
<rect x="3" y="31" width="60" height="1.2" fill="#a0714b"/>
<g fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"><rect x="5" y="32.5" width="27" height="7"/><rect x="34" y="32.5" width="27" height="7"/></g>
<g fill="none" stroke="#d9b45a" stroke-width=".9"><circle cx="18.5" cy="36" r="1.7"/><circle cx="47.5" cy="36" r="1.7"/></g>
<rect x="3" y="41" width="60" height="1.2" fill="rgba(0,0,0,.3)"/>`;

/** R597: the writing desk's drawing, for the bar's desk and each row of the board. */
export function deskArt(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'art');
  svg.setAttribute('viewBox', '0 0 66 58');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ART;
  return svg;
}

/** How far a press may wander and still be a click. */
const CLICK = 4;
/** How far below the strip a piece put there on touch has its middle (R514). */
const BELOW = 110;
/** R559: the knife switch's hint while the open desk is not set out. */
const THROW = 'Set this desk out: everyone\'s table switches to its desktop';

export class DeskView {
  readonly el: HTMLElement;
  #w: DeskWith;
  /** The panel below the desk: the pigeonholes, and on the open desk the drawers. */
  #strip: HTMLElement;
  #drawers: HTMLElement;
  /** R526: the drawer pulled out, if any. */
  #pulled: Drawer | null = null;
  /** R546, R547: the search line, and whether its list shows (from its focus until a drawer is pulled or the desk closes). */
  #find: HTMLInputElement;
  #searching = false;
  /** What render redraws: the drawer fronts and the list below them. */
  #body: HTMLElement;
  /** R551: the open desk's name, between its arrows (the GM's). */
  #name: HTMLInputElement;
  /** R559, R560: the knife switch beside the open desk's name (the GM's). */
  #knife: HTMLElement | null = null;
  /** R562: the board of desks hung below the desk while a piece would be filed. */
  #board: HTMLElement;
  #image: HTMLElement;
  #imageSays: { text: string; title: string };
  #file: HTMLInputElement;
  /** Where picked images go, and whether one is carried. */
  #pickAt: { at: At; carry: boolean } | null = null;
  #open = false;

  constructor(doc: Document, w: DeskWith) {
    this.#w = w;
    const el = (tag: string, cls: string, text = '', title = '') => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    // R591, R510, R597: a little writing desk, right after the wordmark.
    this.el = el('div', 'desk', '', 'The desk: press for paper; click to open it');
    this.el.append(deskArt(doc));
    this.#strip = el('div', 'deskpanel');
    const holes = el('div', 'pigeonholes');
    this.#drawers = el('div', 'drawers');
    // R546, R547: the search line, at the top of the drawers, kept across redraws so it keeps its caret.
    this.#find = doc.createElement('input');
    this.#find.className = 'search';
    this.#find.placeholder = 'Find in the desk';
    this.#find.spellcheck = false;
    const searching = () => { this.#searching = true; this.#pulled = null; this.render(); };
    this.#find.addEventListener('focus', searching);
    this.#find.addEventListener('input', searching);
    this.#body = el('div', 'drawerbody');
    // R551, R553: on the GM's page ‹, the open desk's name and ›, browsed as Boot Hill's graveyards are.
    this.#name = doc.createElement('input');
    this.#name.className = 'dname';
    this.#name.spellcheck = false;
    this.#name.placeholder = 'Unnamed desk';
    this.#name.setAttribute('aria-label', 'Desk name');
    if (w.gm) {
      const nav = el('div', 'desknav');
      const back = el('button', 'deskprev', '‹', 'The desk before'), on = el('button', 'desknext', '›', 'The next desk, or a new one');
      const browse = (f: (d: Desk, cur: number) => { desk: Desk; cur: number }) => {
        const b = f(w.filed(), this.#cur());
        w.setDesks(b.desk, b.cur);
        this.render();
      };
      back.addEventListener('click', () => browse(deskPrev));
      on.addEventListener('click', () => browse(deskNext));
      this.#name.addEventListener('input', () => {
        const d = w.filed(), cur = this.#cur(), n = this.#name.value;
        w.setDesks({ ...d, desks: d.desks.map((x, i) => (i === cur ? { ...x, name: n, named: n.trim() !== '' } : x)) }, cur);
      });
      this.#name.addEventListener('change', () => browse((d, cur) => deskRename(d, cur, this.#name.value)));
      // R559, R560: the knife switch: thrown, the open desk is set out; on the desk set out it shows thrown.
      this.#knife = el('button', 'knife', '', THROW);
      this.#knife.addEventListener('click', () => { const cur = this.#cur(); if (cur !== (w.filed().out ?? 0)) w.setOut(cur); });
      nav.append(back, this.#name, on, this.#knife);
      this.#drawers.append(nav);
    }
    this.#drawers.append(this.#find, this.#body);
    this.#board = el('div', 'deskboard');
    this.#strip.append(holes, this.#drawers);
    let image: HTMLElement | null = null;
    for (const [what, cls, text, title] of w.gm ? [...HOLES, LINKS] : HOLES) {
      const hole = el('div', 'hole', '', title), icon = el('div', cls, text);
      hole.dataset.paper = what;
      hole.append(icon);
      holes.append(hole);
      if (what === 'image') image = icon;
    }
    this.#image = image ?? el('div', 'supply image');
    this.#imageSays = { text: this.#image.textContent ?? '', title: this.#image.title };
    // R515: the image pigeonhole's file picker.
    this.#file = doc.createElement('input');
    this.#file.type = 'file';
    this.#file.accept = 'image/*';
    this.#file.multiple = true;
    this.#file.hidden = true;
    this.#file.addEventListener('change', () => {
      const files = [...(this.#file.files ?? [])], to = this.#pickAt;
      this.#file.value = '';
      this.#pickAt = null;
      // Files given the input with no release (a test, say) land in the middle of the view.
      if (files.length) w.images(files, to?.at ?? null, !!to?.carry && files.length === 1);
    });
    this.el.append(this.#strip, this.#board, this.#file);
    this.el.addEventListener('pointerdown', ev => { if (!this.#drawers.contains(ev.target as Node)) this.#press(ev); });
    this.render();
    // R516: an open desk closes on a press anywhere else.
    doc.addEventListener('pointerdown', ev => { if (this.#open && !this.el.contains(ev.target as Node)) this.#show(false); }, { capture: true, signal: w.signal });
  }

  // R517: the image pigeonhole says the browser won't keep an image, and the desk is edged red.
  /** Marks the image pigeonhole refused (`label`, and `why` on hover), or plain again with null. */
  refused(r: { label: string; why: string } | null): void {
    this.#image.classList.toggle('refused', !!r);
    this.#image.textContent = r ? r.label : this.#imageSays.text;
    this.#image.title = r ? r.why : this.#imageSays.title;
    this.el.classList.toggle('refused', !!r);
  }

  /** R552: the open desk's index, within the desks there are. */
  #cur(): number { return Math.max(0, Math.min(this.#w.cur(), this.#w.filed().desks.length - 1)); }

  // R526: the open desk's drawers: a front each, a brass pull and its label; the one pulled out lists
  // what is filed in it, oldest first, by name; an entry dragged out comes back (R527).
  /** Draws the drawers from the page's desk record. */
  render(): void {
    const doc = this.el.ownerDocument;
    const make = (tag: string, cls: string, text = '', title = ''): HTMLElement => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const desks = this.#w.filed(), cur = this.#cur(), several = desks.desks.length > 1;
    if (doc.activeElement !== this.#name) this.#name.value = desks.desks[cur]?.name ?? '';
    // R562, R597: the board: a row per desk, each a miniature of the desk and its name.
    this.el.classList.toggle('several', several);
    const out = Math.min(desks.out ?? 0, desks.desks.length - 1);
    if (this.#knife) {
      this.#knife.classList.toggle('thrown', cur === out);
      this.#knife.title = cur === out ? 'This desk is set out' : THROW;
    }
    // R562, R560: the desk set out first, marked with a tiny closed knife switch.
    const order = [out, ...desks.desks.map((_, i) => i).filter(i => i !== out)];
    this.#board.replaceChildren(...order.map(i => {
      const row = make('div', 'deskrow'), name = deskName(desks.desks[i]!);
      row.dataset.desk = String(i);
      row.dataset.name = name;
      const mini = make('span', 'minidesk');
      mini.append(deskArt(doc));
      row.append(mini, make('span', 'holder', name));
      if (i === out) row.append(make('span', 'switch', '', 'Set out'));
      return row;
    }));
    const fronts = make('div', 'fronts');
    for (const d of drawers(this.#w.gm)) {
      const front = make('button', `drawerfront${this.#pulled === d ? ' pulled' : ''}`, '', `${LABEL[d]}: click to pull it out`);
      front.dataset.drawer = d;
      front.append(make('span', 'label', LABEL[d]), make('span', 'pull'));
      front.addEventListener('click', () => { this.#pulled = this.#pulled === d ? null : d; this.#searching = false; this.render(); });
      fronts.append(front);
    }
    // R527, R548, R556: an entry, dragged out, comes back under the pointer; a search's shows its drawer,
    // and its desk when there are several.
    const entry = (at: number, k: number, name: string, drawer?: Drawer) => {
      const b = make('button', '', name, 'Drag this back onto the table');
      if (drawer) b.append(make('span', 'where', several ? `${deskName(desks.desks[at]!)}: ${LABEL[drawer]}` : LABEL[drawer]));
      gesture(b, { drag: (_down, move) => { this.#show(false); this.#w.takeOut(at, k, move); } });
      return b;
    };
    if (this.#searching) {
      const list = make('div', 'filed found'), hits = search(desks, this.#find.value);
      if (!hits.length) list.append(make('p', '', this.#find.value.trim() ? 'Nothing found.' : 'Nothing filed here.'));
      for (const { at, k, entry: e } of hits) list.append(entry(at, k, e.name, e.drawer));
      this.#body.replaceChildren(fronts, list);
      return;
    }
    if (!this.#pulled) {
      this.#body.replaceChildren(fronts);
      return;
    }
    const list = make('div', 'filed'), filed = inDrawer(desks, cur, this.#pulled);
    list.dataset.drawer = this.#pulled;
    if (!filed.length) list.append(make('p', '', 'Nothing filed here.'));
    for (const { k, entry: e } of filed) list.append(entry(cur, k, e.name));
    this.#body.replaceChildren(fronts, list);
  }

  /** The strip shown (a press or the open desk) or hidden; `open` keeps it until a press elsewhere. */
  #show(on: boolean, open = false): void {
    this.#open = on && open;
    if (!this.#open && (this.#pulled || this.#searching || this.#find.value)) {
      this.#pulled = null;
      this.#searching = false;
      this.#find.value = '';
      this.render();
    }
    this.el.classList.toggle('pressed', on);
    this.el.classList.toggle('open', this.#open);
  }

  #holeAt(x: number, y: number): Paper | null {
    const e = this.el.ownerDocument.elementFromPoint(x, y) as HTMLElement | null;
    const hole = e?.closest<HTMLElement>('.hole');
    return hole && this.el.contains(hole) ? hole.dataset.paper as Paper : null;
  }

  #inside(x: number, y: number): boolean {
    return [this.el, this.#strip].some(e => {
      const r = e.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }

  // R530, R512-R516: the press, followed until it is let go or hands its piece over.
  #press(down: PointerEvent): void {
    if (down.button !== 0) return;
    down.preventDefault();
    const doc = this.el.ownerDocument, open = this.#open;
    this.#show(true, open);
    let moved = false, held: Paper | null = this.#holeAt(down.clientX, down.clientY), imageOut = false;
    let ghost: HTMLElement | null = null;
    const hold = (what: Paper | null, at: At) => {
      if (what && ghost?.dataset.paper !== what) {
        ghost?.remove();
        const icon = this.#strip.querySelector(`[data-paper="${what}"] > *`)!;
        ghost = icon.cloneNode(true) as HTMLElement;
        ghost.classList.add('ghost');
        ghost.dataset.paper = what;
        this.el.append(ghost);   // in the bar, so it is drawn as the supplies are
      }
      if (ghost) { ghost.style.left = `${at.clientX}px`; ghost.style.top = `${at.clientY}px`; }
    };
    const stop = () => {
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', cancel);
      ghost?.remove();
    };
    const move = (ev: Event) => {
      const e = ev as PointerEvent;
      if (e.pointerId !== down.pointerId) return;
      if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > CLICK) moved = true;
      if (imageOut) { hold('image', e); return; }
      const h = this.#holeAt(e.clientX, e.clientY);
      if (h) held = h;
      if (!this.#inside(e.clientX, e.clientY) && held) {
        // R515: the image keeps its small ghost to the drop; R512: anything else is made and carried.
        if (held === 'image') { imageOut = true; hold('image', e); return; }
        stop();
        this.#show(false);
        this.#w.take(held, down, e, 'press');
        return;
      }
      hold(held, e);
    };
    const up = (ev: Event) => {
      const e = ev as PointerEvent;
      if (e.pointerId !== down.pointerId) return;
      stop();
      const hole = imageOut ? null : this.#holeAt(e.clientX, e.clientY);
      const r = release({ moved, onDesk: !hole && this.el.contains(e.target as Node), hole, imageOut, touch: e.pointerType === 'touch', open });
      if (r === 'open') { this.#show(true, true); return; }
      const under = this.#strip.getBoundingClientRect().bottom;   // read while the strip still shows
      this.#show(false);
      const paper = hole as Exclude<Paper, 'image'>;
      if (r === 'picker') {
        // R515: opened within the release, so the browser counts it as the person's.
        this.#pickAt = { at: { clientX: e.clientX, clientY: e.clientY }, carry: !imageOut };
        this.#file.click();
      } else if (r === 'loose') this.#w.take(paper, e, e, 'loose');
      else if (r === 'below') {
        // R514: on touch, its middle a little below the strip, under the pigeonhole.
        const at = { clientX: e.clientX, clientY: under + BELOW } as PointerLike;
        this.#w.take(paper, at, at, 'below');
      }
    };
    const cancel = (ev: Event) => { if ((ev as PointerEvent).pointerId === down.pointerId) { stop(); this.#show(false); } };
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', cancel);
    hold(held, down);
  }
}
