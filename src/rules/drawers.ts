// CRC: crc-Drawers.md | R519, R521, R523, R524, R525, R527
// The desk's drawers, pure: which drawer a piece files in, filing it, and taking it out again. Like
// Boot Hill's graveyards, but each page's own (`desk`) and never shared.

import { GM, isPaper, type Desk, type Drawer, type Filed, type PieceRecord } from '../model/records.ts';

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

/** An empty desk. */
export function emptyDesk(): Desk { return { desk: [] }; }

// R523: an entry at the end of its drawer, with the records a burial would take, as they were.
/** The desk with `records` filed in `drawer` under `name`. */
export function filed(desk: Desk, drawer: Drawer, records: PieceRecord[], name: string): Desk {
  return { desk: [...desk.desk, { drawer, name, records }] };
}

// R527: taken out, the entry leaves the desk and its records come back as filed.
/** The desk without entry `k`, and that entry's records. */
export function takeOut(desk: Desk, k: number): { desk: Desk; records: PieceRecord[] } {
  return { desk: { desk: desk.desk.filter((_, i) => i !== k) }, records: desk.desk[k]?.records ?? [] };
}

/** A drawer's entries, oldest first, each with its index in the desk. */
export function inDrawer(desk: Desk | undefined, drawer: Drawer): { k: number; entry: Filed }[] {
  return (desk?.desk ?? []).flatMap((entry, k) => (entry.drawer === drawer ? [{ k, entry }] : []));
}
