// CRC: crc-Drawers.md | R519, R521, R523, R524, R525, R527, R546, R547, R549, R550, R551, R556
// The desk's drawers, pure: which drawer a piece files in, filing it, and taking it out again. Like
// Boot Hill's graveyards, but each page's own (`desk`) and never shared.

import { GM, isPaper, type Desk, type Drawer, type Filed, type OldDesk, type OneDesk, type PieceRecord } from '../model/records.ts';

// R521: the GM's desk has Characters, NPCs and Papers; a player's, Papers alone.
/** The drawers of a desk, in the order they show. */
export function drawers(gm: boolean): Drawer[] { return gm ? ['characters', 'npcs', 'papers'] : ['papers']; }

/** What a drawer is called on its label. */
export const LABEL: Record<Drawer, string> = { characters: 'Characters', npcs: 'NPCs', papers: 'Papers' };

// R521, R522: on the GM's page a character files as an NPC when the GM owns it, else as a character;
// paper files in Papers on every page; nothing else is filed.
/** The drawer a piece files in on this page, or null when it isn't filed. */
export function drawerOf(piece: PieceRecord, gm: boolean): Drawer | null {
  if (piece.kind === 'character') {
    if (!gm) return null;
    return piece.owner === GM ? 'npcs' : 'characters';
  }
  return isPaper(piece) ? 'papers' : null;
}

const NUMBERED = /^Desk (\d+)$/;
const blank = (name: string): OneDesk => ({ name, named: false, items: [] });

/** A page's desks before anything is filed: one nameless "Desk 1". */
export function emptyDesk(): Desk { return { desks: [blank('Desk 1')] }; }

// R550: a desk record from before held one desk's entries: it reads as one nameless "Desk 1".
/** The desks a `desk` record holds. */
export function desksOf(rec: Desk | OldDesk | undefined): Desk {
  if (!rec) return emptyDesk();
  if ('desk' in rec) return { desks: [{ ...blank('Desk 1'), items: rec.desk }] };
  return rec.desks.length ? rec : emptyDesk();
}

const withDesk = (d: Desk, at: number, one: OneDesk): Desk => ({ desks: d.desks.map((x, i) => (i === at ? one : x)) });

// R523: an entry at the end of its drawer, with the records a burial would take, as they were.
/** The desks with `records` filed in desk `at`'s `drawer` under `name`. */
export function filed(d: Desk, at: number, drawer: Drawer, records: PieceRecord[], name: string): Desk {
  const one = d.desks[at]!;
  return withDesk(d, at, { ...one, items: [...one.items, { drawer, name, records }] });
}

// R527: taken out, the entry leaves its desk and its records come back as filed.
/** The desks without desk `at`'s entry `k`, and that entry's records. */
export function takeOut(d: Desk, at: number, k: number): { desk: Desk; records: PieceRecord[] } {
  const one = d.desks[at];
  if (!one) return { desk: d, records: [] };
  return { desk: withDesk(d, at, { ...one, items: one.items.filter((_, i) => i !== k) }), records: one.items[k]?.records ?? [] };
}

/** A drawer's entries in desk `at`, oldest first, each with its index in that desk. */
export function inDrawer(d: Desk, at: number, drawer: Drawer): { k: number; entry: Filed }[] {
  return (d.desks[at]?.items ?? []).flatMap((entry, k) => (entry.drawer === drawer ? [{ k, entry }] : []));
}

// R551: the GM's desks browse as Boot Hill's graveyards do (Yards.next, prev, rename).
/** One past the highest "Desk N" in use. */
function nextName(d: Desk): string {
  const ns = d.desks.flatMap(x => { const m = NUMBERED.exec(x.name); return m ? [Number(m[1])] : []; });
  return `Desk ${Math.max(0, ...ns) + 1}`;
}
const vacant = (x: OneDesk) => !x.items.length && !x.named;
type Browse = { desk: Desk; cur: number };
/** Drops desk `at` if it is empty and nameless and not the only one; cur follows. */
function sweep(d: Desk, at: number, cur: number): Browse {
  if (d.desks.length < 2 || !vacant(d.desks[at]!)) return { desk: d, cur };
  const desk = { desks: d.desks.filter((_, i) => i !== at) };
  return { desk, cur: Math.min(cur > at ? cur - 1 : cur, desk.desks.length - 1) };
}
/** ›: the next desk, or a new one past the last (unless the last is empty and nameless). */
export function deskNext(d: Desk, cur: number): Browse {
  if (cur < d.desks.length - 1) return sweep(d, cur, cur + 1);
  if (vacant(d.desks[cur]!)) return { desk: d, cur };
  return { desk: { desks: [...d.desks, blank(nextName(d))] }, cur: cur + 1 };
}
/** ‹: the desk before, leaving this one (which goes if empty and nameless). */
export function deskPrev(d: Desk, cur: number): Browse {
  return cur > 0 ? sweep(d, cur, cur - 1) : { desk: d, cur };
}
/** Names desk `cur`; erased, it is nameless, and goes if it is empty too (not the only one). */
export function deskRename(d: Desk, cur: number, name: string): Browse {
  const n = name.trim();
  return sweep(withDesk(d, cur, { ...d.desks[cur]!, name: n, named: n !== '' }), cur, cur);
}

/** What the board, a search result and the hint call a desk. */
export const deskName = (one: OneDesk): string => one.name || 'Unnamed desk';

// R546: the plain words on a filed record, marks left out.
/** The words a search reads on a filed record. */
export function wordsOf(r: PieceRecord): string {
  const plain = (m: string) => m.replace(/<[^>]*>/g, '');
  switch (r.kind) {
    case 'character': return [r.front, r.back.notes, ...(r.info ?? [])].map(plain).join('\n');
    case 'sticky': case 'text': return plain(r.text);
    case 'docket': return r.name;
    default: return '';
  }
}

// R546, R547, R549, R556: every word of the query, case aside, in the name or the words filed, in every
// desk; name matches first, each group by name; no words, every entry by name. The page's own desks alone.
/** The entries a search finds, each with its desk's index and its index in that desk. */
export function search(d: Desk, query: string): { at: number; k: number; entry: Filed }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const byName = (a: { entry: Filed }, b: { entry: Filed }) => a.entry.name.localeCompare(b.entry.name, undefined, { sensitivity: 'base' });
  const all = d.desks.flatMap((one, at) => one.items.map((entry, k) => ({ at, k, entry }))).sort(byName);
  if (!words.length) return all;
  const has = (text: string) => { const t = text.toLowerCase(); return words.every(w => t.includes(w)); };
  const named = all.filter(e => has(e.entry.name));
  const worded = all.filter(e => !has(e.entry.name) && has(e.entry.records.map(wordsOf).join('\n')));
  return [...named, ...worded];
}
