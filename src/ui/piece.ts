// CRC: crc-PieceView.md | Seq: seq-save.md#1.4 | R5, R22, R23, R24, R25, R26, R27, R62, R202, R203, R209, R213, R214
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
import { parse, read, render, serialize } from '../text/marks.ts';
import { gesture, type PointerLike } from './gesture.ts';
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
  dragGlyph: (source: string, down: PointerLike, move: PointerLike) => void;
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
  const t = el(doc, 'div', cls);
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
  const e = el(doc, 'div', `obj glide ${CLASS[r.kind] ?? r.kind}`);
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
        writable(doc, 'notes', r.back.notes, s => change<Character>(w, rid, c => ({ ...c, back: { ...c.back, notes: s } }))));
      flipper.append(front, back);
      // R22: it flips at the corner.
      const flip = el(doc, 'button', 'flip');
      flip.setAttribute('aria-label', 'Flip the card');
      gesture(flip, { click: () => change<Character>(w, rid, c => ({ ...c, flipped: !c.flipped })) });
      e.append(flipper, flip);
      break;
    }
    case 'sticky': case 'text':
      e.append(writable(doc, 'text', r.text, s => change<Sticky | Text>(w, rid, c => ({ ...c, text: s }))));
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
      e.classList.toggle('flipped', r.flipped);
      e.classList.toggle('secret', !canSee(w.viewer, r));
      const front = e.querySelector<HTMLElement>('.front > .text')!;
      rewrite(front, r.front);
      frontGlyphs(front, r, w);
      rewrite(e.querySelector('.back > .notes')!, r.back.notes);
      damage(e.querySelector('.damage')!, r, w);
      break;
    }
    case 'sticky': case 'text':
      rewrite(e.querySelector('.text')!, r.text);
      break;
    case 'image': image(e, r, w); break;
    case 'tornroll': tornroll(e, r); break;
    case 'reference': break;
  }
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

// ---- the back: R23, R203, R209, R213, R214 ----

const filled = (s: DamageSlot) => !!s.name || s.boxes.some(b => b);

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
      const absorb = el(doc, 'span', 'absorb');
      absorb.contentEditable = 'true';
      absorb.addEventListener('input', () => {
        const n = Number(absorb.textContent?.replace(/\D/g, '') || 0);
        put(ch => ({ ...ch, back: { ...ch.back, absorb: { ...ch.back.absorb, [d]: Math.min(100, n) } } }));
      });
      hd.append(`${COLUMN[d].name} `, absorb);
      col.append(hd);
      // R203: an empty column opens when reached for.
      gesture(hd, { click: () => { const o = new Set(w.opened()); o.add(`${c.oid}:${d}`); w.setOpened(o); } });
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
  for (const col of box.children as unknown as HTMLElement[]) {
    const d = col.dataset.damage as Damage, slots = c.back.damage[d];
    const empty = !ROWS.some(r => filled(slots[r])) && !c.back.absorb[d];
    col.classList.toggle('empty', empty);
    col.classList.toggle('open', opened.has(`${c.oid}:${d}`));
    const absorb = col.querySelector<HTMLElement>('.absorb')!;
    if (doc.activeElement !== absorb) absorb.textContent = c.back.absorb[d] ? `(absorb ${c.back.absorb[d]})` : '';
    for (const line of col.querySelectorAll<HTMLElement>('.slotline')) {
      const row = line.dataset.row as RowName, s = slots[row];
      const name = line.querySelector<HTMLElement>('.name')!;
      if (doc.activeElement !== name && name.textContent !== s.name) name.textContent = s.name;
      const spent = s.spent.reduce((a, b) => a + b, 0);
      line.querySelector('.spent')!.textContent = spent ? `−${spent}` : '';
      slotGlyphs(line, s, `${c.oid}:${d}/${row}`, w);
      // R213: the boxes in front of the Level word; R24, R62: they toggle, once the slot has a name.
      const boxes = line.querySelector<HTMLElement>('.boxes')!;
      if (boxes.children.length !== s.boxes.length) {
        boxes.replaceChildren(...s.boxes.map((_, k) => {
          const b = el(doc, 'button', 'box');
          b.setAttribute('aria-label', `Slot ${k + 2}`);
          gesture(b, { click: () => put(ch => {
            const cur = ch.back.damage[d][row];
            if (!cur.name) { b.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }], 200); return ch; }
            return slotAt(ch, d, row, { boxes: cur.boxes.map((on, i) => i === k ? !on : on) });
          }) });
          return b;
        }));
      }
      s.boxes.forEach((on, k) => boxes.children[k]!.classList.toggle('on', on));
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
  gesture(g, { drag: (d, m) => w.dragGlyph(source, d, m) });
  return g;
}

/** Glyphs before the front's `<res>` marks; left alone while the front is being written in. */
function frontGlyphs(text: HTMLElement, c: Character, w: PieceWith): void {
  const doc = text.ownerDocument;
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const g of text.querySelectorAll('.glyph')) g.remove();
  for (const span of text.querySelectorAll<HTMLElement>('span.res')) {
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
