// CRC: crc-BootHillView.md | R118, R120, R121, R122, R123, R124, R125, R289, R295
// Boot Hill at the bar's right end: the gravestone with its badge, and the graveyard list under it.
// The rules are Yards' (pure); this draws them, digs up at the press, and arms deleting forever.

import type { Game } from '../model/game.ts';
import { ridOf, type PieceRecord, type Yards } from '../model/records.ts';
import { empty, exhume, forget, forgetAll, next, prev, raised, rename } from '../rules/yards.ts';
import { gesture, type PointerLike } from './gesture.ts';

/** How long a first shift-click stays armed (R125). */
export const DOOM_MS = 3000;

export type BootHillWith = {
  game: Game;
  /** The graveyard browsed and whether the list is open, kept in the Seat (R127). */
  cur: () => number; setCur: (cur: number) => void;
  open: () => boolean; setOpen: (open: boolean) => void;
  toWorld: (clientX: number, clientY: number) => { x: number; y: number };
  /** The height a dug-up piece lands at: on top of everything. */
  top: () => number;
  /** Carries a dug-up piece from the press (a character by its pool). */
  carry: (lead: PieceRecord, down: PointerLike, move: PointerLike) => void;
};

export class BootHillView {
  #w: BootHillWith;
  #stone: HTMLButtonElement;
  #badge: HTMLElement;
  #panel: HTMLElement;
  #name: HTMLInputElement;
  #prev: HTMLButtonElement;
  #items: HTMLElement;
  #doomed: { el: HTMLElement; undo: () => void; t: ReturnType<typeof setTimeout> } | null = null;

  constructor(bar: HTMLElement, root: HTMLElement, w: BootHillWith) {
    this.#w = w;
    const doc = bar.ownerDocument;
    this.#stone = doc.createElement('button');
    this.#stone.id = 'boothill';
    this.#stone.title = "Boot Hill: everything put away. Click to see what's buried here.";
    const stone = doc.createElement('span');
    stone.className = 'stone';
    stone.append('Boot', doc.createElement('br'), 'Hill');
    this.#badge = doc.createElement('span');
    this.#badge.className = 'n';
    this.#stone.append(stone, this.#badge);
    bar.append(this.#stone);

    // R121: the header (‹, the name, ›) stays put while the list scrolls.
    this.#panel = doc.createElement('div');
    this.#panel.id = 'graves';
    const nav = doc.createElement('div');
    nav.className = 'yard';
    this.#prev = doc.createElement('button');
    this.#prev.textContent = '‹';
    this.#prev.setAttribute('aria-label', 'The graveyard before');
    const nextB = doc.createElement('button');
    nextB.textContent = '›';
    nextB.setAttribute('aria-label', 'The next graveyard, or a new one');
    this.#name = doc.createElement('input');
    this.#name.className = 'yname';
    this.#name.spellcheck = false;
    this.#name.placeholder = 'Unnamed graveyard';
    this.#name.setAttribute('aria-label', 'Graveyard name');
    this.#name.title = 'Rename this graveyard. Shift-click twice to delete everything in it.';
    nav.append(this.#prev, this.#name, nextB);
    this.#items = doc.createElement('div');
    this.#items.className = 'items';
    this.#panel.append(nav, this.#items);
    root.append(this.#panel);

    const browse = (f: (y: Yards, cur: number) => { yards: Yards; cur: number }) => {
      const b = f(this.#yards(), this.#cur());
      this.#w.game.change(x => x.put('yards', b.yards));
      this.#w.setCur(b.cur);
      this.render();
    };
    gesture(this.#stone, { click: () => { this.#w.setOpen(!this.#w.open()); this.render(); } });
    gesture(this.#prev, { click: () => browse(prev) });
    gesture(nextB, { click: () => browse(next) });
    // R124: typing names the graveyard; leaving the name erased lets an empty one go.
    this.#name.addEventListener('input', () => {
      const y = this.#yards(), cur = this.#cur(), n = this.#name.value;
      this.#w.game.change(x => x.put('yards', { yards: y.yards.map((g, i) => i === cur ? { ...g, name: n, named: n.trim() !== '' } : g) }));
    });
    this.#name.addEventListener('change', () => browse((y, cur) => rename(y, cur, this.#name.value)));
    // R125: two shift-clicks on the name delete everything in this graveyard.
    gesture(this.#name, { shift: e => {
      (e as Event).preventDefault?.();
      if (this.#yards().yards[this.#cur()]?.items.length) this.#doom(this.#name, 'Delete everything here? Shift-click again', () => browse(forgetAll));
    } });
    // R289: a press anywhere else closes the list.
    doc.addEventListener('pointerdown', e => {
      if (!this.#w.open() || (e.target as HTMLElement).closest?.('#graves, #boothill')) return;
      this.#w.setOpen(false);
      this.render();
    }, true);
    w.game.listen(rids => { if (rids.has('yards')) this.render(); });
    this.render();
  }

  #yards(): Yards { return (this.#w.game.get('yards') as Yards | undefined) ?? empty(); }
  #cur(): number { return Math.min(this.#w.cur(), this.#yards().yards.length - 1); }

  // R289: the badge counts every graveyard; the stone fades when nothing is buried.
  render(): void {
    const y = this.#yards(), cur = this.#cur(), g = y.yards[cur]!, doc = this.#panel.ownerDocument;
    const total = y.yards.reduce((n, x) => n + x.items.length, 0);
    this.#badge.textContent = total ? String(total) : '';
    this.#stone.classList.toggle('empty', !total);
    this.#panel.hidden = !this.#w.open();
    this.#prev.disabled = cur === 0;
    if (doc.activeElement !== this.#name && this.#doomed?.el !== this.#name) this.#name.value = g.name;
    if (this.#doomed && this.#doomed.el !== this.#name) { clearTimeout(this.#doomed.t); this.#doomed = null; }
    // R289: oldest first; an empty graveyard says so.
    if (!g.items.length) {
      const p = doc.createElement('p');
      p.textContent = 'Nothing is buried here.';
      this.#items.replaceChildren(p);
      return;
    }
    this.#items.replaceChildren(...g.items.map((burial, item) => {
      const b = doc.createElement('button');
      b.textContent = burial.name;
      b.title = 'Drag this back onto the table. Shift-click or long-press twice to delete it forever.';
      // R120, R295: dragged a few pixels it comes up under the pointer and the list closes; a
      // shift-click or a long press arms deleting it forever (R125).
      gesture(b, {
        drag: (_down, move) => this.#digUp(item, move),
        shift: () => this.#doom(b, 'Delete forever? Shift-click again', () => {
          const f = forget(this.#yards(), this.#cur(), { yard: this.#cur(), item });
          this.#w.game.change(x => x.put('yards', f.yards));
          this.#w.setCur(f.cur);
          this.render();
        }),
      });
      return b;
    }));
  }

  #digUp(item: number, e: PointerLike): void {
    const cur = this.#cur(), dug = exhume(this.#yards(), cur, { yard: cur, item });
    const recs = raised(dug.records, this.#w.toWorld(e.clientX, e.clientY), this.#w.top());
    if (!recs.length) return;
    this.#w.game.change(x => {
      x.put('yards', dug.yards);
      for (const r of recs) x.put(ridOf(r.oid), r);
    });
    this.#w.setCur(dug.cur);
    this.#w.setOpen(false);
    this.render();
    // It came up under the pointer, so it is carried from here, not from the press in the list.
    this.#w.carry(recs[0]!, e, e);
  }

  // R125: the first shift-click arms it red and says so; a second within 3 s deletes; else it reverts.
  #doom(el: HTMLElement, says: string, destroy: () => void): void {
    if (this.#doomed?.el === el) {
      clearTimeout(this.#doomed.t);
      this.#doomed.undo();
      this.#doomed = null;
      destroy();
      return;
    }
    if (this.#doomed) { this.#doomed.undo(); clearTimeout(this.#doomed.t); }
    const input = el instanceof HTMLInputElement, was = input ? el.value : el.textContent ?? '';
    el.classList.add('doom');
    if (input) { el.value = says; el.readOnly = true; } else el.textContent = says;
    const undo = () => { el.classList.remove('doom'); if (input) { el.value = was; el.readOnly = false; } else el.textContent = was; };
    this.#doomed = { el, undo, t: setTimeout(() => { undo(); this.#doomed = null; }, DOOM_MS) };
  }
}
