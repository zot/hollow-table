// CRC: crc-Tray.md | R347, R348, R376, R350
// The Opposition button in the bar and the brass tray it slides out: the world's Total Influence,
// what a roll aimed at no character is against. Only the GM types it; a player's page never holds it.

import type { Game } from '../model/game.ts';
import type { World } from '../model/records.ts';
import type { Viewer } from '../rules/visibility.ts';

// R347: what the GM typed: a whole number sets the world, a blank clears it, anything else changes nothing.
/** The world a typed value makes, or null when it isn't one. */
export function worldFrom(text: string): World | null {
  const t = text.trim().replace(/^−/, '-');
  if (!t) return { set: false, total: 0 };
  return /^[-+]?\d{1,3}$/.test(t) ? { set: true, total: Number(t) } : null;
}

export type TrayWith = { game: Game; viewer: Viewer };

export class TrayView {
  #w: TrayWith;
  #button: HTMLButtonElement;
  #tray: HTMLElement;
  #value: HTMLElement;
  #open = false;
  #ringed = false;

  constructor(slot: HTMLElement, w: TrayWith) {
    this.#w = w;
    const doc = slot.ownerDocument, gm = !!w.viewer?.gm;
    this.#button = doc.createElement('button');
    this.#button.className = 'oppobtn';
    this.#button.textContent = 'Opposition';
    this.#button.title = 'The world as opposition: click to slide its tray out or back';
    this.#button.addEventListener('click', () => { this.#open = !this.#open; this.render(); });
    this.#tray = doc.createElement('div');
    this.#tray.className = 'oppotray';
    const label = doc.createElement('span');
    label.className = 'who';
    label.textContent = 'The world';
    if (gm) {
      // R347: the GM's field; leaving it (or Enter) writes the world, Escape puts back what was there.
      const field = doc.createElement('input');
      field.inputMode = 'numeric';
      field.className = 'total';
      field.title = "The world's Total Influence: what a roll aimed at open table or this tray is against. Blank: no number.";
      field.addEventListener('change', () => this.#commit(field));
      field.addEventListener('keydown', e => {
        if (e.key === 'Enter') field.blur();
        if (e.key === 'Escape') { this.#show(field); field.blur(); }
      });
      this.#value = field;
    } else {
      this.#value = doc.createElement('span');
      this.#value.className = 'total';
    }
    this.#tray.append(label, this.#value);
    slot.replaceChildren(this.#button, this.#tray);
    w.game.listen(() => this.render());
    this.render();
  }

  // R376, R350: the world's mark: the tray while it is out, else its button.
  /** The element that stands for the world while aiming and aimed. */
  mark(): HTMLElement { return this.#open ? this.#tray : this.#button; }

  /** R350: whether the roll row is aimed at the world; the ring goes on the mark. */
  ring(on: boolean): void { this.#ringed = on; this.#paint(); }

  render(): void {
    this.#tray.hidden = !this.#open;
    this.#button.classList.toggle('open', this.#open);
    if (this.#value instanceof HTMLInputElement) {
      if (this.#value.ownerDocument.activeElement !== this.#value) this.#show(this.#value);
    } else {
      // R348: a player learns only whether the GM has set it.
      const set = !!this.#world()?.set;
      this.#value.textContent = set ? 'set by the GM' : '';
      this.#tray.title = set ? "The GM has set the world's number" : "The GM hasn't given the world a number yet";
    }
    this.#paint();
  }

  #world(): World | undefined { return this.#w.game.get('world') as World | undefined; }

  #show(field: HTMLInputElement): void {
    const w = this.#world();
    field.value = w?.set ? String(w.total) : '';
  }

  #commit(field: HTMLInputElement): void {
    const next = worldFrom(field.value), was = this.#world();
    if (!next) { this.#show(field); return; }
    if (was?.set === next.set && (was.total === next.total || !next.set)) { this.#show(field); return; }
    this.#w.game.change(x => x.put('world', next));
  }

  #paint(): void {
    for (const el of [this.#button, this.#tray]) el.classList.toggle('targeted', this.#ringed && el === this.mark());
  }
}
