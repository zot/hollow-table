// CRC: crc-Claims.md | Seq: seq-join.md#1.9, seq-join.md#1.10 | R166, R167, R168, R169, R467, R468, R472, R507, R528
// On the GM's page: which browser holds which name. The first browser to claim a name holds it; a
// page claiming a name another browser holds is nobody until the GM hands the name over. The claims
// live in the book, saved with the game; the book is never sent, but who holds each name goes to every
// page as `claims` (Authority, R446).

import { GM, OPEN, isPaper, type Book, type Desk, type OldDesk, type PieceRecord, type Rec, type Yards } from '../model/records.ts';
import { desksOf } from '../rules/drawers.ts';
import type { Game, Writer } from '../model/game.ts';
import { ID } from './identity.ts';

const book = (game: Game) => game.get('book') as Book;

// R472: a claim held by an id of the old shape was made before Trystero proved ids; it goes, and the
// player claims the name again on arriving.
/** The change that drops claims made under the old ids, or null when there are none. */
export function oldClaims(game: Game): ((w: Writer) => void) | null {
  const b = book(game), claims = Object.fromEntries(Object.entries(b.claims).filter(([, id]) => ID.test(id)));
  return Object.keys(claims).length === Object.keys(b.claims).length ? null : w => w.put('book', { ...b, claims });
}

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

const fold = (s: string) => s.trim().toLowerCase();

// R467: a name in use is refused, compared without case; the renamer's own name in another case is theirs.
/** Why `to` can't be `from`'s new name, or null when it can. */
export function renameWhy(game: Game, from: string, to: string): string | null {
  const t = to.trim();
  if (!t) return "A name can't be blank.";
  if (t.length > 32) return 'A name is at most 32 characters.';
  if (fold(t) === fold(GM) || fold(t) === fold(OPEN)) return `“${t}” is a word the table keeps for itself.`;
  for (const n of Object.keys(book(game).claims)) if (n !== from && fold(n) === fold(t)) return `${n} is already at this table.`;
  for (const [, r] of game.all()) {
    if ('kind' in r && r.kind === 'character' && r.owner !== from && fold(r.owner) === fold(t)) return `${r.owner} already owns ${r.name}.`;
  }
  return null;
}

// R468: everything a player holds follows their new name: the claim, the characters they own and the
// chips they put, buried ones in Boot Hill too; printed receipts keep the old name.
/** The change that renames `from` to `to`. */
export function renamed(game: Game, from: string, to: string): (w: Writer) => void {
  const t = to.trim(), b = book(game), claims = { ...b.claims }, held = claims[from];
  delete claims[from];
  if (held !== undefined) claims[t] = held;
  const follow = (r: Rec): Rec => !('kind' in r) ? r
    : r.kind === 'character' && r.owner === from ? { ...r, owner: t }
    : r.kind === 'chip' && r.by === from ? { ...r, by: t }
    // R507: paper they made, and paper sent to them, follow too.
    : isPaper(r) && (r.by === from || r.to?.includes(from))
      ? { ...r, ...(r.by === from && { by: t }), ...(r.to && { to: r.to.map(n => (n === from ? t : n)) }) } : r;
  return w => {
    w.put('book', { ...b, claims });
    for (const [rid, r] of game.all()) {
      if (rid === 'yards') {
        const y = r as Yards;
        w.put(rid, { ...y, yards: y.yards.map(g => ({ ...g, items: g.items.map(i => ({ ...i, records: i.records.map(x => follow(x) as typeof x) })) })) });
      } else if (rid === 'desk') {
        // R528, R550, R557: what the GM filed, in every desk, follows too.
        const d = desksOf(r as Desk | OldDesk);
        // R557: and what lies on a desktop not set out.
        const each = (rs: PieceRecord[]) => rs.map(x => follow(x) as typeof x);
        w.put(rid, { ...d, desks: d.desks.map(one => ({ ...one, items: one.items.map(e => ({ ...e, records: each(e.records) })), ...(one.top && { top: each(one.top) }) })) });
      } else {
        const f = follow(r);
        if (f !== r) w.put(rid, f);
      }
    }
  };
}
