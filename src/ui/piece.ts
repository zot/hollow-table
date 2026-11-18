// CRC: crc-PieceView.md | Seq: seq-save.md#1.4 | R392, R393, R390, R397, R398, R399, R400, R402, R403, R5, R206, R22, R23, R24, R25, R26, R27, R62, R202, R209, R213, R245, R248, R249, R250, R252, R253, R254, R255, R258, R259, R264, R265, R75, R76, R77, R283, R309, R310, R312, R316, R318, R339, R341, R342, R343, R354, R355, R363
// Draws one paper piece from its record and turns edits back into Game changes: character cards
// (both faces, the Damage columns), stickies, loose text, images, torn rolls and reference cards.
// The slimmest DOM that draws it: text is MarkedText.render, built with textContent only.

import type { Game } from '../model/game.ts';
import {
  DAMAGE, GM, ROWS, ridOf, type Character, type Damage, type DamageSlot, type Image, type Oid, type PieceRecord, type Place, type Reference,
  type Rid, type RowName, type Sticky, type Text, type TornRoll,
  type AttackKind, type Lasting, type LastingColumn,
} from '../model/records.ts';
import { blankFront, blankInfo, canSee, type Viewer } from '../rules/visibility.ts';
import { CATEGORIES, type Category, type Eyes } from './eyes.ts';
import { clues, entries, type Entry } from '../rules/readmarks.ts';
import { action as readAction, influence, suffered, suffers, variants } from '../rules/readmarks.ts';
import { left } from '../rules/tap.ts';
import { LEVELS, columnRoom } from '../rules/influence.ts';
import { COLUMN_OF, OVERFLOW, fill, isLasting, lastingLevels, lastingTop, type Page } from '../rules/absorb.ts';
import { parse, read, render, serialize, type Line, type MarkRun } from '../text/marks.ts';
import { gesture, type PointerLike } from './gesture.ts';
import { caretAt, tray } from './pens.ts';
import { receiptEl } from './receipt.ts';

/** What a piece's view needs from the page. */
export type PieceWith = {
  game: Game;
  viewer: Viewer;
  /** An object URL for an image's bytes, and its release; why it's missing, if it is. */
  imageUrl: (hash: string) => Promise<string | undefined>;
  imageGone: (hash: string) => void;
  missing: (hash: string) => string | undefined;
  /** Columns opened on cards (the Seat): `<oid>:<damage>`. */
  opened: () => Set<string>;
  setOpened: (open: Set<string>) => void;
  /** R397: the Info card slid out of each NPC's card (the Seat): `<oid>:<k>`. */
  slid: () => Set<string>;
  setSlid: (out: Set<string>) => void;
  /** Starts carrying this piece (Drag). */
  drag: (rid: string, down: PointerLike, move: PointerLike) => void;
  /** Starts carrying a tap glyph, `<character oid>:<source>` (Drag). */
  dragGlyph: (source: string, down: PointerLike, move: PointerLike) => boolean;
  /** An action's die (R76): false when this page can't roll for the character. */
  useAction: (oid: Oid, label: string, alt?: string) => boolean;
  /** The action in use on a character, for its swish (R77). */
  inUse: (oid: Oid) => string | null;
  /** R309–R312: an Attack being taken on this page, its pages flipped on the target's card. */
  taking: () => Taking | null;
  turnPage: (k: number) => void;
  takePage: () => void;
  cancelTake: () => void;
  /** R392: the GM's open eyes on this page. */
  eyes: Eyes;
  /** R403: buries an emptied Info card on Boot Hill with its place and its last words. */
  buryInfo: (oid: Oid, k: number, text: string) => void;
};

/** An Attack being taken: whose card, the receipt, the kind, the attacker's name, its Result, the pages and the one shown. */
export type Taking = { oid: Oid; id: string; kind: AttackKind; by: string; result: number; pages: Page[]; k: number };

/** The class a kind is drawn with, where it isn't the kind's own name. */
const CLASS: Partial<Record<PieceRecord['kind'], string>> = { text: 'loose', character: 'card' };
const LEVEL: Record<RowName, string> = { mild: 'Mild', min: 'Min', sig: 'Sig', maj: 'Maj' };
const COLUMN: Record<Damage, { name: string; mark: string }> = {
  bias: { name: 'Biases', mark: 'bias' }, affliction: { name: 'Afflictions', mark: 'aff' }, injury: { name: 'Injuries', mark: 'inj' },
};

// R5: tilted slightly at random, the same every time for the same piece.
export function tilt(oid: string): string {
  let h = 0;
  for (const c of oid) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `${(((h >>> 0) % 13) - 6) * 0.25}deg`;
}

const el = (doc: Document, tag: string, cls?: string, text?: string): HTMLElement => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Text written in place: drawn from marks, read back on input. Left alone while it has the caret. */
function writable(doc: Document, cls: string, source: string, save: (s: string) => void): HTMLElement {
  const t = el(doc, 'div', `${cls} writes`);
  t.contentEditable = 'true';
  t.spellcheck = false;
  render(parse(source), t);
  t.dataset.source = source;
  t.addEventListener('input', () => {
    const s = serialize(read(t));
    t.dataset.source = s;
    save(s);
  });
  return t;
}

// R255: ruled lines one screen pixel wide at any zoom, smooth on tilted paper: SVG lines with a
// non-scaling stroke behind the writing (CSS has no such line), kept under it as it scrolls. Enough
// for the tallest notes, with one to spare for the scroll.
const RULE_PX = 26, RULES = 12;
function ruled(doc: Document, text: HTMLElement): HTMLElement {
  const NS = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < RULES; k++) {
    const line = doc.createElementNS(NS, 'line'), y = String(RULE_PX * (k + 1) - 0.5);
    for (const [a, v] of [['x1', '0'], ['x2', '100%'], ['y1', y], ['y2', y]]) line.setAttribute(a!, v!);
    svg.append(line);
  }
  // The writing scrolls to keep the caret in view; the lines follow it, a line's spacing at most.
  text.addEventListener('scroll', () => { svg.style.transform = `translateY(${-(text.scrollTop % RULE_PX)}px)`; });
  const wrap = el(doc, 'div', 'ruled');
  wrap.append(svg, text);
  return wrap;
}

function rewrite(t: HTMLElement, source: string): void {
  if (t.dataset.source === source) return;
  if (t.ownerDocument.activeElement && t.contains(t.ownerDocument.activeElement)) return;   // mid-edit: theirs wins
  render(parse(source), t);
  t.dataset.source = source;
}

/** One Game change: the piece as it is now, rewritten by `fn`. */
function change<R extends PieceRecord>(w: PieceWith, rid: Rid, fn: (cur: R) => R): void {
  const cur = w.game.get(rid) as R | undefined;
  if (cur) w.game.change(wr => wr.put(rid, fn(cur)));
}

/** Where on the table a piece sits: a character by its card. */
export function placeOf(r: PieceRecord): Place | null {
  if (r.kind === 'character') return r.card;
  if ('place' in r) return r.place;
  return null;
}

/** Draws (or redraws) a piece. Chips and Influence cards are PoolView's. */
export function draw(r: PieceRecord, old: HTMLElement | undefined, w: PieceWith): HTMLElement | null {
  const at = placeOf(r);
  if (!at) return null;
  const doc = old?.ownerDocument ?? document;
  const e = old?.dataset.kind === r.kind ? old : make(doc, r, w);
  e.style.left = `${at.x}px`;
  e.style.top = `${at.y}px`;
  e.style.zIndex = String(at.z);
  e.style.setProperty('--tilt', tilt(r.oid));
  update(e, r, w);
  return e;
}

function make(doc: Document, r: PieceRecord, w: PieceWith): HTMLElement {
  const rid = ridOf(r.oid);
  const e = el(doc, 'div', `obj ${CLASS[r.kind] ?? r.kind}`);
  e.dataset.kind = r.kind;
  e.dataset.rid = rid;
  // A press that isn't writing carries the piece.
  e.addEventListener('pointerdown', ev => {
    const t = ev.target as HTMLElement;
    if (t.isContentEditable && t.ownerDocument.activeElement === t.closest('[contenteditable]')) ev.stopPropagation();
  }, true);
  gesture(e, {
    drag: (down, move) => { (doc.activeElement as HTMLElement | null)?.blur?.(); w.drag(rid, down, move); },
    // R392: in the Infer state, a click on an entry tears it out or mends it.
    click: ev => { if (r.kind === 'character') tear(e, r.oid, ev, w); },
  });

  switch (r.kind) {
    case 'character': {
      const flipper = el(doc, 'div', 'flipper');
      const front = el(doc, 'div', 'face front'), back = el(doc, 'div', 'face back');
      const text = writable(doc, 'text', r.front, s => change<Character>(w, rid, c => ({ ...c, front: s })));
      front.append(text);
      // R335: in capture, beside the listener above that keeps a press while writing from the piece.
      e.addEventListener('pointerdown', ev => checkPress(ev, text), true);
      back.append(el(doc, 'div', 'damage'), el(doc, 'div', 'notes-hd', 'Notes'),
        ruled(doc, writable(doc, 'notes', r.back.notes, s => change<Character>(w, rid, c => ({ ...c, back: { ...c.back, notes: s } })))));
      flipper.append(front, back);
      // R22: it flips at the corner.
      const flip = el(doc, 'button', 'flip');
      flip.setAttribute('aria-label', 'Flip the card');
      gesture(flip, { click: () => change<Character>(w, rid, c => ({ ...c, flipped: !c.flipped })) });
      // R392, R393: the GM's eye on an NPC's card, and the arrow that opens it on a category.
      const eye = el(doc, 'button', 'eye'), pick = el(doc, 'button', 'eyecat');
      eye.setAttribute('aria-label', 'Infer: show the table lines of this card');
      pick.setAttribute('aria-label', 'Open the eye on a category');
      gesture(eye, { click: () => { e.querySelector('.eyemenu')?.remove(); w.eyes.flip(r.oid); } });
      gesture(pick, { click: () => eyeMenu(e, r.oid, w) });
      e.append(flipper, flip, eye, pick, tray(e), el(doc, 'div', 'infos'));
      break;
    }
    case 'sticky': case 'text':
      e.append(writable(doc, 'text', r.text, s => change<Sticky | Text>(w, rid, c => ({ ...c, text: s }))), tray(e));
      break;
    case 'image': {
      const img = doc.createElement('img');
      img.alt = '';
      e.append(img);
      break;
    }
    case 'reference': e.append(...reference(doc, r)); break;
    case 'tornroll':
      // R283: the wheel scrolls a torn roll, and zooms the table only once it can scroll no further.
      e.addEventListener('wheel', ev => {
        const more = ev.deltaY < 0 ? e.scrollTop > 0 : e.scrollTop + e.clientHeight < e.scrollHeight - 1;
        if (more) ev.stopPropagation();
      }, { passive: true });
      break;
  }
  return e;
}

function update(e: HTMLElement, r: PieceRecord, w: PieceWith): void {
  switch (r.kind) {
    case 'character': {
      if (e.classList.contains('flipped') !== r.flipped) turn(e, r.flipped);
      // R390: a card its viewer can't read is drawn torn from its back; R392: so is the GM's in its
      // Infer state, the back translucent.
      const secret = !canSee(w.viewer, r), eyed = !!w.viewer?.gm && r.owner === GM;
      const draft = eyed ? w.eyes.draft(r.oid) : undefined;
      const back = secret || !!draft;
      e.classList.toggle('secret', secret);
      e.classList.toggle('eyed', eyed);
      e.classList.toggle('inferring', !!draft);
      const front = e.querySelector<HTMLElement>('.front > .text')!;
      front.contentEditable = back ? 'false' : 'true';
      // Secret blanks all but the shown lines; the draft keeps the words. The name takes the first line.
      const body = secret ? blankFront(r) : r.front;
      // The Infer state's entry targets are drawn over the text; once it ends, draw the text afresh.
      if (!draft && front.querySelector('[data-entries]')) delete front.dataset.source;
      rewrite(front, back ? named(body, r.name) : body);
      torn(front, r, secret, draft, draft ? w.eyes.cat(r.oid) : null);
      // Glyphs and dice are the readable card's: none on a back, nor in the Infer state that shows one.
      if (!back) frontGlyphs(front, r, w);
      infos(e, r, w, secret, draft);
      rewrite(e.querySelector('.back .notes')!, r.back.notes);
      damage(e.querySelector('.damage')!, r, w);
      dry(e, r);
      break;
    }
    case 'sticky': case 'text':
      rewrite(e.querySelector('.text')!, r.text);
      if (r.kind === 'sticky') e.classList.toggle('big', !!r.big);   // R248
      break;
    case 'image': image(e, r, w); break;
    case 'tornroll': tornroll(e, r); break;
    case 'reference': break;
  }
}

// R22, R252: a card turns over flat: squeezed to its edge on one face, opened on the other. A card
// not yet on the page, or under reduced motion, just shows the other face.
const TURN_MS = 125;
function turn(e: HTMLElement, flipped: boolean): void {
  const flipper = e.querySelector<HTMLElement>('.flipper')!;
  const reduce = e.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!e.isConnected || reduce || !flipper.animate) { e.classList.toggle('flipped', flipped); return; }
  flipper.getAnimations().forEach(a => a.cancel());
  const half = (from: string, to: string) => flipper.animate([{ transform: from }, { transform: to }], { duration: TURN_MS, easing: 'ease-in-out' });
  half('scaleX(1)', 'scaleX(0)').onfinish = () => {
    e.classList.toggle('flipped', flipped);
    half('scaleX(0)', 'scaleX(1)');
  };
}

// R26, R195: an image by its hash; striped and marked missing, with why, until it arrives.
function image(e: HTMLElement, r: Image, w: PieceWith): void {
  const img = e.querySelector('img')!;
  if (e.dataset.blob === r.blob) {
    const why = w.missing(r.blob);
    e.classList.toggle('missing', !!why && !img.src);
    if (why && !img.src) e.title = why;
    if (!img.src) void show();
    return;
  }
  if (e.dataset.blob) w.imageGone(e.dataset.blob);
  e.dataset.blob = r.blob;
  img.removeAttribute('src');
  e.classList.add('fetching');
  void show();
  async function show() {
    const url = await w.imageUrl(r.blob);
    if (e.dataset.blob !== r.blob) return;
    if (url) { img.src = url; e.classList.remove('fetching', 'missing'); e.removeAttribute('title'); }
    else {
      const why = w.missing(r.blob);
      e.classList.toggle('missing', !!why);
      if (why) e.title = why;
    }
  }
}

function tornroll(e: HTMLElement, r: TornRoll): void {
  const key = r.receipts.map(x => x.id).join(',');
  if (e.dataset.receipts === key) return;
  e.dataset.receipts = key;
  e.replaceChildren(...r.receipts.map(x => receiptEl(e.ownerDocument, x)));
}

// ---- the back: R23, R209, R213, R253, R264, R265 ----

const filled = (s: DamageSlot) => !!s.name || s.boxes.some(b => b);

// R253: the column brought to the front leads, the others following in turn.
/** The Damage columns in drawing order, rotated so `front` (or, with none, the first) leads. */
export function frontOrder(front: Damage | null): Damage[] {
  const k = front ? DAMAGE.indexOf(front) : 0;
  return [...DAMAGE.slice(k), ...DAMAGE.slice(0, k)];
}

function damage(box: HTMLElement, c: Character, w: PieceWith): void {
  const doc = box.ownerDocument, opened = w.opened();
  const put = (fn: (ch: Character) => Character) => change(w, ridOf(c.oid), fn);
  const slotAt = (ch: Character, d: Damage, row: RowName, s: Partial<DamageSlot>): Character =>
    ({ ...ch, back: { ...ch.back, damage: { ...ch.back.damage, [d]: { ...ch.back.damage[d], [row]: { ...ch.back.damage[d][row], ...s } } } } });

  if (!box.children.length) {
    for (const d of DAMAGE) {
      const col = el(doc, 'div', `column col-${d}`);
      col.dataset.damage = d;
      const hd = el(doc, 'div', 'hd');
      // R264: the absorb is worked out from Wis or Con, never typed.
      hd.append(`${COLUMN[d].name} `, el(doc, 'span', 'absorb'));
      col.append(hd);
      // R253: clicking a column's name brings it to the front, the only one opened on this card.
      gesture(hd, { click: () => {
        const mine = `${c.oid}:`;
        w.setOpened(new Set([...w.opened()].filter(k => !k.startsWith(mine)).concat(mine + d)));
      } });
      for (const row of ROWS) {
        const line = el(doc, 'div', 'slotline');
        line.dataset.row = row;
        const boxes = el(doc, 'span', 'boxes'), name = el(doc, 'span', `name ${COLUMN[d].mark}`);
        name.contentEditable = 'true';
        name.spellcheck = false;
        name.addEventListener('input', () => put(ch => slotAt(ch, d, row, { name: name.textContent ?? '' })));
        line.append(boxes, el(doc, 'span', 'lvl', LEVEL[row]), name, el(doc, 'span', 'spent'));
        col.append(line);
      }
      if (isLasting(d)) col.append(lastLine(doc, d, put));
      box.append(col);
    }
  }
  // R310, R312: while an Attack is taken here, the page shown is pencilled on its column.
  const taking = w.taking(), mine = taking?.oid === c.oid ? taking : null, page = mine?.pages[mine.k];
  const preview = mine && page ? fill(c, mine.kind, page, { name: mine.by, id: mine.id }) : null;
  const order = frontOrder(DAMAGE.find(d => opened.has(`${c.oid}:${d}`)) ?? null);
  for (const col of box.children as unknown as HTMLElement[]) {
    const d = col.dataset.damage as Damage, slots = c.back.damage[d], room = columnRoom(c, d), absorb = room?.absorb ?? 0;
    const empty = !ROWS.some(r => filled(slots[r])) && !absorb && !(isLasting(d) && c.back.lasting?.[d]);
    col.classList.toggle('empty', empty);
    col.classList.toggle('open', opened.has(`${c.oid}:${d}`));
    col.style.order = String(order.indexOf(d));
    col.querySelector('.absorb')!.textContent = absorb ? `(absorb ${absorb})` : '';
    for (const line of col.querySelectorAll<HTMLElement>('.slotline')) {
      const row = line.dataset.row as RowName, s = slots[row];
      const name = line.querySelector<HTMLElement>('.name')!;
      if (doc.activeElement !== name && name.textContent !== s.name) name.textContent = s.name;
      const spent = s.spent.reduce((a, b) => a + b, 0);
      // R312: a Slot waiting for the attacker's name says whose it is.
      name.classList.toggle('waiting', !!s.naming);
      if (s.naming) name.dataset.by = `${s.naming.by} names it`; else delete name.dataset.by;
      const after = preview?.back.damage[d][row];
      line.classList.toggle('fill', !!after && !!after.naming && !s.naming);
      line.querySelector('.spent')!.textContent = spent ? `−${spent}` : '';
      slotGlyphs(line, s, `${c.oid}:${d}/${row}`, w);
      // R213: the boxes in front of the Level word; R24, R62: they toggle, once the slot has a name.
      // R265: as many as Wis (or Con) gives, and any checked beyond that; unmarked, what the card has.
      const boxes = line.querySelector<HTMLElement>('.boxes')!;
      const count = room ? Math.max(room.boxes[row], s.boxes.lastIndexOf(true) + 1) : s.boxes.length;
      if (boxes.children.length !== count) {
        boxes.replaceChildren(...Array.from({ length: count }, (_, k) => {
          const b = el(doc, 'button', 'box');
          b.setAttribute('aria-label', `Slot ${k + 2}`);
          gesture(b, { click: () => put(ch => {
            const cur = ch.back.damage[d][row];
            if (!cur.name) { b.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }], 200); return ch; }
            const next = Array.from({ length: Math.max(cur.boxes.length, k + 1) }, (_, i) => !!cur.boxes[i]);
            next[k] = !next[k];
            return slotAt(ch, d, row, { boxes: next });
          }) });
          return b;
        }));
      }
      [...boxes.children].forEach((b, k) => {
        b.classList.toggle('on', !!s.boxes[k]);
        b.classList.toggle('pencil', !!after?.boxes[k] && !s.boxes[k]);
      });
    }
  }
  for (const line of box.querySelectorAll<HTMLElement>('.lastline')) {
    const d = line.dataset.damage as LastingColumn;
    showLasting(line, c.back.lasting?.[d], preview?.back.lasting?.[d], `${c.oid}:${d}/lasting`, w);
  }
  takeStrip(box, c, w);
}

// R341: a Conviction under Biases, a Burden under Afflictions: its word, tap glyph, name, Level, and
// points over its top. R342: name and points are written in place; with neither (and no name
// waited for) it is gone.
/** The character with column `d`'s Conviction or Burden changed by `s`, removed once it is blank. */
export function editLasting(ch: Character, d: LastingColumn, s: Partial<Lasting>): Character {
  const was = ch.back.lasting?.[d] ?? { name: '', points: 0, spent: 0 }, now = { ...was, ...s };
  const { [d]: _, ...others } = ch.back.lasting ?? {};
  const keep = now.name || now.points > 0 || now.naming;
  const lasting = keep ? { ...others, [d]: now } : others;
  const { lasting: __, ...back } = ch.back;
  return { ...ch, back: Object.keys(lasting).length ? { ...back, lasting } : back };
}

function lastLine(doc: Document, d: LastingColumn, put: (fn: (ch: Character) => Character) => void): HTMLElement {
  const line = el(doc, 'div', 'lastline');
  line.dataset.damage = d;
  const name = el(doc, 'span', `name ${COLUMN[d].mark}`), pts = el(doc, 'span', 'pts');
  for (const e of [name, pts]) { e.contentEditable = 'true'; e.spellcheck = false; }
  name.addEventListener('input', () => put(ch => editLasting(ch, d, { name: name.textContent ?? '' })));
  pts.addEventListener('input', () => put(ch => editLasting(ch, d, { points: Math.min(Number((pts.textContent ?? '').replace(/\D/g, '')) || 0, 10_000) })));
  line.append(el(doc, 'span', 'kind', OVERFLOW[d]), name, el(doc, 'span', 'lvl'), pts, el(doc, 'span', 'top'), el(doc, 'span', 'spent'));
  return line;
}

// R339: while an Attack is taken, the Conviction or Burden it would start or grow is pencilled.
function showLasting(line: HTMLElement, l: Lasting | undefined, after: Lasting | undefined, source: string, w: PieceWith): void {
  const doc = line.ownerDocument, shown = after ?? l, pencil = !!after && after !== l;
  line.hidden = !shown;
  line.classList.toggle('fill', pencil);
  if (!shown) return;
  const name = line.querySelector<HTMLElement>('.name')!, pts = line.querySelector<HTMLElement>('.pts')!;
  if (doc.activeElement !== name && name.textContent !== shown.name) name.textContent = shown.name;
  if (doc.activeElement !== pts && pts.textContent !== String(shown.points)) pts.textContent = String(shown.points);
  name.classList.toggle('waiting', !!shown.naming);
  if (shown.naming) name.dataset.by = `${shown.naming.by} names it`; else delete name.dataset.by;
  line.querySelector('.lvl')!.textContent = LEVELS[lastingLevels(shown.points) - 1]?.word ?? '';
  line.querySelector('.top')!.textContent = `/${lastingTop(shown.points)}`;
  line.querySelector('.spent')!.textContent = l?.spent ? `−${l.spent}` : '';
  // R343: a named one is tapped like its column's Damage.
  const want = l?.name ? source : '', g = line.querySelector<HTMLElement>('.glyph');
  if ((g?.dataset.source ?? '') === want) return;
  g?.remove();
  if (want) name.before(glyph(doc, want, w));
}

// R309–R311: the strip under the columns while an Attack is taken: its pages, Take and Cancel, and
// the overflow when nothing covers it.
function takeStrip(box: HTMLElement, c: Character, w: PieceWith): void {
  const doc = box.ownerDocument, t = w.taking(), mine = t?.oid === c.oid ? t : null;
  let strip = box.parentElement!.querySelector<HTMLElement>(':scope > .takestrip');
  if (!mine) { strip?.remove(); return; }
  if (!strip) { strip = el(doc, 'div', 'takestrip'); box.after(strip); }
  const page = mine.pages[mine.k]!, n = mine.pages.length, empty = ROWS.every(r => !page.use[r]);
  const button = (text: string, cls: string, title: string, go: () => void, off = false) => {
    const b = el(doc, 'button', cls, text) as HTMLButtonElement;
    b.title = title;
    b.disabled = off;
    gesture(b, { click: () => { if (!off) go(); } });
    return b;
  };
  const head = el(doc, 'div', 'takehd', `${mine.by}'s Attack, ${mine.result}`);
  const pager = el(doc, 'div', 'pager');
  pager.append(button('‹', 'turn', 'The page before', () => w.turnPage(mine.k - 1), mine.k === 0),
    el(doc, 'span', 'of', empty ? 'all absorbed' : `${mine.k + 1} of ${n}`),
    button('›', 'turn', 'The next page', () => w.turnPage(mine.k + 1), mine.k >= n - 1),
    button('Take', 'take', 'Fill these Slots', () => w.takePage()),
    button('Cancel', 'cancel', 'Back out: nothing changes', () => w.cancelTake()));
  strip.replaceChildren(head, pager);
  if (page.overflow) strip.append(el(doc, 'div', 'over', `${page.overflow} left over: a ${OVERFLOW[COLUMN_OF[mine.kind]]}`));
}

// ---- R54: tap glyphs, before each Resource and each named Damage slot, and for each checked box ----

function glyph(doc: Document, source: string, w: PieceWith): HTMLElement {
  const g = el(doc, 'span', 'glyph');
  g.contentEditable = 'false';
  g.dataset.source = source;
  g.title = 'Drag to tap';
  // Inside written text a press would start a selection or a native drag (which cancels the
  // pointer); the glyph is only ever carried.
  g.draggable = false;
  g.addEventListener('pointerdown', ev => ev.preventDefault());
  g.addEventListener('dragstart', ev => ev.preventDefault());
  // R259: a tap the page refuses (someone else's Resource) shakes the glyph and carries nothing.
  gesture(g, { drag: (d, m) => { if (!w.dragGlyph(source, d, m)) g.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 200); } });
  return g;
}

// R250: a source with no Levels left shows its glyph faded.
function dry(e: HTMLElement, c: Character): void {
  for (const g of e.querySelectorAll<HTMLElement>('.glyph')) {
    const s = g.dataset.source ?? '';
    g.classList.toggle('dry', left(c, s.slice(s.indexOf(':') + 1)) < 1);
  }
}

// R390: the public name in the first line's place, which holds more than the name.
const named = (front: string, name: string) => [`<head>${name}</head>`, ...front.split('\n').slice(1)].join('\n');

/** A small number from the card and the line, so a tear's ragged edge is the same on every page. */
function rag(oid: Oid, line: string): number {
  let h = 7;
  for (const ch of oid + line) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0) % 6;
}

// R390: a face-down card's name and lines with words are torn out of its back, a line at a time.
// R392, R393: in the GM's Infer state each entry is its own target, torn out with its line's label, or
// lit when it is in the chosen category (or ANY, R398) and still hidden; a front's name is torn out too.
function torn(text: HTMLElement, c: Character, secret: boolean, draft: ReadonlySet<string> | undefined, cat: Category | null,
  read: (src: string) => Entry[] = entries, name = true): void {
  const src = text.dataset.source ?? '', lines = src.split('\n'), doc = text.ownerDocument, by = new Map<number, Entry[]>();
  if (draft) for (const e of read(src)) by.set(e.line, [...(by.get(e.line) ?? []), e]);
  [...text.children].forEach((div, k) => {
    const d = div as HTMLElement, es = by.get(k), whole = secret ? lines[k] !== '' : !!draft && name && k === 0;
    d.classList.toggle('torn', whole);
    if (whole) d.style.setProperty('--rag', String(rag(c.oid, lines[k] ?? '')));
    else d.style.removeProperty('--rag');
    if (!es || !draft) return;
    const any = es.some(e => draft.has(e.key)), parts: (Node | string)[] = [];
    if (es[0]!.label) parts.push(el(doc, 'span', `label${any ? ' torn' : ''}`, es[0]!.label), ' ');
    es.forEach((e, i) => {
      if (i) parts.push(', ');
      const out = draft.has(e.key), lit = !!cat && (e.cat === cat || e.cat === 'any');
      const s = el(doc, 'span', `entry${out ? ' torn' : lit ? ' lit' : ''}`, e.text);
      s.dataset.key = e.key;
      if (out) s.style.setProperty('--rag', String(rag(c.oid, e.key)));
      parts.push(s);
    });
    d.replaceChildren(...parts);
    d.dataset.entries = '';
  });
}

// R400, R397–R399, R402: an NPC's Info cards, on folder tabs at its bottom edge; the one slid out is written
// on as the front is, or drawn torn from its back as the front is. A player's tab shows only with words on it.
function infos(e: HTMLElement, c: Character, w: PieceWith, secret: boolean, draft: ReadonlySet<string> | undefined): void {
  const doc = e.ownerDocument, box = e.querySelector<HTMLElement>(':scope > .infos')!, rid = ridOf(c.oid);
  const shown = new Set(c.shown ?? []), cards = (c.info ?? []).map(i => (secret ? blankInfo(i, shown) : i));
  const showing = cards.flatMap((t, k) => (secret && !t.trim() ? [] : [k]));
  const mine = `${c.oid}:`, at = [...w.slid()].find(s => s.startsWith(mine)), want = at ? Number(at.slice(mine.length)) : -1;
  const out = showing.includes(want) ? want : -1;
  const slide = (to: number) => w.setSlid(new Set([...w.slid()].filter(s => !s.startsWith(mine)).concat(to < 0 ? [] : [mine + to])));
  let paper = box.querySelector<HTMLElement>(':scope > .infopaper');
  if (paper && paper.dataset.k !== String(out)) { paper.remove(); paper = null; }
  if (out >= 0) {
    if (!paper) {
      paper = el(doc, 'div', 'infopaper');
      paper.dataset.k = String(out);
      // R403: the card's last words, kept as it is written, so undo brings back what it said before it was emptied.
      let words = cards[out]!;
      const text = writable(doc, 'text', words, s => {
        if (s.trim()) words = s;
        change<Character>(w, rid, x => ({ ...x, info: (x.info ?? []).map((t, j) => (j === out ? s : t)) }));
      });
      // R403: a card emptied is put away once the GM leaves it, buried on Boot Hill with its last words.
      text.addEventListener('focusout', () => {
        const x = w.game.get(rid) as Character | undefined;
        if (x?.info?.[out]?.trim() !== '') return;
        const { info: _, ...rest } = x, info = x.info.filter((__, j) => j !== out);
        w.game.change(g => g.put(rid, info.length ? { ...rest, info } : rest));
        if (words.trim()) w.buryInfo(c.oid, out, words);
        slide(-1);
      });
      paper.append(text);
      box.prepend(paper);
    }
    const text = paper.querySelector<HTMLElement>('.text')!;
    text.contentEditable = secret || draft ? 'false' : 'true';
    if (!draft && text.querySelector('[data-entries]')) delete text.dataset.source;
    rewrite(text, cards[out]!);
    torn(text, c, secret, draft, draft ? w.eyes.cat(c.oid) : null, clues, false);
  }
  const tabs = el(doc, 'div', 'infotabs');
  for (const k of showing) {
    const t = el(doc, 'button', `infotab${k === out ? ' out' : ''}`, cards.length > 1 ? `Info ${k + 1}` : 'Info');
    gesture(t, { click: () => slide(k === out ? -1 : k) });
    tabs.append(t);
  }
  box.querySelector(':scope > .infotabs')?.remove();
  box.append(tabs);
}

/** R393: the eye's category menu, under the arrow; a pick opens the eye on it. */
function eyeMenu(e: HTMLElement, oid: Oid, w: PieceWith): void {
  const was = e.querySelector('.eyemenu');
  if (was) { was.remove(); return; }
  const m = el(e.ownerDocument, 'div', 'eyemenu');
  for (const c of CATEGORIES) {
    const b = el(e.ownerDocument, 'button', '', c.word);
    gesture(b, { click: () => { m.remove(); w.eyes.open(oid, c.key); } });
    m.append(b);
  }
  e.append(m);
}

// R392: a click on an entry of a card in its Infer state tears it out or mends it.
function tear(e: HTMLElement, oid: Oid, ev: PointerLike, w: PieceWith): void {
  if (!w.eyes.draft(oid)) return;
  const entry = (ev.target as Element | null)?.closest?.<HTMLElement>('.entry');
  if (entry?.dataset.key) w.eyes.toggle(oid, entry.dataset.key);
}

/** Glyphs before the front's `<res>` and `<mot>` marks (R258); left alone while the front is being written in. */
function frontGlyphs(text: HTMLElement, c: Character, w: PieceWith): void {
  const doc = text.ownerDocument, using = w.inUse(c.oid);
  // R331: a Field's Skills indent under it, a ✓ hanging in the margin so the names align.
  const indents = skillIndents(c.front), vars = new Map(variants(c.front).map(v => [v.line, v]));
  [...text.children].forEach((line, k) => {
    line.classList.toggle('sklpad', indents.has(k));
    line.classList.toggle('sklhang', indents.get(k) === 'hang');
    // R354: a variant indents under the action it varies.
    line.classList.toggle('varpad', vars.has(k));
  });
  // R77: the action in use gets its highlighter swish, matched by label, so it survives edits.
  for (const span of text.querySelectorAll<HTMLElement>('span.act')) span.classList.toggle('inuse', !!using && readAction(span.textContent ?? '')?.label === using);
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const g of text.querySelectorAll('.glyph, .actdie')) g.remove();
  for (const span of text.querySelectorAll<HTMLElement>('span.res, span.mot')) {
    const name = influence(span.textContent ?? '')?.name;
    if (name) span.before(glyph(doc, `${c.oid}:${name}`, w));
  }
  // R316, R76: a small die before each alternative of an action's label (`Mental Atk / Req`); it brings
  // the roll row and fills it, the alternative naming the action. The dice hold no text, so the card's
  // text stays as written.
  for (const span of text.querySelectorAll<HTMLElement>('span.act')) {
    const label = readAction(span.textContent ?? '')?.label;
    // R363: a lone Influence, with no action above and no Skill named, is no action: no die.
    if (!label || (suffered(label) && !suffers(c.front, label))) continue;
    const alts = label.split('/').map(a => a.trim()).filter(Boolean);
    const die = (alt?: string, title = `Roll this: ${alt ?? label}`) => {
      const d = doc.createElement('span');
      d.className = 'actdie';
      d.contentEditable = 'false';
      d.title = title;
      d.addEventListener('pointerdown', ev => ev.preventDefault());
      gesture(d, { click: () => { if (!w.useAction(c.oid, label, alt)) d.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 200); } });
      return d;
    };
    // R355: a variant has a die per alternative of its action, the alternative typing its roll.
    let line: Element = span;
    while (line.parentElement && line.parentElement !== text) line = line.parentElement;
    const v = vars.get([...text.children].indexOf(line));
    if (v) {
      for (const alt of v.of.split('/').map(a => a.trim()).filter(Boolean)) span.before(die(alt, `Roll this: ${label} as ${alt}`));
      continue;
    }
    if (alts.length < 2) { span.before(die()); continue; }
    span.before(die(alts[0]));
    // Each later alternative: split the text where it starts, after its slash.
    let from = 0;
    for (const alt of alts.slice(1)) {
      const at = atText(span, alt, from);
      if (!at) break;
      from = at.offset;
      const rest = at.node.splitText(at.local);
      rest.before(die(alt));
    }
  }
}

// R331: every Skill line under a Field is indented ('pad'), and one with a ✓ hangs it in the margin
// ('hang'); a `Skills N:` line, or a Skill with no Field above, stays flush.
/** The front's Field Skill lines that indent, by line index. */
export function skillIndents(front: string): Map<number, 'pad' | 'hang'> {
  const out = new Map<number, 'pad' | 'hang'>();
  let group: { line: number; check: boolean }[] = [], inField = false;
  const close = () => {
    for (const g of group) out.set(g.line, g.check ? 'hang' : 'pad');
    group = [];
    inField = false;
  };
  parse(front).forEach((runs, line) => {
    const marked = runs.filter(r => typeof r !== 'string' || r.trim()) as (string | { mark: string; text: string })[];
    const only = marked.length === 1 && typeof marked[0] !== 'string' ? marked[0] : null;
    if (only?.mark === 'fld') { close(); inField = true; return; }
    if (inField && only?.mark === 'skl' && !/^\s*Skills\s+\d+\s*:/i.test(only.text)) { group.push({ line, check: /^\s*✓/.test(only.text) }); return; }
    close();
  });
  close();
  return out;
}

// R335: a Field Skill's ✓ written at the start of its text, or taken out; only on a line skillIndents indents.
/** The lines with that line's Field Skill check toggled; the same lines when it isn't an indented Skill. */
export function toggleCheck(lines: Line[], line: number): Line[] {
  if (!skillIndents(serialize(lines)).has(line)) return lines;
  const runs = lines[line]!, k = runs.findIndex(r => typeof r !== 'string' && r.mark === 'skl'), r = runs[k] as MarkRun;
  const text = /^\s*✓/.test(r.text) ? r.text.replace(/^(\s*)✓\s*/, '$1') : r.text.replace(/^(\s*)/, '$1✓ ');
  return lines.map((l, i) => i === line ? l.map((x, j) => j === k ? { ...r, text } : x) : l);
}

// R335: while the front holds the caret, a press in an indented Skill's margin, where the ghost or the
// hanging ✓ sits, toggles its check and saves through the front's own input, as a pen does.
function checkPress(ev: PointerEvent, t: HTMLElement): void {
  if (t.ownerDocument.activeElement !== t) return;
  const line = (ev.target as Element).closest('div');
  if (line?.parentElement !== t || !line.classList.contains('sklpad')) return;
  // Rects are in screen pixels, zoomed with the table; the margin is the line's left padding.
  const box = line.getBoundingClientRect(), scale = box.width / line.offsetWidth || 1;
  if (ev.clientX >= box.left + parseFloat(getComputedStyle(line).paddingLeft) * scale) return;
  const k = [...t.children].indexOf(line), lines = read(t), out = toggleCheck(lines, k);
  if (out === lines) return;
  ev.preventDefault();
  render(out, t);
  t.dispatchEvent(new Event('input', { bubbles: true }));
  caretAt(t, k);
}

/** Where `needle` starts after a `/` at or past `from` in the element's text: its text node and offset. */
function atText(el: HTMLElement, needle: string, from: number): { node: globalThis.Text; local: number; offset: number } | null {
  const whole = el.textContent ?? '', slash = whole.indexOf('/', from);
  if (slash < 0) return null;
  const offset = whole.indexOf(needle, slash);
  if (offset < 0) return null;
  const walk = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  for (let n = walk.nextNode() as globalThis.Text | null; n; n = walk.nextNode() as globalThis.Text | null) {
    if (offset < seen + n.length) return { node: n, local: offset - seen, offset: offset + needle.length };
    seen += n.length;
  }
  return null;
}

function slotGlyphs(line: HTMLElement, s: DamageSlot, base: string, w: PieceWith): void {
  const doc = line.ownerDocument, name = line.querySelector('.name')!;
  const want = s.name ? [base, ...s.boxes.flatMap((on, k) => on ? [`${base}#${k + 1}`] : [])] : [];
  const have = [...line.querySelectorAll<HTMLElement>('.glyph')].map(g => g.dataset.source);
  if (want.join() === have.join()) return;
  for (const g of line.querySelectorAll('.glyph')) g.remove();
  for (const source of want) name.before(glyph(doc, source, w));
}

// ---- reference cards: the "How to play the table" card (R9) and the printed actions card ----

function reference(doc: Document, r: Reference): HTMLElement[] {
  const p = (bold: string, rest = '') => { const e = el(doc, 'p'); e.append(el(doc, 'b', '', bold), rest); return e; };
  const hd = (left: string, right: string) => { const e = el(doc, 'div', 'rhd'); e.append(el(doc, 'span', '', left), el(doc, 'em', '', right)); return e; };
  if (r.which === 'actions') {
    return [hd('SKILL USE', 'ACTIONS'), p('CREATE INFLUENCE'), p('ATTACK', ': Create a Bias or Conviction'),
      p('INFER', ": Find out an NPC's Skills, Resources, Motivations, Opinions, or information on another character"),
      p('IMPRESS', ": change an NPC's Opinions"), p('REQUEST', ': get an NPC to transfer a Resource or perform a task')];
  }
  return [hd('How to play the table', 'put me away when known'),
    p('Move', ': drag anything; drag empty table to pan, the wheel zooms.'),
    p('Write', ': click paper to write; the pens mark what the table should read.'),
    p('Shift-click', ' (or press and hold) lowers, opens and deletes.'),
    p('Put away', ': drop it on the bar; Boot Hill keeps what was buried.'),
    p('Roll', ": the die by a pool's name docks your dice there.")];
}
