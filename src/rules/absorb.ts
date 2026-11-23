// CRC: crc-Absorb.md | Seq: seq-take.md#1.2, seq-take.md#1.4.2 | R309, R310, R312, R315, R338, R339, R340, R341, R496
// Taking an Attack into a Damage column: Hollow Folks, *Absorbing Damage*, with Bill's rulings of
// 2026-11-13 (carves/damage.md, Item 4). Pure.
import { DAMAGE, LASTING, ROWS, type AttackKind, type Character, type Damage, type DamageSlot, type Lasting, type LastingColumn, type NameRow, type RowName } from '../model/records.ts';
import { columnRoom, slotWorth } from './influence.ts';

/** What a Slot of each row absorbs. */
export const SIZE: Record<RowName, number> = { mild: 2, min: 2, sig: 4, maj: 6 };

// R309: the Attack's kind picks its column.
export const COLUMN_OF: Record<AttackKind, Damage> = { phys: 'injury', mental: 'bias', psych: 'affliction' };

// R339: what each column's overflow makes (Bill, 11-13: a Condition, from the unpublished physical rules).
export const OVERFLOW: Record<Damage, string> = { bias: 'Conviction', affliction: 'Burden', injury: 'Condition' };
// R341: the columns that keep their overflow as a Conviction or Burden.
export const isLasting = (d: Damage): d is LastingColumn => (LASTING as readonly Damage[]).includes(d);

// R341: Hollow Folks, *Convictions and Burdens*: "They start at Minor and absorb up to 2 points, then
// rise to Significant, absorbing up to 4 more points, and so on, all the way up to Exquisite".
const TOPS = [2, 6, 12, 20, 30];
/** A Conviction's or Burden's Levels for its points: 1 (Min) to 5 (Exq), 0 at 0 points. */
export function lastingLevels(points: number): number {
  if (points <= 0) return 0;
  const k = TOPS.findIndex(t => points <= t);
  return k < 0 ? TOPS.length : k + 1;
}
/** The points that fill its Level: what *Sig (5/6)* shows after the slash. */
export function lastingTop(points: number): number {
  return TOPS[Math.max(lastingLevels(points), 1) - 1]!;
}

// R340: a name waits in a row's named Slot or, for a new one, the column's Conviction or Burden.
/** What a name for `row` of column `d` goes into; undefined for a column with no such Conviction or Burden. */
export function waitsIn(char: Character, d: Damage, row: NameRow): DamageSlot | Lasting | undefined {
  return row !== 'lasting' ? char.back.damage[d][row] : isLasting(d) ? char.back.lasting?.[d] : undefined;
}

/** A way to absorb an Attack: how many Slots of each row it uses, and what is left over. */
export type Page = { use: Record<RowName, number>; overflow: number };

const none = (): Record<RowName, number> => ({ mild: 0, min: 0, sig: 0, maj: 0 });

/** The boxes a row has: as Con or Wis gives (and any checked beyond), or as the card has them. */
function boxCount(char: Character, d: Damage, row: RowName): number {
  const s = char.back.damage[d][row], room = columnRoom(char, d);
  return room ? Math.max(room.boxes[row], s.boxes.lastIndexOf(true) + 1) : s.boxes.length;
}

// R315: a named Slot waiting for a name is not free.
const namedFree = (s: DamageSlot) => !s.name && !s.naming;

/** How many free Slots each row of a column has: its named Slot, then its unchecked boxes. */
export function free(char: Character, d: Damage): Record<RowName, number> {
  const out = none();
  for (const row of ROWS) {
    const s = char.back.damage[d][row], n = boxCount(char, d, row);
    out[row] = (namedFree(s) ? 1 : 0) + Array.from({ length: n }, (_, k) => !s.boxes[k]).filter(Boolean).length;
  }
  return out;
}

const total = (use: Record<RowName, number>, size: (r: RowName) => number) => ROWS.reduce((a, r) => a + use[r] * size(r), 0);
const slots = (use: Record<RowName, number>) => ROWS.reduce((a, r) => a + use[r], 0);

// R310: every set of free Slots that covers what the absorb leaves, with none to spare; R339: when
// none covers it, one page using every free Slot, the rest overflow.
/** The pages for an Attack of `kind` with Result `result` against `char`. */
export function pages(char: Character, kind: AttackKind, result: number): Page[] {
  const d = COLUMN_OF[kind], left = result - (columnRoom(char, d)?.absorb ?? 0);
  // R496: a slot worth only 1 absorbs 1 point.
  const size = (r: RowName) => slotWorth(char, d, r), sum = (use: Record<RowName, number>) => total(use, size);
  if (left <= 0) return [{ use: none(), overflow: 0 }];
  const avail = free(char, d), found: Page[] = [];
  const walk = (i: number, use: Record<RowName, number>) => {
    if (i === ROWS.length) {
      const used = ROWS.filter(r => use[r] > 0);
      if (!used.length) return;
      const got = sum(use), smallest = Math.min(...used.map(size));
      if (got >= left && got - smallest < left) found.push({ use: { ...use }, overflow: 0 });
      return;
    }
    const row = ROWS[i]!;
    for (let n = 0; n <= avail[row]; n++) walk(i + 1, { ...use, [row]: n });
  };
  walk(0, none());
  if (!found.length) return [{ use: avail, overflow: left - sum(avail) }];
  return found.sort((a, b) => sum(a.use) - sum(b.use) || slots(a.use) - slots(b.use));
}

/** Whether two pages use the same Slots and leave the same over. */
export function same(a: Page, b: Page): boolean {
  return a.overflow === b.overflow && ROWS.every(r => a.use[r] === b.use[r]);
}

// R312: a row is used in order: its named Slot waits for the attacker's name, then boxes are checked.
// R339: a mental or psychological overflow grows the column's Conviction or Burden, starting one that
// waits for the attacker's name; a physical one (a Condition) is written in the Notes (Bill, 11-15).
/** The character with the page's Slots used, and its overflow absorbed. */
export function fill(char: Character, kind: AttackKind, page: Page, by: { name: string; id: string }): Character {
  const d = COLUMN_OF[kind], column = { ...char.back.damage[d] };
  for (const row of ROWS) {
    let n = page.use[row];
    if (!n) continue;
    const s = column[row], n0 = boxCount(char, d, row);
    const next: DamageSlot = { ...s, boxes: Array.from({ length: Math.max(s.boxes.length, n0) }, (_, k) => !!s.boxes[k]) };
    if (namedFree(s)) { next.naming = { by: by.name, id: by.id }; n--; }
    for (let k = 0; k < next.boxes.length && n > 0; k++) if (!next.boxes[k]) { next.boxes[k] = true; n--; }
    column[row] = next;
  }
  const back = { ...char.back, damage: { ...char.back.damage, [d]: column } };
  if (page.overflow <= 0) return { ...char, back };
  if (isLasting(d)) {
    const was = char.back.lasting?.[d];
    const now: Lasting = was ? { ...was, points: was.points + page.overflow }
      : { name: '', points: page.overflow, spent: 0, naming: { by: by.name, id: by.id } };
    return { ...char, back: { ...back, lasting: { ...char.back.lasting, [d]: now } } };
  }
  const line = `${OVERFLOW[d]}: ${page.overflow} from ${by.name}'s Attack`;
  return { ...char, back: { ...back, notes: char.back.notes ? `${char.back.notes}\n${line}` : line } };
}

// R338: Mild Damage "disappears immediately after the Contest" (Hollow Folks): End empties every Mild
// slot, its boxes unchecked but kept (Con or Wis sets how many); the rest is the GM's to erase.
/** The character with every Mild slot emptied, in all three columns. */
export function mildEnds(char: Character): Character {
  const damage = { ...char.back.damage };
  for (const d of DAMAGE) {
    const mild = damage[d].mild;
    damage[d] = { ...damage[d], mild: { name: '', boxes: mild.boxes.map(() => false), spent: [] } };
  }
  return { ...char, back: { ...char.back, damage } };
}
