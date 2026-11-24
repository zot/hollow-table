// CRC: crc-Desktops.md | R557, R558, R559, R561, R563
// The GM's desktops, pure: which pieces travel from desktop to desktop, and setting a desk out as one
// change of puts and deletions. A desktop not set out is kept in the GM's own desk record (R561).

import { GM, isMine, isPaper, isPiece, isPinnable, ridFor, type Desk, type Oid, type PieceRecord, type Rec, type Rid, type Spot } from '../model/records.ts';

// R558: the Connection Table and the Opinion Records are the game's, on every desktop.
const game = (r: PieceRecord) => r.kind === 'connections' || r.kind === 'opinion';

// R558: players' and open characters, their cards and slot chips; players' paper and dockets; then
// whatever is pinned to any of these.
/** The oids of the pieces that travel from desktop to desktop. */
export function travelers(all: PieceRecord[]): Set<Oid> {
  const out = new Set<Oid>();
  for (const r of all) {
    if (r.kind === 'character' && r.owner !== GM) out.add(r.oid);
    else if (isPaper(r) && r.by && r.by !== GM) out.add(r.oid);
  }
  const people = new Set(out);
  for (const r of all) {
    if (r.kind === 'influence' && people.has(r.home)) out.add(r.oid);
    if ((r.kind === 'chip' || r.kind === 'influence') && typeof r.where === 'object' && 'slot' in r.where && people.has(r.where.slot)) out.add(r.oid);
  }
  for (const r of all) if (isPinnable(r) && r.pin && out.has(r.pin.card)) out.add(r.oid);
  return out;
}

/** Where a traveler lies, as its desktop keeps it. */
function spotOf(r: PieceRecord): Spot | null {
  if (r.kind === 'character') return { pool: r.pool, card: r.card, gathered: r.gathered };
  return isPaper(r) ? { place: r.place } : null;
}

/** A traveler moved to its spot. */
function at(r: PieceRecord, s: Spot): PieceRecord {
  if (r.kind === 'character' && s.pool && s.card) return { ...r, pool: s.pool, card: s.card, gathered: !!s.gathered };
  if (isPaper(r) && s.place) return { ...r, place: s.place };
  return r;
}

export type SetOut = { desk: Desk; puts: { rid: Rid; rec: Rec }[]; dels: Rid[] };

// R559, R563: the travelers' places kept for the desktop leaving; every other piece on the table (this
// page's own paper too, but not a torn roll) kept as its desktop and taken off; the new desktop laid on
// the table, emptied from the record; each traveler to where it last lay there, if it has been there.
/** The desk record and the change that set desk `to` out; null when it is set out already. */
export function setOut(desk: Desk, all: [Rid, PieceRecord][], to: number): SetOut | null {
  const from = desk.out ?? 0;
  if (to === from || !desk.desks[to]) return null;
  const table = all.filter(([rid, r]) => (isPiece(rid) || isMine(rid)) && !game(r));
  const go = travelers(table.map(([, r]) => r));
  const spots: Record<Oid, Spot> = {}, top: PieceRecord[] = [], dels: Rid[] = [];
  for (const [rid, r] of table) {
    if (go.has(r.oid)) { const s = spotOf(r); if (s) spots[r.oid] = s; continue; }
    top.push(r);
    dels.push(rid);
  }
  const there = desk.desks[to]!;
  const puts: SetOut['puts'] = (there.top ?? []).map(r => ({ rid: ridFor(r), rec: r }));
  for (const [rid, r] of table) {
    const s = go.has(r.oid) ? there.spots?.[r.oid] : undefined;
    if (s) puts.push({ rid, rec: at(r, s) });
  }
  const desks = desk.desks.map((d, i) => {
    if (i === from) return { ...d, top, spots: { ...d.spots, ...spots } };
    if (i === to) { const { top: _laid, ...rest } = d; return rest; }
    return d;
  });
  return { desk: { ...desk, desks, out: to }, puts, dels };
}
