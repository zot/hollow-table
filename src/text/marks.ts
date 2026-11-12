// CRC: crc-MarkedText.md | R204, R208
// Handwriting with marks: a closed, attribute-free markup naming what a run of text is in the game.
// Only the five bare tags are marks; every other byte is text and stays exactly where it was, so
// serialize(parse(s)) === s for every s.

import type { Marked } from '../model/records.ts';

// R209: `<bias>`, `<aff>` and `<inj>` are not marks; they are how a Damage slot's entry is drawn.
export const MARKS = ['act', 'res', 'inf', 'def', 'head'] as const;
export type MarkName = (typeof MARKS)[number];

export type MarkRun = { mark: MarkName; text: string };
export type Run = string | MarkRun;
export type Line = Run[];

/** A mark's address: its line and its run index within the line. */
export type At = { line: number; run: number };
export type Found = At & MarkRun;

const TAG = new RegExp(`<(${MARKS.join('|')})>`, 'g');

function parseLine(src: string): Line {
  const runs: Line = [];
  let from = 0;
  TAG.lastIndex = 0;
  for (let m = TAG.exec(src); m; m = TAG.exec(src)) {
    const mark = m[1] as MarkName, close = `</${mark}>`;
    const start = m.index + m[0].length, end = src.indexOf(close, start);
    if (end < 0) continue; // unclosed: text
    if (m.index > from) runs.push(src.slice(from, m.index));
    runs.push({ mark, text: src.slice(start, end) });
    from = end + close.length;
    TAG.lastIndex = from;
  }
  if (from < src.length || runs.length === 0) runs.push(src.slice(from));
  return runs;
}

/** Lines of runs. A known tag with no attributes, closed on its line, is a mark; anything else is text. */
export function parse(source: Marked): Line[] {
  return source.split('\n').map(parseLine);
}

const runSource = (r: Run): string => typeof r === 'string' ? r : `<${r.mark}>${r.text}</${r.mark}>`;

/** The source string the lines came from. */
export function serialize(lines: Line[]): Marked {
  return lines.map(l => l.map(runSource).join('')).join('\n');
}

/** A line's plain text, marks included as their words. */
export function plain(line: Line): string {
  return line.map(r => typeof r === 'string' ? r : r.text).join('');
}

/** Every mark (of one kind, if given), with its line and run index. */
export function marks(lines: Line[], tag?: MarkName): Found[] {
  const out: Found[] = [];
  lines.forEach((l, line) => l.forEach((r, run) => {
    if (typeof r !== 'string' && (!tag || r.mark === tag)) out.push({ line, run, mark: r.mark, text: r.text });
  }));
  return out;
}

// Text may not hold a closing tag for its own mark, or serialization would end the mark early.
const fits = (mark: MarkName, text: string) => !text.includes('\n') && !text.includes(`</${mark}>`);

function replaceLine(lines: Line[], i: number, line: Line): Line[] {
  return lines.map((l, j) => j === i ? line : l);
}

/** Replace one mark's text (a spent Resource's Level), nothing else. Unchanged if it can't. */
export function setMark(lines: Line[], at: At, text: string): Line[] {
  const r = lines[at.line]?.[at.run];
  if (!r || typeof r === 'string' || !fits(r.mark, text)) return lines;
  return replaceLine(lines, at.line, lines[at.line]!.map((x, k) => k === at.run ? { mark: r.mark, text } : x));
}

/** A range of characters within one text run of a line. */
export type Range = { line: number; run: number; start: number; end: number };

// R206: a pen marks text; a pen on marked text unmarks it.
/** The highlighter pen: mark part of a text run. Unchanged if the range isn't inside one text run. */
export function mark(lines: Line[], range: Range, tag: MarkName): Line[] {
  const r = lines[range.line]?.[range.run];
  if (typeof r !== 'string' || range.start < 0 || range.end > r.length || range.start >= range.end) return lines;
  const text = r.slice(range.start, range.end);
  if (!fits(tag, text)) return lines;
  const parts: Run[] = [r.slice(0, range.start), { mark: tag, text }, r.slice(range.end)].filter(x => x !== '');
  const line = lines[range.line]!;
  return replaceLine(lines, range.line, [...line.slice(0, range.run), ...parts, ...line.slice(range.run + 1)]);
}

/** A pen on marked text: the mark becomes plain text, joined with its neighbours. */
export function unmark(lines: Line[], at: At): Line[] {
  const line = lines[at.line], r = line?.[at.run];
  if (!line || !r || typeof r === 'string') return lines;
  const out: Line = [];
  line.forEach((x, k) => {
    const run = k === at.run ? r.text : x, last = out[out.length - 1];
    if (typeof run === 'string' && typeof last === 'string') out[out.length - 1] = last + run;
    else out.push(run);
  });
  return replaceLine(lines, at.line, out);
}

/** Builds a slim DOM: a div per line and a span per mark, with textContent only. */
export function render(lines: Line[], el: HTMLElement): void {
  const doc = el.ownerDocument;
  el.replaceChildren(...lines.map(l => {
    const div = doc.createElement('div');
    for (const r of l) {
      if (typeof r === 'string') { div.append(r); continue; }
      const span = doc.createElement('span');
      span.className = r.mark;
      span.textContent = r.text;
      div.append(span);
    }
    return div;
  }));
}

const isMark = (s: string): s is MarkName => (MARKS as readonly string[]).includes(s);

/**
 * Edited DOM back to lines: a span whose class is a mark becomes that mark; every other node gives
 * only its text, so pasted markup is reduced to its words. Each child div (or `br`) starts a line.
 */
export function read(el: HTMLElement): Line[] {
  const lines: Line[] = [[]];
  const push = (r: Run) => {
    const line = lines[lines.length - 1]!, last = line[line.length - 1];
    if (typeof r === 'string' && typeof last === 'string') line[line.length - 1] = last + r;
    else if (r !== '') line.push(r);
  };
  const walk = (n: Node, top: boolean) => {
    Array.from(n.childNodes).forEach((c, k) => {
      if (c.nodeType === 3) return push(c.textContent ?? '');
      if (c.nodeType !== 1) return;
      const e = c as HTMLElement, cls = e.className;
      if (e.tagName === 'BR') return void lines.push([]);
      if (e.tagName === 'SPAN' && isMark(cls) && fits(cls, e.textContent ?? '')) return push({ mark: cls, text: e.textContent ?? '' });
      if (top && k > 0 && e.tagName === 'DIV') lines.push([]);
      walk(e, false);
    });
  };
  walk(el, true);
  return lines.map(l => l.length ? l : ['']);
}
