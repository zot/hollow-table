// CRC: crc-Yards.md | R120, R121, R122, R123, R124, R125, R290
// Boot Hill's rules, pure: graveyards, burials, numbering and deleting forever. `cur` is the index
// of the graveyard being browsed (a seat setting); every operation returns the new yards and cur.

import type { Burial, Graveyard, Oid, PieceRecord, Place, Yards } from '../model/records.ts';

export type At = { yard: number; item: number };
export type Browse = { yards: Yards; cur: number };

const NUMBERED = /^Graveyard (\d+)$/;

/** A fresh Boot Hill: one nameless graveyard. */
export function empty(): Yards {
  return { yards: [{ name: 'Graveyard 1', named: false, items: [] }] };
}

// R123: one past the highest "Graveyard N" in use.
function nextName(y: Yards): string {
  const ns = y.yards.flatMap(g => {
    const m = NUMBERED.exec(g.name);
    return m ? [Number(m[1])] : [];
  });
  return `Graveyard ${Math.max(0, ...ns) + 1}`;
}

const vacant = (g: Graveyard) => g.items.length === 0 && !g.named;

// R124: an empty, nameless graveyard goes; the only one is always kept.
/** Drops graveyard `at` if it is empty and nameless and not the only one; cur follows. */
function sweep(y: Yards, at: number, cur: number): Browse {
  if (y.yards.length < 2 || !vacant(y.yards[at]!)) return { yards: y, cur };
  const yards = { yards: y.yards.filter((_, i) => i !== at) };
  return { yards, cur: Math.min(cur > at ? cur - 1 : cur, yards.yards.length - 1) };
}

const withYard = (y: Yards, at: number, g: Graveyard): Yards => ({ yards: y.yards.map((x, i) => i === at ? g : x) });

// R119: a character goes with everything on it: its Influence cards, the chips and cards in its
// pool's slots, and whatever is pinned to it.
/** The records a piece is buried with: itself, and for a character everything on it. */
export function burialOf(piece: PieceRecord, all: PieceRecord[]): PieceRecord[] {
  if (piece.kind !== 'character') return [piece];
  const oid: Oid = piece.oid;
  const inSlot = (r: PieceRecord) => (r.kind === 'chip' || r.kind === 'influence') && typeof r.where === 'object' && 'slot' in r.where && r.where.slot === oid;
  return [piece, ...all.filter(r => (r.kind === 'influence' && r.home === oid) || inSlot(r)
    || ((r.kind === 'sticky' || r.kind === 'text' || r.kind === 'image') && r.pin?.card === oid))];
}

// R122: burials go into the current graveyard.
export function bury(y: Yards, cur: number, records: PieceRecord[], name: string): Yards {
  const g = y.yards[cur]!;
  return withYard(y, cur, { ...g, items: [...g.items, { name, records }] });
}

function take(y: Yards, cur: number, at: At): Browse & { burial: Burial | undefined } {
  const g = y.yards[at.yard], burial = g?.items[at.item];
  if (!g || !burial) return { yards: y, cur, burial: undefined };
  return { ...sweep(withYard(y, at.yard, { ...g, items: g.items.filter((_, i) => i !== at.item) }), at.yard, cur), burial };
}

// R120, R124: dragging a name out brings it back; a graveyard left empty and nameless goes.
/** Removes a burial and returns its records. */
export function exhume(y: Yards, cur: number, at: At): Browse & { records: PieceRecord[] } {
  const { burial, ...b } = take(y, cur, at);
  return { ...b, records: burial?.records ?? [] };
}

// R123, R124: › on the last graveyard makes a new one only if this one has something or a name.
export function next(y: Yards, cur: number): Browse {
  if (cur < y.yards.length - 1) return sweep(y, cur, cur + 1);
  if (vacant(y.yards[cur]!)) return { yards: y, cur };
  return { yards: { yards: [...y.yards, { name: nextName(y), named: false, items: [] }] }, cur: cur + 1 };
}

/** ‹: the graveyard before, leaving this one (which goes if empty and nameless). */
export function prev(y: Yards, cur: number): Browse {
  return cur > 0 ? sweep(y, cur, cur - 1) : { yards: y, cur };
}

// R124: erasing a name makes it nameless; an empty nameless one goes unless it is the only one.
export function rename(y: Yards, cur: number, name: string): Browse {
  const g = y.yards[cur]!, n = name.trim();
  return sweep(withYard(y, cur, { ...g, name: n, named: n !== '' }), cur, cur);
}

// R125: deleting forever, after the two-shift-click arming (BootHillView).
export function forget(y: Yards, cur: number, at: At): Browse {
  const { burial: _gone, ...b } = take(y, cur, at);
  return b;
}

export function forgetAll(y: Yards, cur: number): Browse {
  return sweep(withYard(y, cur, { ...y.yards[cur]!, items: [] }), cur, cur);
}

// R290, R114: a burial's name: the pool's (or "Nameless"); a sticky's or loose writing's first line;
// a receipt's title; a torn roll's count and its newest receipt's title.
const firstLine = (marked: string) => marked.replace(/<[^>]*>/g, '').split('\n').find(l => l.trim())?.trim().slice(0, 28) || '…';
export function graveName(piece: PieceRecord): string {
  switch (piece.kind) {
    case 'character': return piece.name.trim() || 'Nameless';
    case 'sticky': return `Note: ${firstLine(piece.text)}`;
    case 'text': return `Writing: ${firstLine(piece.text)}`;
    case 'tornroll': {
      const n = piece.receipts.length;
      return `Tape: ${n} roll${n === 1 ? '' : 's'}${n ? `, last ${piece.receipts[0]!.title}` : ''}`;
    }
    default: return 'Image';
  }
}

// R120: a burial comes up under the pointer: its lead (a character by its pool) grabbed near its top
// left, everything with it moved by the same offset, all on top.
/** The records of a burial placed so the lead is under `at` (table coordinates), at height `z`. */
export function raised(records: PieceRecord[], at: { x: number; y: number }, z: number): PieceRecord[] {
  const lead = records[0];
  if (!lead) return [];
  const anchor = lead.kind === 'character' ? lead.pool : 'place' in lead ? lead.place : null;
  if (!anchor) return records;
  const grab = lead.kind === 'character' ? GRAB_POOL : GRAB_PIECE;
  const dx = Math.round(at.x - grab.x - anchor.x), dy = Math.round(at.y - grab.y - anchor.y);
  const moved = (p: Place): Place => ({ ...p, x: p.x + dx, y: p.y + dy, z });
  return records.map(r => r.kind === 'character' ? { ...r, pool: moved(r.pool), card: moved(r.card) }
    : 'place' in r ? { ...r, place: moved(r.place) } as PieceRecord : r);
}

/** Where under a dug-up piece the pointer holds it. */
const GRAB_POOL = { x: 30, y: 14 }, GRAB_PIECE = { x: 20, y: 14 };
