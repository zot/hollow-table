// CRC: crc-PieceView.md | R385, R386, R387, R388
// The GM's eye on an NPC's card: while it is open the card is in its Infer state, and its revealed
// lines are a draft on this page alone; shutting the eye writes them to the card. Never saved or sent.

import type { Character, Oid } from '../model/records.ts';
import { ridOf } from '../model/records.ts';
import { parse, type MarkName } from '../text/marks.ts';
import type { Game } from '../model/game.ts';

export type Category = 'skills' | 'resources' | 'motivations';

// R387: Skills take in Fields, as the book's Skills do.
export const CATEGORIES: { key: Category; word: string; marks: readonly MarkName[] }[] = [
  { key: 'skills', word: 'Skills', marks: ['fld', 'skl'] },
  { key: 'resources', word: 'Resources', marks: ['res'] },
  { key: 'motivations', word: 'Motivations', marks: ['mot'] },
];

// R385: a line can be inferred when it holds a Skill, Field, Resource or Motivation.
/** The categories a line of the front falls in, by its marks; none when nothing can be inferred from it. */
export function categories(line: string): Category[] {
  const marks = new Set(parse(line)[0]!.flatMap(r => (typeof r === 'string' ? [] : [r.mark])));
  return CATEGORIES.filter(c => c.marks.some(m => marks.has(m))).map(c => c.key);
}

/** The character with exactly these lines revealed, `shown` absent when there are none. */
export function withShown(c: Character, lines: Iterable<string>): Character {
  const here = new Set(c.front.split('\n')), shown = [...new Set(lines)].filter(l => here.has(l));
  const { shown: _, ...rest } = c;
  return shown.length ? { ...rest, shown } : rest;
}

type Open = { draft: Set<string>; cat: Category | null };

// R386: the open eyes, this page's own; a reload shuts them, the draft lost.
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

  /** The draft of an open card's revealed lines; undefined when its eye is shut. */
  draft(oid: Oid): ReadonlySet<string> | undefined { return this.#open.get(oid)?.draft; }

  /** The category washed on an open card, if one was picked. */
  cat(oid: Oid): Category | null { return this.#open.get(oid)?.cat ?? null; }

  /** Opens a card's eye, its draft begun from what is shown; a category washes its unrevealed lines (R387). */
  open(oid: Oid, cat: Category | null = null): void {
    const was = this.#open.get(oid), c = this.#card(oid);
    if (!c) return;
    this.#open.set(oid, { draft: was?.draft ?? new Set(c.shown ?? []), cat });
    this.#changed(oid);
  }

  /** In the Infer state, a click on a line that can be inferred reveals it or hides it again. */
  toggle(oid: Oid, line: string): void {
    const o = this.#open.get(oid);
    if (!o || categories(line).length === 0) return;
    if (!o.draft.delete(line)) o.draft.add(line);
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
