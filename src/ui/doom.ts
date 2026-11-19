// CRC: crc-BootHillView.md | R125, R457
// Arming something to delete forever, the one thing that can't be undone: the first shift-click (or
// long press) turns it red and says so, reverting after DOOM_MS; a second within that time deletes it.
// Boot Hill's burials and graveyards use it, and the Ledger's games and checkpoints.

/** How long a first shift-click stays armed (R125). */
export const DOOM_MS = 3000;

export class Doom {
  #armed: { el: HTMLElement; undo: () => void; t: ReturnType<typeof setTimeout> } | null = null;

  /** What's armed now, if anything. */
  get armed(): HTMLElement | null { return this.#armed?.el ?? null; }

  /** Forgets what's armed without putting it back (it's about to be drawn again). */
  drop(): void {
    if (!this.#armed) return;
    clearTimeout(this.#armed.t);
    this.#armed = null;
  }

  /** Arms `el`, saying `says` on it; if it's armed already, puts it back and calls `destroy`. */
  arm(el: HTMLElement, says: string, destroy: () => void): void {
    if (this.#armed) {
      const same = this.#armed.el === el;
      this.#armed.undo();
      this.drop();
      if (same) { destroy(); return; }
    }
    const input = el instanceof HTMLInputElement, was = input ? el.value : [...el.childNodes];
    el.classList.add('doom');
    if (input) { el.value = says; el.readOnly = true; } else el.textContent = says;
    const undo = () => {
      el.classList.remove('doom');
      if (input) { el.value = was as string; el.readOnly = false; } else el.replaceChildren(...was as Node[]);
    };
    this.#armed = { el, undo, t: setTimeout(() => { undo(); this.#armed = null; }, DOOM_MS) };
  }
}
