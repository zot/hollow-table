// CRC: crc-Pens.md | R206, R207
// The highlighter pens beside a piece while you write on it: one per mark, in place of a formatting
// toolbar. What a pen does is decided on lines (apply, offered); the tray only finds the selection,
// draws, and hands the result back to the writing area's own input.

import { offer } from '../rules/readmarks.ts';
import {
  locate, mark, plain, read, render, unmark, type Line, type MarkName, type Pos,
} from '../text/marks.ts';

export const PENS: readonly { mark: MarkName; word: string }[] = [
  { mark: 'act', word: 'Action' }, { mark: 'res', word: 'Resource' }, { mark: 'inf', word: 'Influence' },
  { mark: 'def', word: 'Defend' }, { mark: 'head', word: 'Heading' },
];

/** Whether a comes no later than b. */
function before(a: Pos, b: Pos): boolean {
  if (a.line !== b.line) return a.line < b.line;
  if (a.run !== b.run) return a.run < b.run;
  return a.offset <= b.offset;
}

// R206: a pen marks the selection; on marked text, any pen unmarks it.
/** What a pen does to lines, given the selection's ends. The same lines when it does nothing. */
export function apply(lines: Line[], a: Pos, b: Pos, tag: MarkName): Line[] {
  const [from, to] = before(a, b) ? [a, b] : [b, a];
  for (const p of [from, to]) {
    const r = lines[p.line]?.[p.run];
    if (r && typeof r !== 'string') return unmark(lines, p);
  }
  const line = lines[from.line] ?? [];
  if (from.line === to.line && from.run === to.run && from.offset === to.offset) {
    // A bare caret at a mark's edge is on the mark: just after it, or just before it.
    const r = line[from.run], prev = line[from.run - 1], next = line[from.run + 1];
    if (from.offset === 0 && prev && typeof prev !== 'string') return unmark(lines, { line: from.line, run: from.run - 1 });
    if (typeof r === 'string' && from.offset === r.length && next && typeof next !== 'string') return unmark(lines, { line: from.line, run: from.run + 1 });
  }
  if (from.line !== to.line || from.run !== to.run) return lines;
  const r = line[from.run];
  if (typeof r !== 'string') return lines;
  if (from.offset !== to.offset) return mark(lines, { line: from.line, run: from.run, start: from.offset, end: to.offset }, tag);
  // A bare caret marks its run, trimmed of the spaces around it.
  const start = r.length - r.trimStart().length, end = r.trimEnd().length;
  return mark(lines, { line: from.line, run: from.run, start, end }, tag);
}

/** The text of the nearest heading mark above a line, or null. */
export function heading(lines: Line[], line: number): string | null {
  for (let i = line - 1; i >= 0; i--) {
    const h = lines[i]!.find(r => typeof r !== 'string' && r.mark === 'head');
    if (h && typeof h !== 'string') return h.text;
  }
  return null;
}

// R207: a plain line fitting a mark's grammar is offered that mark's pen.
/** The mark offered for a line: only a line of plain text, read under its heading. */
export function offered(lines: Line[], line: number): MarkName | null {
  const l = lines[line];
  if (!l || l.some(r => typeof r !== 'string')) return null;
  const text = plain(l).trim();
  return text ? offer(text, heading(lines, line)) : null;
}

/**
 * Where each pen in the row sits, top to bottom, when pen `k` is offered at `at`: the offered pen
 * beside its line, the others in order a `step` apart, stepping past it so none is hidden under it.
 */
export function places(count: number, k: number, at: number, step: number): number[] {
  let y = 0;
  return Array.from({ length: count }, (_, i) => {
    if (i === k) return at;
    if (y + step > at && y < at + step) y = at + step;
    const here = y;
    y += step;
    return here;
  });
}

// ---- the tray: the DOM side ----

/** The selection's two ends in a writing area, or null when the selection isn't inside it. */
function selection(t: HTMLElement): [Pos, Pos] | null {
  const sel = t.ownerDocument.getSelection();
  if (!sel?.anchorNode || !sel.focusNode) return null;
  const a = locate(t, sel.anchorNode, sel.anchorOffset), b = locate(t, sel.focusNode, sel.focusOffset);
  return a && b ? [a, b] : null;
}

/** The caret back at the end of a line, in the writing area. */
function caretAt(t: HTMLElement, line: number): void {
  const doc = t.ownerDocument, div = t.children[line] ?? t.lastElementChild;
  t.focus();
  if (!div) return;
  const range = doc.createRange();
  range.selectNodeContents(div);
  range.collapse(false);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * The five pens beside a piece, for its writing areas (elements with class `writes`). Shown by CSS
 * while one of them holds the cursor or a pen holds focus.
 */
export function tray(piece: HTMLElement): HTMLElement {
  const doc = piece.ownerDocument;
  const box = doc.createElement('div');
  box.className = 'pens';
  let last: HTMLElement | null = null;   // the writing area last written in
  const area = (n: Node | null) => (n?.nodeType === 1 ? n as Element : n?.parentElement)?.closest<HTMLElement>('.writes') ?? null;

  const pens = PENS.map(p => {
    const b = doc.createElement('button');
    b.className = `pen pen-${p.mark}`;
    b.textContent = p.word;
    b.setAttribute('aria-label', `${p.word} pen`);
    b.dataset.mark = p.mark;
    // The pen takes neither the cursor nor the selection, and never carries the piece.
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.addEventListener('pointerdown', ev => ev.stopPropagation());
    b.addEventListener('click', () => use(b, p.mark));
    box.append(b);
    return b;
  });

  function use(b: HTMLElement, tag: MarkName): void {
    const t = last;
    const ends = t && selection(t);
    if (!t || !ends) return shake(b);
    const lines = read(t), out = apply(lines, ends[0], ends[1], tag);
    if (out === lines) return shake(b);
    render(out, t);
    t.dispatchEvent(new Event('input', { bubbles: true }));   // PieceView saves it
    caretAt(t, Math.min(ends[0].line, ends[1].line));
    raise();
  }

  function shake(b: HTMLElement): void {
    b.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }], 200);
  }

  // R207: the offered pen slides out to sit beside the caret's line; the rest make room.
  function raise(): void {
    const t = last, ends = t && t.contains(doc.getSelection()?.anchorNode ?? null) ? selection(t) : null;
    let k = -1, div: Element | undefined;
    if (t && ends) {
      const line = ends[1].line, tag = offered(read(t), line);
      k = pens.findIndex(p => p.dataset.mark === tag);
      if (k >= 0) div = t.children[line];
    }
    pens.forEach((p, i) => p.classList.toggle('offered', i === k && !!div));
    if (!div) { for (const p of pens) p.style.removeProperty('--dy'); return; }
    // Rects are in screen pixels, zoomed with the table; offsets are the pens' places in the row.
    const scale = piece.getBoundingClientRect().height / piece.offsetHeight || 1;
    const at = (div.getBoundingClientRect().top - box.getBoundingClientRect().top) / scale;
    const step = pens[1]!.offsetTop - pens[0]!.offsetTop;
    places(pens.length, k, at, step).forEach((y, i) => pens[i]!.style.setProperty('--dy', `${y - pens[i]!.offsetTop}px`));
  }

  piece.addEventListener('focusin', ev => {
    const t = area(ev.target as Node);
    if (t) { last = t; raise(); }
  });
  piece.addEventListener('input', raise);
  piece.addEventListener('keyup', raise);
  piece.addEventListener('mouseup', raise);
  return box;
}
