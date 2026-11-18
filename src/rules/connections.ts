// CRC: crc-Connections.md | R407, R411, R412, R413, R415, R416, R418
// The Connection Table's rules, pure: Levels as words, a card's group, a row for every named NPC,
// renaming rows, setting cells, and the adventure's table as the seed.

import { GM, type Character, type ConnRow, type Connections, type Oid, type Place } from '../model/records.ts';

const WORDS = ['Min', 'Sig', 'Maj', 'Ext', 'Exq'];

// R411: a Level as the book writes it, capitalized; "0" for none.
/** A Connection's Level in words: "+Min", "-Sig", "0". */
export function level(n: number): string {
  return n === 0 ? '0' : `${n > 0 ? '+' : '-'}${WORDS[Math.min(Math.abs(n), 5) - 1]}`;
}

/** The Levels a cell can be set to, -Exq to +Exq. */
export const LEVELS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

/** The first line of a card's front, without its marks. */
const firstLine = (front: string) => (front.split('\n')[0] ?? '').replace(/<[^>]*>/g, '');

// R413: the words in parentheses on the card's first line.
/** A card's group, or none. */
export function groupOf(front: string): string | undefined {
  const m = /\(([^()]*)\)/.exec(firstLine(front));
  return m?.[1]?.trim() || undefined;
}

// R412: a GM card given a name, not the supply's "Name".
export function named(c: Character): boolean {
  const name = c.name.trim();
  return c.owner === GM && !!name && name !== 'Name';
}

// R412, R413, R415: a named GM card's row: its group's, or its own (by oid, else a row of its name with
// no card), made with `id` when there is none; a found row takes the card's name.
/** The table with a row for this card. */
export function keep(t: Connections, c: Character, id: Oid): Connections {
  if (!named(c)) return t;
  const g = groupOf(c.front);
  if (g) return t.rows.some(r => r.group && r.name === g) ? t : { ...t, rows: [...t.rows, { id, name: g, group: true }] };
  const name = c.name.trim();
  const mine = t.rows.find(r => r.oid === c.oid) ?? t.rows.find(r => !r.oid && !r.group && r.name === name);
  if (!mine) return { ...t, rows: [...t.rows, { id, name, oid: c.oid }] };
  if (mine.name === name && mine.oid === c.oid) return t;
  return { ...t, rows: t.rows.map(r => (r === mine ? { ...r, name, oid: c.oid } : r)) };
}

/** A card's first line with its group's words replaced. */
function regroup(front: string, to: string): string {
  const lines = front.split('\n');
  lines[0] = lines[0]!.replace(/\(([^()]*)\)/, `(${to})`);
  return lines.join('\n');
}

// R412, R415: a cleared name removes the row and its cells; a group's new name goes onto its members'
// first lines, an NPC's onto its card.
/** The table with a row renamed, and the characters the rename changes. */
export function rename(t: Connections, id: Oid, name: string, chars: Character[]): { table: Connections; changed: Character[] } {
  const row = t.rows.find(r => r.id === id), to = name.trim();
  if (!row || row.name === to) return { table: t, changed: [] };
  if (!to) {
    const cells = Object.fromEntries(Object.entries(t.cells).filter(([k]) => !k.split('>').includes(id)));
    return { table: { ...t, rows: t.rows.filter(r => r !== row), cells }, changed: [] };
  }
  const table = { ...t, rows: t.rows.map(r => (r === row ? { ...r, name: to } : r)) };
  const changed = row.group
    ? chars.filter(c => c.owner === GM && groupOf(c.front) === row.name).map(c => ({ ...c, front: regroup(c.front, to) }))
    : chars.filter(c => c.oid === row.oid).map(c => ({ ...c, name: to }));
  return { table, changed };
}

/** A cell's Level: the row's Connection to the column. */
export const cell = (t: Connections, row: Oid, col: Oid): number => t.cells[`${row}>${col}`] ?? 0;

// R411: one cell; 0 is kept as no cell.
export function set(t: Connections, row: Oid, col: Oid, n: number): Connections {
  const { [`${row}>${col}`]: _was, ...cells } = t.cells;
  return { ...t, cells: n ? { ...cells, [`${row}>${col}`]: n } : cells };
}

// R416: by name, ignoring case.
export function order<T extends { name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** An empty Connection Table, put on the table at `place`. */
export function newConnections(oid: Oid, place: Place): Connections {
  return { kind: 'connections', oid, place, rows: [], cells: {} };
}

// R418: *Connections in Unton*, from *A Ghoulish Problem*: read across, the row's Connection to the
// column, in Levels, totaling 0.
const UNTON = ['Obed', 'Beatrice', 'Eliza', 'Maggie', 'Devreux', 'Jake', 'Jameson', 'Jephthah'];
const UNTON_LEVELS = [
  [0, 2, 1, 1, -1, 1, -1, 1],
  [2, 0, 1, 0, -1, 0, 0, 1],
  [0, 1, 0, 1, 1, -1, -1, 0],
  [1, 0, 1, 0, 0, -1, -2, 0],
  [-1, 0, 1, 0, 0, -2, 0, -1],
  [1, 0, -1, -1, -2, 0, 1, 1],
  [-1, 0, 0, -1, 0, 1, 0, -2],
  [1, 1, 0, 0, -2, 1, -1, 0],
];

/** The adventure's table, put away, with Devreux's row linked to her card. */
export function seed(oid: Oid, place: Place, devreux: Oid): Connections {
  const id = (k: number) => `c000000${k + 1}`;
  const rows: ConnRow[] = UNTON.map((name, k) => ({ id: id(k), name, ...(name === 'Devreux' && { oid: devreux }) }));
  let t: Connections = { ...newConnections(oid, place), away: true, rows };
  UNTON_LEVELS.forEach((row, a) => row.forEach((n, b) => { t = set(t, id(a), id(b), n); }));
  return t;
}
