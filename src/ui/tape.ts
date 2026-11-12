// CRC: crc-Tape.md | Seq: seq-roll.md#2 | R97, R110, R111, R112, R113, R279, R282, R283
// The paper tape from the register: this page's receipts, never sent (R111). It lies under the
// pieces and rises for a new roll or a press; rolled up it leaves a sliver; dragged, it tears off
// the whole roll as a torn-roll piece. The decisions are pure (retitled, torn, mayChoose).

import type { Game } from '../model/game.ts';
import { ridOf, type Oid, type Place, type Receipt, type Tape, type TornRoll } from '../model/records.ts';
import type { Viewer } from '../rules/visibility.ts';
import type { PointerLike } from './gesture.ts';
import { receiptEl } from './receipt.ts';

const EMPTY: Tape = { receipts: [] };

// R279: a receipt's title can be edited on this page's tape.
export function retitled(tape: Tape, id: string, title: string): Tape {
  return { receipts: tape.receipts.map(r => r.id === id ? { ...r, title } : r) };
}

// R113: the whole roll comes off as one piece; the next roll starts a fresh tape.
export function torn(tape: Tape, oid: Oid, place: Place): TornRoll {
  return { kind: 'tornroll', oid, place, receipts: tape.receipts };
}

// R97: the rolling character's owner, or the GM, may switch a CRIT until it is locked.
export function mayChoose(viewer: Viewer, r: Receipt): boolean {
  return !!r.crit && !r.crit.locked && !!viewer && (viewer.gm || r.by === viewer.name);
}

export type TapeWith = {
  game: Game; viewer: Viewer;
  /** Rolled up or down, kept in the Seat (R112). */
  up: () => boolean;
  setUp: (up: boolean) => void;
  /** A CRIT switched or locked (Rolls.crit). */
  crit: (id: string, choice: 'max' | 'dbl', lock: boolean) => void;
  /** A new oid, screen to table coordinates, and carrying a torn roll off (Drag). */
  mint: () => Oid;
  toWorld: (clientX: number, clientY: number) => { x: number; y: number };
  carry: (rid: string, down: PointerLike, move: PointerLike) => void;
};

/** How far a press moves before it tears (R283). */
const TEAR_PX = 5;

export class TapeView {
  #w: TapeWith;
  #el: HTMLElement;
  #strip: HTMLElement;
  #shown = '';

  constructor(root: HTMLElement, w: TapeWith) {
    this.#w = w;
    const doc = root.ownerDocument;
    this.#el = doc.createElement('div');
    this.#el.id = 'tape';
    this.#strip = doc.createElement('div');
    this.#strip.className = 'strip';
    this.#el.append(this.#strip);
    root.prepend(this.#el);
    // R112: a press raises the tape; pressing anything else lowers it (the paper roll and Roll aside).
    doc.addEventListener('pointerdown', e => {
      const t = e.target as HTMLElement;
      if (!t.closest?.('#tape, #paperroll, .roller .roll')) this.#el.classList.remove('raised');
    }, true);
    this.#strip.addEventListener('pointerdown', e => this.#press(e));
    // The wheel scrolls the tape, never the table under it.
    this.#strip.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    w.game.listen(rids => { if (rids.has('tape')) this.render(); });
    this.render();
  }

  /** The paper roll on the register: up to a sliver, and down again (raised as it comes down). */
  toggleUp(): void {
    const up = !this.#w.up();
    this.#w.setUp(up);
    if (!up) this.#el.classList.add('raised');
    this.render();
  }

  render(): void {
    const tape = (this.#w.game.get('tape') as Tape | undefined) ?? EMPTY, doc = this.#el.ownerDocument;
    this.#el.classList.toggle('empty', !tape.receipts.length);
    this.#el.classList.toggle('up', this.#w.up());
    const key = JSON.stringify(tape.receipts);
    if (key === this.#shown) return;
    const first = !this.#shown, was = first ? undefined : (JSON.parse(this.#shown) as Receipt[])[0]?.id;
    this.#shown = key;
    this.#strip.replaceChildren(...tape.receipts.map(r => this.#receipt(doc, r)));
    // R110, R112, R282: a new receipt prints at the top, slides in, and raises the tape.
    const top = this.#strip.firstElementChild as HTMLElement | null;
    if (!first && top && tape.receipts[0]!.id !== was) {
      top.classList.add('printing');
      this.#el.classList.add('raised');
      this.#strip.scrollTop = 0;
    }
  }

  #receipt(doc: Document, r: Receipt): HTMLElement {
    const e = receiptEl(doc, r), title = e.querySelector<HTMLElement>('.title')!;
    // R279: the title can be edited; the tape keeps it.
    title.contentEditable = 'true';
    title.spellcheck = false;
    title.addEventListener('blur', () => {
      const tape = (this.#w.game.get('tape') as Tape | undefined) ?? EMPTY, text = title.textContent?.trim() ?? '';
      if (text && text !== r.title) this.#w.game.change(w => w.put('tape', retitled(tape, r.id, text)));
    });
    // R97: the owner or the GM switches a CRIT by its other line, and locks the chosen one.
    if (mayChoose(this.#w.viewer, r)) {
      const chosen = r.crit!.chosen, other = chosen === 'max' ? 'dbl' : 'max';
      e.querySelector<HTMLElement>('.other')?.addEventListener('click', () => this.#w.crit(r.id, other, false));
      const lock = doc.createElement('button');
      lock.className = 'lock';
      lock.textContent = 'punch';
      lock.title = 'Lock this result in';
      lock.addEventListener('click', () => this.#w.crit(r.id, chosen, true));
      e.querySelector('.chosen')?.append(lock);
    }
    return e;
  }

  // R113, R283: a press on the tape raises it; dragged a few pixels, the whole roll tears off.
  #press(e: PointerEvent): void {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    e.stopPropagation();   // the table doesn't pan under the tape
    this.#el.classList.add('raised');
    if (t.closest('.title[contenteditable]') || t.closest('button, .other')) return;
    const tape = (this.#w.game.get('tape') as Tape | undefined) ?? EMPTY;
    if (!tape.receipts.length) return;
    e.preventDefault();
    const doc = this.#el.ownerDocument, box = this.#strip.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < TEAR_PX) return;
      stop();
      const oid = this.#w.mint(), at = this.#w.toWorld(box.left, box.top);
      this.#w.game.change(w => {
        w.put(ridOf(oid), torn(tape, oid, { x: Math.round(at.x), y: Math.round(at.y), z: 0, tilt: 0 }));
        w.put('tape', EMPTY);
      });
      this.#el.classList.remove('raised');
      this.#w.carry(ridOf(oid), e, ev);
    };
    const stop = () => { doc.removeEventListener('pointermove', onMove); doc.removeEventListener('pointerup', stop); };
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', stop);
  }
}
