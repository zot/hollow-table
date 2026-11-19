// CRC: crc-Tape.md | Seq: seq-roll.md#2, seq-take.md#1, seq-take.md#2 | R97, R110, R111, R112, R113, R317, R282, R283, R308, R313, R340, R441
// The paper tape from the register: this page's receipts, never sent (R111). It lies under the
// pieces and rises for a new roll or a press; rolled up it leaves a sliver; dragged, it tears off
// the whole roll as a torn-roll piece. The decisions are pure (retitled, torn, mayChoose).

import type { Game } from '../model/game.ts';
import { ridOf, type Damage, type Oid, type Place, type NameRow, type Receipt, type RowName, type Tape, type TornRoll } from '../model/records.ts';
import { OVERFLOW } from '../rules/absorb.ts';
import type { Viewer } from '../rules/visibility.ts';
import type { PointerLike } from './gesture.ts';
import { receiptEl } from './receipt.ts';

const EMPTY: Tape = { receipts: [] };

// R317: a receipt's title can be edited on this page's tape.
export function retitled(tape: Tape, id: string, title: string): Tape {
  return { receipts: tape.receipts.map(r => r.id === id ? { ...r, title } : r) };
}

// R113: the whole roll comes off as one piece; the next roll starts a fresh tape.
export function torn(tape: Tape, oid: Oid, place: Place): TornRoll {
  return { kind: 'tornroll', oid, place, receipts: tape.receipts };
}

// R308: the target's owner, or the GM, may take an untaken Attack.
export function mayTake(viewer: Viewer, r: Receipt, targetOwner: string | undefined): boolean {
  return !!r.attack && !r.attack.taken && !!viewer && (viewer.gm || targetOwner === viewer.name);
}

// R313: the attacking character's owner (who rolled it), or the GM, names the Slots it left waiting.
export function mayName(viewer: Viewer, r: Receipt): boolean {
  return !!r.attack?.waiting?.length && !!viewer && (viewer.gm || r.by === viewer.name);
}

const ROW_WORDS: Record<RowName, string> = { mild: 'Mild', min: 'Minor', sig: 'Significant', maj: 'Major' };
const KIND_WORDS: Record<Damage, string> = { bias: 'Bias', affliction: 'Affliction', injury: 'Injury' };
/** "Name Devreux's Minor Bias" (R313), or "Name Devreux's Conviction" (R340). */
export function nameWords(target: string, damage: Damage, row: NameRow): string {
  return row === 'lasting' ? `Name ${target}'s ${OVERFLOW[damage]}` : `Name ${target}'s ${ROW_WORDS[row]} ${KIND_WORDS[damage]}`;
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
  /** R308: a character's owner; taking an Attack (its pages open on the target's card). */
  owner: (oid: Oid) => string | undefined;
  take: (r: Receipt) => void;
  /** R441: the GM's page: the Resources a receipt's transfer can take, and making it (Rolls.givable, Rolls.transfer). */
  givable: (id: string) => string[];
  transfer: (id: string, resource: string) => void;
  /** R313: a waiting Slot named (Rolls.name). */
  name: (id: string, damage: Damage, row: NameRow, text: string) => void;
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
    // R317: the title can be edited; the tape keeps it.
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
    // R308: Take N, on the target's owner's tape and the GM's, until it is taken.
    if (mayTake(this.#w.viewer, r, this.#w.owner(r.attack?.target ?? ''))) {
      const take = doc.createElement('button');
      take.className = 'take';
      take.textContent = `Take ${r.attack!.result}`;
      take.title = `${r.attack!.name} takes this Attack: choose which Slots absorb it`;
      take.addEventListener('click', () => this.#w.take(r));
      e.append(take);
    }
    // R441: Transfer, on the GM's tape, opens the NPC's Resources it can take; a pick makes it.
    if (this.#w.viewer?.gm && r.transfer && !r.transfer.done) {
      const t = doc.createElement('button');
      t.className = 'transfer';
      t.textContent = 'Transfer';
      t.title = `Move a Resource from ${r.transfer.name}, up to ${['', 'Min', 'Sig', 'Maj', 'Ext', 'Exq'][r.transfer.sl]}`;
      t.addEventListener('click', () => {
        e.querySelector('.givable')?.remove();
        const list = doc.createElement('div'), names = this.#w.givable(r.id);
        list.className = 'givable';
        if (!names.length) list.textContent = `${r.transfer!.name} has nothing to give at this Level`;
        for (const n of names) {
          const b = doc.createElement('button');
          b.textContent = n;
          b.addEventListener('click', () => { list.remove(); this.#w.transfer(r.id, n); });
          list.append(b);
        }
        e.append(list);
      });
      e.append(t);
    }
    // R313: a line to write each waiting name on, for the attacker's owner and the GM; Enter sends it.
    if (mayName(this.#w.viewer, r)) {
      for (const { damage, row } of r.attack!.waiting!) {
        const label = doc.createElement('label'), input = doc.createElement('input');
        label.className = 'naming';
        label.append(nameWords(r.attack!.name, damage, row), input);
        input.spellcheck = false;
        input.addEventListener('keydown', ev => {
          if (ev.key !== 'Enter' || !input.value.trim()) return;
          this.#w.name(r.id, damage, row, input.value.trim());
          input.disabled = true;
        });
        e.append(label);
      }
    }
    return e;
  }

  // R113, R283: a press on the tape raises it; dragged a few pixels, the whole roll tears off.
  #press(e: PointerEvent): void {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    e.stopPropagation();   // the table doesn't pan under the tape
    this.#el.classList.add('raised');
    // R313: a press on a name's blank writes in it, never tears.
    if (t.closest('.title[contenteditable]') || t.closest('button, .other, .naming, .givable')) return;
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
