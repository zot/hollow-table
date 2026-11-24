// CRC: crc-Desk.md | R529, R530, R512, R513, R514, R515, R516, R517, R520, R526, R527, R546, R547, R548
// The desk on the bar: a little roll-top whose pigeonholes hold the paper supplies. A press opens the
// strip of pigeonholes and follows the pointer: dragged across them it holds each one's piece small,
// dragged out it hands the piece to the page to make and carry, and let go it decides what the
// release means (release, pure).

import { gesture, type PointerLike } from './gesture.ts';
import { LABEL, drawers, inDrawer, search } from '../rules/drawers.ts';
import type { Desk, Drawer } from '../model/records.ts';

/** What a pigeonhole holds. */
export type Paper = 'character' | 'sticky' | 'text' | 'image' | 'howto' | 'docket' | 'connections';
/** How a piece taken from the desk is carried: on the press, with no button held, or not at all (put just below the strip). */
export type Mode = 'press' | 'loose' | 'below';
/** A screen point. */
export type At = { clientX: number; clientY: number };

export type DeskWith = {
  /** R518: the GM's desk has the Connection Table's pigeonhole. */
  gm: boolean;
  /** Makes a supply at `move` and carries it (R512-R514). */
  take: (what: Exclude<Paper, 'image'>, down: PointerLike, move: PointerLike, mode: Mode) => void;
  /** R515: picked images, landing at `at` (null: the middle of the view); one alone carried with no button held when `carry`. */
  images: (files: File[], at: At | null, carry: boolean) => void;
  /** R526: this page's drawers (its `desk` record). */
  filed: () => Desk | undefined;
  /** R527: entry `k` taken out of the desk under the pointer, and carried. */
  takeOut: (k: number, move: PointerLike) => void;
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
  ['howto', 'supply howto', 'how to play', 'The "How to play the table" card'],
  // R529, R530: a docket's label on its red tape.
  ['docket', 'supply docket', 'docket', 'A docket: a named bundle of paper, tied in red tape'],
];
// R518: the GM's alone.
const LINKS: [Paper, string, string, string] = ['connections', 'supply links', 'connections', 'The Connection Table: how the characters view each other'];

/** How far a press may wander and still be a click. */
const CLICK = 4;
/** How far below the strip a piece put there on touch has its middle (R514). */
const BELOW = 110;

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
    // R529, R510: a little roll-top, right after the wordmark.
    this.el = el('div', 'desk', '', 'The desk: press for paper; click to open it');
    this.el.append(el('div', 'rolltop'), el('div', 'desktop'));
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
    this.#drawers.append(this.#find, this.#body);
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
    this.el.append(this.#strip, this.#file);
    this.el.addEventListener('pointerdown', ev => { if (!this.#drawers.contains(ev.target as Node)) this.#press(ev); });
    this.render();
    // R516: an open desk closes on a press anywhere else.
    doc.addEventListener('pointerdown', ev => { if (this.#open && !this.el.contains(ev.target as Node)) this.#show(false); }, true);
  }

  // R517: the image pigeonhole says the browser won't keep an image, and the desk is edged red.
  /** Marks the image pigeonhole refused (`label`, and `why` on hover), or plain again with null. */
  refused(r: { label: string; why: string } | null): void {
    this.#image.classList.toggle('refused', !!r);
    this.#image.textContent = r ? r.label : this.#imageSays.text;
    this.#image.title = r ? r.why : this.#imageSays.title;
    this.el.classList.toggle('refused', !!r);
  }

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
    const fronts = make('div', 'fronts');
    for (const d of drawers(this.#w.gm)) {
      const front = make('button', `drawerfront${this.#pulled === d ? ' pulled' : ''}`, '', `${LABEL[d]}: click to pull it out`);
      front.dataset.drawer = d;
      front.append(make('span', 'label', LABEL[d]), make('span', 'pull'));
      front.addEventListener('click', () => { this.#pulled = this.#pulled === d ? null : d; this.#searching = false; this.render(); });
      fronts.append(front);
    }
    // R527, R548: an entry, dragged out, comes back under the pointer; a search's shows its drawer.
    const entry = (k: number, name: string, drawer?: Drawer) => {
      const b = make('button', '', name, 'Drag this back onto the table');
      if (drawer) b.append(make('span', 'where', LABEL[drawer]));
      gesture(b, { drag: (_down, move) => { this.#show(false); this.#w.takeOut(k, move); } });
      return b;
    };
    if (this.#searching) {
      const list = make('div', 'filed found'), hits = search(this.#w.filed(), this.#find.value);
      if (!hits.length) list.append(make('p', '', this.#find.value.trim() ? 'Nothing found.' : 'Nothing filed here.'));
      for (const { k, entry: e } of hits) list.append(entry(k, e.name, e.drawer));
      this.#body.replaceChildren(fronts, list);
      return;
    }
    if (!this.#pulled) {
      this.#body.replaceChildren(fronts);
      return;
    }
    const list = make('div', 'filed'), filed = inDrawer(this.#w.filed(), this.#pulled);
    list.dataset.drawer = this.#pulled;
    if (!filed.length) list.append(make('p', '', 'Nothing filed here.'));
    for (const { k, entry: e } of filed) list.append(entry(k, e.name));
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
