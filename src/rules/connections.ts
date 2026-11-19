// CRC: crc-Connections.md | R407, R411, R412, R413, R415, R416, R418, R420-426, R429, R430, R436-438
// The Connection Table's rules, pure: Levels as words, a card's group, a row for every named NPC,
// renaming rows, setting cells, the adventure's table as the seed, and the Opinion Records: their
// Connection, their first Opinions, and their cells.

import { GM, OPEN, type Character, type ConnRow, type Connections, type Oid, type Opinion, type PieceRecord, type Place } from '../model/records.ts';
import { field, skillsLine, type Entry } from './readmarks.ts';

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

// ---- Opinion Records ----

/** The Connection Table among the records, when there is one. */
export const tableOf = (records: PieceRecord[]): Connections | undefined =>
  records.find((r): r is Connections => r.kind === 'connections');

const LEVEL_OF: Record<string, number> = { Min: 1, Sig: 2, Maj: 3, Ext: 4, Exq: 5 };
/** A line's fixed Level: its first Level word, or a lone 0, outside parentheses; none when it has none. */
export function fixed(line: string): number | undefined {
  const m = /(?:^|\s)(?:([+-])(Min|Sig|Maj|Ext|Exq)\b|0(?=\s|$))/.exec(line.replace(/\([^)]*\)/g, ' '));
  return m ? (m[1] ? (m[1] === '-' ? -1 : 1) * LEVEL_OF[m[2]!]! : 0) : undefined;
}

// R420: the best positive Opinion less the worst negative, by fixed Levels, either 0 when there is none.
/** A record's Connection, in Levels. */
export function connection(text: string): number {
  const all = text.split('\n').map(fixed).filter((n): n is number => n !== undefined);
  return Math.max(0, ...all) + Math.min(0, ...all);
}

/** A Skill's name as two cards would both know it: no ✓, †, trailing Level or parentheses. */
const skillName = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/[✓†]/g, '').replace(/\s\d+\s*$/, '').trim();

// R425: a card's Skills by name and Level: a `Skills N:` line's at N, one under a Field at the Field's
// Level unless it gives its own.
export function skills(front: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (name: string, n: number) => { const k = skillName(name); if (k && (out.get(k) ?? -1) < n) out.set(k, n); };
  let under = 0;
  for (const raw of front.split('\n')) {
    const text = raw.replace(/<[^>]*>/g, '');
    if (raw.startsWith('<fld>')) { under = field(text)?.level ?? 0; continue; }
    if (!raw.startsWith('<skl>')) continue;
    const line = skillsLine(text);
    if (line) { for (const p of line.skills) add(p.name, line.level); continue; }
    const own = /\s(\d+)\s*$/.exec(text.replace(/\([^)]*\)/g, ''));
    add(text, own ? Number(own[1]) : under);
  }
  return out;
}

/** R425: 1 Level, plus 2 when the PC has Level 2 in any of the Skills. */
const respectLevel = (names: string[], pc: Map<string, number>) => 1 + (names.some(n => (pc.get(n) ?? 0) >= 2) ? 2 : 0);

// R425: one line naming the Skills the two cards have in common, in the PC's order.
/** The Professional Respect line for an NPC's record of a PC, or none. */
export function respect(npc: string, pc: string): string | undefined {
  const theirs = skills(npc), mine = skills(pc), common = [...mine.keys()].filter(k => theirs.has(k));
  return common.length ? `Professional Respect (${common.join(', ')}) ${level(respectLevel(common, mine))}` : undefined;
}

const RESPECT = /^(\s*Professional Respect\s*)\(([^)]*)\)\s*(?:[+-](?:Min|Sig|Maj|Ext|Exq)\b|0\b)?(.*)$/;
// R425: the Level worked out again from the Skills left on the line; with none left, the line goes.
/** A record's text with its Professional Respect line made right for the PC. */
export function respected(text: string, pc: string): string {
  const mine = skills(pc);
  return text.split('\n').flatMap(line => {
    const m = RESPECT.exec(line);
    if (!m) return [line];
    const names = m[2]!.split(',').map(n => n.trim()).filter(Boolean);
    return names.length ? [`${m[1]}(${names.join(', ')}) ${level(respectLevel(names.map(skillName), mine))}${m[3]}`] : [];
  }).join('\n');
}

// R426: a card's row is its group's when it has a group, else its own.
export function rowOf(t: Connections, c: Character): ConnRow | undefined {
  const g = groupOf(c.front);
  return t.rows.find(r => (g ? r.group && r.name === g : r.oid === c.oid));
}

/** The PCs, players' characters, by name. */
export const pcsOf = (chars: Character[]) => order(chars.filter(c => c.owner !== GM && c.owner !== OPEN));

// R423, R424, R425: a new record's first Opinions.
/** The text a new record of `of` held by `holder` starts with; `pc` is the character when `of` is a PC. */
export function first(t: Connections, records: Opinion[], holder: Oid, of: Oid, npc: Character, pc?: Character): string {
  if (!pc) return `Opinion ${level(cell(t, holder, of))}`;
  // R424: of the characters the holder has a cell for, other than 0, those with a record of the PC.
  const known = t.rows.flatMap(r => {
    const mine = cell(t, holder, r.id), rec = records.find(x => x.holder === r.id && x.of === pc.oid);
    return r.id !== holder && mine && rec ? [{ mine, theirs: connection(rec.text) }] : [];
  });
  known.sort((a, b) => Math.abs(b.mine) - Math.abs(a.mine) || Math.abs(b.theirs) - Math.abs(a.theirs) || b.theirs - a.theirs);
  const best = known[0];
  const lines = [best ? `Reputation ${level(best.mine < 0 ? -best.theirs : best.theirs)}` : 'Reaction ?'];
  const pr = respect(npc.front, pc.front);
  return [...lines, ...(pr ? [pr] : [])].join('\n');
}

// R421, R428: the record's Connection in its cell, kept even when 0, so a PC's cell shows it.
export function synced(t: Connections, r: Opinion): Connections {
  return { ...t, cells: { ...t.cells, [`${r.holder}>${r.of}`]: connection(r.text) } };
}

// R430: Bunkum's Default Reaction: 1 -Sig, 2 -Min, 3-4 0, 5 +Min, 6 +Sig.
const DEFAULT_REACTION = [-2, -1, 0, 0, 1, 2];
/** The Reaction a d6 gives, as a Level number. */
export const reactionOf = (d6: number): number => DEFAULT_REACTION[d6 - 1] ?? 0;

const AWAITING = /^\s*Reaction \?\s*$/;
/** Whether a record waits for its Reaction roll: a "Reaction ?" line. */
export const awaits = (text: string): boolean => text.split('\n').some(l => AWAITING.test(l));
/** A record's text with its first "Reaction ?" line written as the Reaction rolled. */
export function reacted(text: string, n: number): string {
  const lines = text.split('\n'), k = lines.findIndex(l => AWAITING.test(l));
  if (k >= 0) lines[k] = `Reaction ${level(n)}`;
  return lines.join('\n');
}

// R429, R430: the record an NPC's card shows of a PC: its row's, or its group's.
/** The record the NPC's row holds of `of`, if any. */
export function recordOf(records: Opinion[], t: Connections, npc: Character, of: Oid): Opinion | undefined {
  const row = rowOf(t, npc);
  return row && records.find(r => r.holder === row.id && r.of === of);
}

// R436: each line of a record with words is an item, whole, keyed by its record, an Opinion.
/** What the eye can reveal of a record. */
export function opinionItems(rec: Opinion): Entry[] {
  return rec.text.split('\n').flatMap((line, k) => {
    const text = line.trim();
    return text ? [{ line: k, label: '', text, key: `o${rec.oid}:${text}`, cat: 'opinions' as const }] : [];
  });
}

/** A record's revealed lines, as the eye's keys. */
export const revealed = (rec: Opinion): string[] => (rec.shown ?? []).map(t => `o${rec.oid}:${t}`);

// R436, R437: once a line is revealed, the cards the record shows under (every member's, for a group's)
// and what it is of go out with it; nothing does before.
/** The record as its revealed lines go out. */
export function published(t: Connections, chars: Character[], rec: Opinion): Opinion {
  const { on: _o, name: _n, shown, ...rest } = rec;
  if (!shown?.length) return rest;
  const on = chars.filter(c => c.owner === GM && rowOf(t, c)?.id === rec.holder).map(c => c.oid).sort();
  return { ...rest, shown, on, name: nameOf(t, chars, rec.of) };
}

// R419, R426, R438: the records a card shows: its row's, with the table; on a player's page, which has
// none, those published on it.
/** The records under a card. */
export function recordsOn(records: Opinion[], c: Character, t?: Connections): Opinion[] {
  if (!t) return records.filter(r => r.on?.includes(c.oid));
  const row = rowOf(t, c);
  return row ? records.filter(r => r.holder === row.id) : [];
}

/** The name of what a record is of: a row's name, or a PC's. */
export function nameOf(t: Connections, chars: Character[], of: Oid): string {
  return t.rows.find(r => r.id === of)?.name ?? chars.find(c => c.oid === of)?.name ?? '?';
}

// R422: the PCs the holder has no record of, by name, then the other rows it has none of, by name.
/** What the NPC's menu offers under "Opinion of". */
export function candidates(t: Connections, records: Opinion[], holder: Oid, chars: Character[]): { id: Oid; name: string; pc: boolean }[] {
  const has = new Set(records.filter(r => r.holder === holder).map(r => r.of));
  return [
    ...pcsOf(chars).filter(c => !has.has(c.oid)).map(c => ({ id: c.oid, name: c.name, pc: true })),
    ...order(t.rows).filter(r => r.id !== holder && !has.has(r.id)).map(r => ({ id: r.id, name: r.name, pc: false })),
  ];
}

