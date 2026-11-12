// CRC: crc-PieceView.md | Seq: seq-save.md#1.4 | R5, R206, R22, R23, R24, R25, R26, R27, R62, R202, R209, R213, R245, R248, R249, R250, R252, R253, R254, R255, R258, R259, R264, R265
// Draws one paper piece from its record and turns edits back into Game changes: character cards
// (both faces, the Damage columns), stickies, loose text, images, torn rolls and reference cards.
// The slimmest DOM that draws it: text is MarkedText.render, built with textContent only.

import type { Game } from '../model/game.ts';
import {
  DAMAGE, ROWS, ridOf, type Character, type Damage, type DamageSlot, type Image, type PieceRecord, type Place, type Reference,
  type Rid, type RowName, type Sticky, type Text, type TornRoll,
} from '../model/records.ts';
import { canSee, type Viewer } from '../rules/visibility.ts';
import { influence } from '../rules/readmarks.ts';
import { left } from '../rules/tap.ts';
import { columnRoom } from '../rules/influence.ts';
import { parse, read, render, serialize } from '../text/marks.ts';
import { gesture, type PointerLike } from './gesture.ts';
import { tray } from './pens.ts';
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
  /** Starts carrying this piece (Drag). */
  drag: (rid: string, down: PointerLike, move: PointerLike) => void;
  /** Starts carrying a tap glyph, `<character oid>:<source>` (Drag). */
  dragGlyph: (source: string, down: PointerLike, move: PointerLike) => boolean;
};

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
  gesture(e, { drag: (down, move) => { (doc.activeElement as HTMLElement | null)?.blur?.(); w.drag(rid, down, move); } });

  switch (r.kind) {
    case 'character': {
      const flipper = el(doc, 'div', 'flipper');
      const front = el(doc, 'div', 'face front'), back = el(doc, 'div', 'face back');
      front.append(writable(doc, 'text', r.front, s => change<Character>(w, rid, c => ({ ...c, front: s }))));
      back.append(el(doc, 'div', 'damage'), el(doc, 'div', 'notes-hd', 'Notes'),
        ruled(doc, writable(doc, 'notes', r.back.notes, s => change<Character>(w, rid, c => ({ ...c, back: { ...c.back, notes: s } })))));
      flipper.append(front, back);
      // R22: it flips at the corner.
      const flip = el(doc, 'button', 'flip');
      flip.setAttribute('aria-label', 'Flip the card');
      gesture(flip, { click: () => change<Character>(w, rid, c => ({ ...c, flipped: !c.flipped })) });
      e.append(flipper, flip, tray(e));
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
    case 'tornroll': break;
  }
  return e;
}

function update(e: HTMLElement, r: PieceRecord, w: PieceWith): void {
  switch (r.kind) {
    case 'character': {
      if (e.classList.contains('flipped') !== r.flipped) turn(e, r.flipped);
      e.classList.toggle('secret', !canSee(w.viewer, r));
      const front = e.querySelector<HTMLElement>('.front > .text')!;
      rewrite(front, r.front);
      frontGlyphs(front, r, w);
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
      box.append(col);
    }
  }
  const order = frontOrder(DAMAGE.find(d => opened.has(`${c.oid}:${d}`)) ?? null);
  for (const col of box.children as unknown as HTMLElement[]) {
    const d = col.dataset.damage as Damage, slots = c.back.damage[d], room = columnRoom(c, d), absorb = room?.absorb ?? 0;
    const empty = !ROWS.some(r => filled(slots[r])) && !absorb;
    col.classList.toggle('empty', empty);
    col.classList.toggle('open', opened.has(`${c.oid}:${d}`));
    col.style.order = String(order.indexOf(d));
    col.querySelector('.absorb')!.textContent = absorb ? `(absorb ${absorb})` : '';
    for (const line of col.querySelectorAll<HTMLElement>('.slotline')) {
      const row = line.dataset.row as RowName, s = slots[row];
      const name = line.querySelector<HTMLElement>('.name')!;
      if (doc.activeElement !== name && name.textContent !== s.name) name.textContent = s.name;
      const spent = s.spent.reduce((a, b) => a + b, 0);
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
      [...boxes.children].forEach((b, k) => b.classList.toggle('on', !!s.boxes[k]));
    }
  }
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

/** Glyphs before the front's `<res>` and `<mot>` marks (R258); left alone while the front is being written in. */
function frontGlyphs(text: HTMLElement, c: Character, w: PieceWith): void {
  const doc = text.ownerDocument;
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const g of text.querySelectorAll('.glyph')) g.remove();
  for (const span of text.querySelectorAll<HTMLElement>('span.res, span.mot')) {
    const name = influence(span.textContent ?? '')?.name;
    if (name) span.before(glyph(doc, `${c.oid}:${name}`, w));
  }
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
