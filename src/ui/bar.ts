// CRC: crc-Bar.md | R590, R19, R20, R305, R347, R591, R510, R517, R518
// The bar along the top: the wordmark and build stamp, the desk with the paper supplies, the chips,
// and room for the people and "You are"; the register, the Ledger and Boot Hill append themselves at
// its right end.

import type { Sign } from '../model/records.ts';
import { DeskView, type At, type DeskWith, type Mode, type Paper } from './desk.ts';
import type { PointerLike } from './gesture.ts';
import { chipFace } from './pool.ts';

export type Supply = Exclude<Paper, 'image'> | { sign: Sign; points: number };

export type BarWith = {
  /** R600: this build's; its page hooks end when it aborts. */
  signal: AbortSignal;
  /** The version (a release's tag, or "dev") and the date (a release's day, the test rig's publish time, or none). */
  version: string;
  date: string;
  /** R518: the GM's desk has the Connection Table's pigeonhole. */
  gm: boolean;
  /** A supply taken: made and carried (R512-R514); a chip is made and lifted at the press. */
  take: (what: Supply, down: PointerLike, move: PointerLike, mode: Mode) => void;
  /** R515: images picked from the image pigeonhole's file picker, landing at `at`. */
  images: (files: File[], at: At | null, carry: boolean) => void;
  /** R526, R527: the desk's drawers, and an entry taken out of them. */
  filed: DeskWith['filed'];
  takeOut: DeskWith['takeOut'];
  cur: DeskWith['cur'];
  setDesks: DeskWith['setDesks'];
  setOut: DeskWith['setOut'];
};

export class BarView {
  /** R347: where the Opposition button and its tray go (TrayView). */
  readonly oppo: HTMLElement;
  /** Where the people's tags go (Presence). */
  readonly folks: HTMLElement;
  /** Where the GM's "You are" goes. */
  readonly youAre: HTMLElement;
  /** R591: the desk, after the wordmark. */
  readonly desk: DeskView;

  // R517: an image the browser won't keep is said on the desk's image pigeonhole until one is added.
  /** Marks the image pigeonhole refused (`label`, and `why` on hover), or plain again with null. */
  refused(r: { label: string; why: string } | null): void { this.desk.refused(r); }

  constructor(bar: HTMLElement, w: BarWith) {
    const doc = bar.ownerDocument, el = (tag: string, cls: string, text = '', title = '') => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    // R305, R510: the wordmark, the version under it and the date under that, the bar's one
    // selectable text.
    const mark = el('div', 'wordmark', 'Hollow');
    mark.append(el('span', 'stamp version', w.version, 'Which version this is: a release\'s tag, or dev'));
    if (w.date) mark.append(el('span', 'stamp date', w.date, 'When it was released (on the test rig, when it was published)'));
    // R591: the desk holds the paper supplies.
    this.desk = new DeskView(doc, { signal: w.signal, gm: w.gm, take: w.take, images: w.images, filed: w.filed, takeOut: w.takeOut, cur: w.cur, setDesks: w.setDesks, setOut: w.setOut });
    // R591, R510: chips 2, 4, 6 and +1 of each color, in two rows, on the bar itself.
    const chips = el('div', 'supplychips', '', 'Influence chips: drag one out');
    for (const sign of [1, -1] as const) for (const points of [2, 4, 6, 1]) {
      const c = el('div', `supply chip ${sign > 0 ? 'pos' : 'neg'}${points === 1 ? ' one' : ''}`, chipFace({ sign, points }));
      c.addEventListener('pointerdown', ev => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        w.take({ sign, points }, ev, ev, 'press');
      });
      chips.append(c);
    }
    this.oppo = el('div', 'oppo');
    this.folks = el('div', 'folks');
    this.youAre = el('div', 'youare');
    bar.replaceChildren(mark, this.desk.el, chips, this.oppo, this.folks, this.youAre);
  }
}
