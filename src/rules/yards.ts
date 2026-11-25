// CRC: crc-Yards.md | R120, R121, R122, R123, R124, R125, R290, R403, R404, R405, R428, R487, R488, R489, R500, R544
// Boot Hill's rules, pure: graveyards, burials, numbering and deleting forever. `cur` is the index
// of the graveyard being browsed (a seat setting); every operation returns the new yards and cur.

import { isPaper, isPiece, isPinnable, ridFor, type Burial, type Character, type Graveyard, type Hill, type InfoBurial, type Oid, type Opinion, type PieceRecord, type Place, type Rec, type Rid, type Yards } from '../model/records.ts';

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
  // R544, R589: a docket goes with the paper pinned to it, and its characters with everything on them.
  if (piece.kind === 'docket') return [piece, ...all.flatMap(r =>
    !('pin' in r) || r.pin?.card !== piece.oid ? [] : r.kind === 'character' ? burialOf(r, all) : [r])];
  if (piece.kind !== 'character') return [piece];
  const oid: Oid = piece.oid;
  const inSlot = (r: PieceRecord) => (r.kind === 'chip' || r.kind === 'influence') && typeof r.where === 'object' && 'slot' in r.where && r.where.slot === oid;
  return [piece, ...all.filter(r => (r.kind === 'influence' && r.home === oid) || inSlot(r)
    || (isPinnable(r) && r.pin?.card === oid))];
}

// R488, R500: what putting a piece away buries where: the table's Boot Hill takes the burial, less any
// torn roll or `mine` paper, which go to this page's own Hill, each on its own; a burial left with
// nothing for the table isn't made there at all, so not even its name leaves the page.
/** A piece's burial, split into the table's share and this page's own. */
export function putAway(piece: PieceRecord, all: PieceRecord[]): { shared: PieceRecord[]; own: PieceRecord[] } {
  const whole = burialOf(piece, all), mine = (r: PieceRecord) => r.kind === 'tornroll' || (isPaper(r) && !!r.mine);
  return { shared: whole.filter(r => !mine(r)), own: whole.filter(mine) };
}

// R122: burials go into the current graveyard.
export function bury(y: Yards, cur: number, records: PieceRecord[], name: string): Yards {
  const g = y.yards[cur]!;
  return withYard(y, cur, { ...g, items: [...g.items, { name, records }] });
}

// R403: an emptied Info card is buried with its NPC, its place and its words, named after its NPC.
export function buryInfo(y: Yards, cur: number, name: string, info: InfoBurial, gm: Oid): Yards {
  const g = y.yards[cur]!;
  return withYard(y, cur, { ...g, items: [...g.items, { name: `${name.trim() || 'Nameless'}: Info card`, records: [], info, gm }] });
}

/** R404, R405: the character with a buried Info card back at its place (last, if fewer remain), and that place. */
export function withInfo(c: Character, info: InfoBurial): { character: Character; k: number } {
  const cards = [...(c.info ?? [])], k = Math.min(info.k, cards.length);
  cards.splice(k, 0, info.text);
  return { character: { ...c, info: cards }, k };
}

/** R404, R428: the newest GM card (an Info card or an Opinion Record) buried in the current graveyard that `here` can bring back. */
export function lastCard(y: Yards, cur: number, here: (b: Burial) => boolean): At | null {
  const items = y.yards[cur]?.items ?? [];
  for (let i = items.length - 1; i >= 0; i--) if (items[i]!.gm && here(items[i]!)) return { yard: cur, item: i };
  return null;
}

// R428: an emptied Opinion Record, buried whole as a GM card.
/** Boot Hill with a record buried as "<holder>: Opinion of <name>". */
export function buryRecord(y: Yards, cur: number, holder: string, of: string, record: Opinion, gm: Oid): Yards {
  const g = y.yards[cur]!;
  return withYard(y, cur, { ...g, items: [...g.items, { name: `${holder.trim() || 'Nameless'}: Opinion of ${of}`, records: [record], gm }] });
}

function take(y: Yards, cur: number, at: At): Browse & { burial: Burial | undefined } {
  const g = y.yards[at.yard], burial = g?.items[at.item];
  if (!g || !burial) return { yards: y, cur, burial: undefined };
  return { ...sweep(withYard(y, at.yard, { ...g, items: g.items.filter((_, i) => i !== at.item) }), at.yard, cur), burial };
}

// R120, R124: dragging a name out brings it back; a graveyard left empty and nameless goes.
/** Removes a burial and returns its records, or the Info card it holds (R405). */
export function exhume(y: Yards, cur: number, at: At): Browse & { records: PieceRecord[]; info?: InfoBurial } {
  const { burial, ...b } = take(y, cur, at);
  return { ...b, records: burial?.records ?? [], ...(burial?.info ? { info: burial.info } : {}) };
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

// R488: this page's own burials (torn tapes), kept in its Hill under the graveyard's name, never sent.
export function buryOwn(h: Hill, yard: string, records: PieceRecord[], name: string): Hill {
  return { hill: [...h.hill, { yard, burial: { name, records } }] };
}

// R489: a graveyard shows the own burials under its name; the first also those whose name no graveyard has.
/** The indices in the Hill of the burials graveyard `cur` shows. */
export function ownIn(h: Hill, y: Yards, cur: number): number[] {
  const names = new Set(y.yards.map(g => g.name)), name = y.yards[cur]?.name;
  return h.hill.flatMap((o, k) => o.yard === name || (cur === 0 && !names.has(o.yard)) ? [k] : []);
}

/** Takes own burial `k` out of the Hill, with its records. */
export function exhumeOwn(h: Hill, k: number): { hill: Hill; records: PieceRecord[] } {
  return { hill: forgetOwn(h, k), records: h.hill[k]?.burial.records ?? [] };
}

export function forgetOwn(h: Hill, k: number): Hill {
  return { hill: h.hill.filter((_, i) => i !== k) };
}

/** R489: forgetAll's part for this page's own: those graveyard `cur` shows. */
export function forgetOwnIn(h: Hill, y: Yards, cur: number): Hill {
  const gone = new Set(ownIn(h, y, cur));
  return { hill: h.hill.filter((_, k) => !gone.has(k)) };
}

// R487: what builds before this shared becomes the GM's page's own: each `o:` torn roll moves to `t:`,
// and each burial of torn rolls alone moves from the shared Boot Hill into the Hill.
/** The change that makes the torn rolls shared before this page's own; nothing when there are none. */
export function ownTorn(all: [Rid, Rec][], y: Yards | undefined, h: Hill | undefined): { puts: [Rid, Rec][]; dels: Rid[] } {
  const puts: [Rid, Rec][] = [], dels: Rid[] = [];
  for (const [rid, r] of all) {
    if (isPiece(rid) && (r as PieceRecord).kind === 'tornroll') { dels.push(rid); puts.push([ridFor(r as PieceRecord), r]); }
  }
  const tapes = (b: Burial) => !b.gm && b.records.length > 0 && b.records.every(r => r.kind === 'tornroll');
  const moved = y?.yards.flatMap(g => g.items.filter(tapes).map(burial => ({ yard: g.name, burial }))) ?? [];
  if (y && moved.length) {
    puts.push(['yards', { yards: y.yards.map(g => ({ ...g, items: g.items.filter(b => !tapes(b)) })) }]);
    puts.push(['hill', { hill: [...h?.hill ?? [], ...moved] }]);
  }
  return { puts, dels };
}

/** R487: records as a checkpoint holds them, with ownTorn's change made. */
export function ownedTorn(records: [Rid, Rec][]): [Rid, Rec][] {
  const m = new Map(records), { puts, dels } = ownTorn(records, m.get('yards') as Yards | undefined, m.get('hill') as Hill | undefined);
  for (const rid of dels) m.delete(rid);
  for (const [rid, r] of puts) m.set(rid, r);
  return [...m];
}

// R290, R114: a burial's name: the pool's (or "Nameless"); a sticky's or loose writing's first line;
// a receipt's title; a torn roll's count and its newest receipt's title.
const firstLine = (marked: string) => marked.replace(/<[^>]*>/g, '').split('\n').find(l => l.trim())?.trim().slice(0, 28) || '…';
export function graveName(piece: PieceRecord): string {
  switch (piece.kind) {
    case 'character': return piece.name.trim() || 'Nameless';
    case 'sticky': return `Note: ${firstLine(piece.text)}`;
    case 'text': return `Writing: ${firstLine(piece.text)}`;
    case 'docket': return `Docket: ${piece.name.trim()}`;   // R544
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
