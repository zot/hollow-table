// CRC: crc-PieceView.md | R391, R392, R393, R388, R398, R436
// The GM's eye on an NPC's card: while it is open the card is in its Infer state, and its revealed
// entries are a draft on this page alone; shutting the eye writes them to the card. Never saved or sent.

import type { Character, Oid, Opinion, PieceRecord } from '../model/records.ts';
import { ridOf } from '../model/records.ts';
import { clues, entries, type InferCategory } from '../rules/readmarks.ts';
import { opinionItems, published, recordsOn, revealed, tableOf } from '../rules/connections.ts';
import type { Game } from '../model/game.ts';

export type Category = InferCategory;

// R393: the dropdown's categories; Skills take in Fields, as the book's Skills do.
export const CATEGORIES: { key: Category; word: string }[] = [
  { key: 'skills', word: 'Skills' }, { key: 'resources', word: 'Resources' },
  { key: 'motivations', word: 'Motivations' }, { key: 'items', word: 'Items' }, { key: 'opinions', word: 'Opinions' },
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
    this.#open.set(oid, { draft: was?.draft ?? new Set([...(c.shown ?? []), ...this.#records(c).flatMap(revealed)]), cat });
    this.#changed(oid);
  }

  /** In the Infer state, a click on an entry (by key) reveals it or hides it again. */
  toggle(oid: Oid, key: string): void {
    const o = this.#open.get(oid), c = this.#card(oid);
    if (!o || !c || ![...revealable(c), ...this.#records(c).flatMap(r => opinionItems(r).map(e => e.key))].includes(key)) return;
    if (!o.draft.delete(key)) o.draft.add(key);
    this.#changed(oid);
  }

  /** Shuts the eye, writing the draft to the card when it changed what is shown. */
  shut(oid: Oid): void {
    const o = this.#open.get(oid), c = this.#card(oid);
    this.#open.delete(oid);
    if (o && c) {
      const next = withShown(c, o.draft), recs = this.#shownRecords(c, o.draft);
      const card = JSON.stringify(next.shown ?? []) !== JSON.stringify(c.shown ?? []);
      if (card || recs.length) this.#game.change(w => { if (card) w.put(ridOf(oid), next); for (const r of recs) w.put(ridOf(r.oid), r); });
    }
    this.#changed(oid);
  }

  /** The eye's click: open it, or shut it. */
  flip(oid: Oid): void { if (this.#open.has(oid)) this.shut(oid); else this.open(oid); }

  /** R436: the records under a card, on the GM's page, by the Connection Table. */
  #records(c: Character): Opinion[] {
    const all = this.#game.all().map(([, r]) => r as PieceRecord), t = tableOf(all);
    return t ? recordsOn(all.filter((r): r is Opinion => r.kind === 'opinion'), c, t) : [];
  }

  // R436: each record whose revealed lines the draft changes, with its cards and name as they go out.
  /** The records to write when the eye shuts. */
  #shownRecords(c: Character, draft: ReadonlySet<string>): Opinion[] {
    const all = this.#game.all().map(([, r]) => r as PieceRecord), t = tableOf(all);
    if (!t) return [];
    const chars = all.filter((r): r is Character => r.kind === 'character');
    return this.#records(c).flatMap(rec => {
      const shown = opinionItems(rec).filter(e => draft.has(e.key)).map(e => e.text);
      const now = published(t, chars, shown.length ? { ...rec, shown } : (({ shown: _, ...rest }) => rest)(rec));
      return JSON.stringify(now) === JSON.stringify(rec) ? [] : [now];
    });
  }

  #card(oid: Oid): Character | undefined {
    const c = this.#game.get(ridOf(oid));
    return c && 'kind' in c && c.kind === 'character' ? c : undefined;
  }
}
