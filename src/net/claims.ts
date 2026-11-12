// CRC: crc-Claims.md | Seq: seq-join.md#1.9, seq-join.md#1.10 | R166, R167, R168, R169
// On the GM's page: which browser holds which name. The first browser to claim a name holds it; a
// page claiming a name another browser holds is nobody until the GM hands the name over. The claims
// live in the book, saved with the game and never sent.

import { GM, type Book } from '../model/records.ts';
import type { Game } from '../model/game.ts';

const book = (game: Game) => game.get('book') as Book;

// R166, R167: first come holds it; "GM" can't be claimed.
/** The name this browser plays as: its claim, made now if the name is free; null if it is nobody. */
export function whoIs(game: Game, name: string, browser: string): string | null {
  if (!name || name === GM) return null;
  const b = book(game), held = b.claims[name];
  if (held === undefined) {
    game.change(w => w.put('book', { ...b, claims: { ...b.claims, [name]: browser } }));
    return name;
  }
  return held === browser ? name : null;
}

// R169: the GM hands the name over; secrets follow the new holder.
export function handOver(game: Game, name: string, browser: string): void {
  const b = book(game);
  game.change(w => w.put('book', { ...b, claims: { ...b.claims, [name]: browser } }));
}

// R168: why a page is nobody, for its "not yours" chip.
export function why(name: string): string {
  return `${name} is played from another browser, so the GM's page shows you only what anyone sees and doesn't take your changes. The GM can hand ${name} to you by clicking your name in their strip.`;
}
