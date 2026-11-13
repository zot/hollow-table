// CRC: crc-Bar.md | R9, R18, R19, R20, R287, R304, R305
// The bar along the top: the wordmark and build stamp, the supplies, the chips, and room for the
// people and "You are"; the register, the Ledger and Boot Hill append themselves at its right end.

import type { Sign } from '../model/records.ts';
import { chipFace } from './pool.ts';

export type Supply = 'character' | 'sticky' | 'text' | 'howto' | { sign: Sign; points: number };

export type BarWith = {
  /** The version (a release's tag, or "dev") and the date (a release's day, the test rig's publish time, or none). */
  version: string;
  date: string;
  /** A supply pressed: made and taken into the hand at once (R287). */
  take: (what: Supply, down: PointerEvent) => void;
  /** Images picked from the image supply's file picker. */
  images: (files: File[]) => void;
};

const PAPER: [Supply, string, string, string][] = [
  ['character', 'supply card', 'character', 'A new character: card and pool'],
  ['sticky', 'supply note', 'note', 'Sticky note'],
  ['text', 'supply aa', 'Aa', 'Write on the table'],
  ['howto', 'supply howto', 'how to play', 'The "How to play the table" card'],
];

export class BarView {
  /** Where the people's tags go (Presence). */
  readonly folks: HTMLElement;
  /** Where the GM's "You are" goes. */
  readonly youAre: HTMLElement;

  constructor(bar: HTMLElement, w: BarWith) {
    const doc = bar.ownerDocument, el = (tag: string, cls: string, text = '', title = '') => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    // R304, R305: the wordmark, the version under it and the date under that, the bar's one
    // selectable text.
    const mark = el('div', 'wordmark', 'Hollow');
    mark.append(el('span', 'stamp version', w.version, 'Which version this is: a release\'s tag, or dev'));
    if (w.date) mark.append(el('span', 'stamp date', w.date, 'When it was released (on the test rig, when it was published)'));
    const take = (e: HTMLElement, what: Supply) => e.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      w.take(what, ev);
    });
    const papers = PAPER.map(([what, cls, text, title]) => { const e = el('div', cls, text, title); take(e, what); return e; });
    // R287: the image supply opens a file picker.
    const image = el('div', 'supply image', 'image', 'Add an image'), file = doc.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.multiple = true;
    file.hidden = true;
    file.addEventListener('change', () => { w.images([...(file.files ?? [])]); file.value = ''; });
    image.addEventListener('click', () => file.click());
    // R18, R304: chips 2, 4, 6 and +1 of each colour, in two rows.
    const chips = el('div', 'supplychips', '', 'Influence chips: drag one out');
    for (const sign of [1, -1] as const) for (const points of [2, 4, 6, 1]) {
      const c = el('div', `supply chip ${sign > 0 ? 'pos' : 'neg'}${points === 1 ? ' one' : ''}`, chipFace({ sign, points }));
      take(c, { sign, points });
      chips.append(c);
    }
    this.folks = el('div', 'folks');
    this.youAre = el('div', 'youare');
    bar.replaceChildren(mark, ...papers, image, file, chips, this.folks, this.youAre);
  }
}
