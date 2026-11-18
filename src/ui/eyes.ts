// CRC: crc-PieceView.md | R391, R392, R393, R388, R398
// The GM's eye on an NPC's card: while it is open the card is in its Infer state, and its revealed
// entries are a draft on this page alone; shutting the eye writes them to the card. Never saved or sent.

import type { Character, Oid } from '../model/records.ts';
import { ridOf } from '../model/records.ts';
import { clues, entries, type InferCategory } from '../rules/readmarks.ts';
import type { Game } from '../model/game.ts';

export type Category = InferCategory;

// R393: the dropdown's categories; Skills take in Fields, as the book's Skills do.
export const CATEGORIES: { key: Category; word: string }[] = [
  { key: 'skills', word: 'Skills' }, { key: 'resources', word: 'Resources' },
  { key: 'motivations', word: 'Motivations' }, { key: 'items', word: 'Items' },
];

// R391, R398: what the eye can reveal: the front's entries and the Info cards' clues, by key.
const revealable = (c: Character) => [entries(c.front), ...(c.info ?? []).map(clues)].flat().map(e => e.key);

/** The character with exactly these entries revealed (R391, by key), `shown` absent when there are none. */
export function withShown(c: Character, keys: Iterable<string>): Character {
  const here = new Set(revealable(c)), shown = [...new Set(keys)].filter(k => here.has(k));
  const { shown: _, ...rest } = c;
  return shown.length ? { ...rest, shown } : rest;
}

type Open = { draft: Set<string>; cat: Category | null };

// R392: the open eyes, this page's own; a reload shuts them, the draft lost.
export class Eyes {
  #open = new Map<Oid, Open>();
  #game: Game;
  #changed: (oid: Oid) => void;

  constructor(game: Game, changed: (oid: Oid) => void) {
    this.#game = game;
    this.#changed = changed;
  }

  /** R388: whether any eye is open. */
  any(): boolean { return this.#open.size > 0; }

  /** The draft of an open card's revealed entries, by key; undefined when its eye is shut. */
  draft(oid: Oid): ReadonlySet<string> | undefined { return this.#open.get(oid)?.draft; }

  /** The category washed on an open card, if one was picked. */
  cat(oid: Oid): Category | null { return this.#open.get(oid)?.cat ?? null; }

  /** Opens a card's eye, its draft begun from what is shown; a category washes its unrevealed lines (R393). */
  open(oid: Oid, cat: Category | null = null): void {
    const was = this.#open.get(oid), c = this.#card(oid);
    if (!c) return;
    this.#open.set(oid, { draft: was?.draft ?? new Set(c.shown ?? []), cat });
    this.#changed(oid);
  }

  /** In the Infer state, a click on an entry (by key) reveals it or hides it again. */
  toggle(oid: Oid, key: string): void {
    const o = this.#open.get(oid), c = this.#card(oid);
    if (!o || !c || !revealable(c).includes(key)) return;
    if (!o.draft.delete(key)) o.draft.add(key);
    this.#changed(oid);
  }

  /** Shuts the eye, writing the draft to the card when it changed what is shown. */
  shut(oid: Oid): void {
    const o = this.#open.get(oid), c = this.#card(oid);
    this.#open.delete(oid);
    if (o && c) {
      const next = withShown(c, o.draft);
      if (JSON.stringify(next.shown ?? []) !== JSON.stringify(c.shown ?? [])) this.#game.change(w => w.put(ridOf(oid), next));
    }
    this.#changed(oid);
  }

  /** The eye's click: open it, or shut it. */
  flip(oid: Oid): void { if (this.#open.has(oid)) this.shut(oid); else this.open(oid); }

  #card(oid: Oid): Character | undefined {
    const c = this.#game.get(ridOf(oid));
    return c && 'kind' in c && c.kind === 'character' ? c : undefined;
  }
}
