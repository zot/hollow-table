// CRC: crc-Absorb.md | Seq: seq-take.md#1.2, seq-take.md#1.4.2 | R309, R310, R311, R312, R315
// Taking an Attack into a Damage column: Hollow Folks, *Absorbing Damage*, with Bill's rulings of
// 2026-11-13 (carves/damage.md, Item 4). Pure.
import { ROWS, type AttackKind, type Character, type Damage, type DamageSlot, type RowName } from '../model/records.ts';
import { columnRoom } from './influence.ts';

/** What a Slot of each row absorbs. */
export const SIZE: Record<RowName, number> = { mild: 2, min: 2, sig: 4, maj: 6 };

// R309: the Attack's kind picks its column.
export const COLUMN_OF: Record<AttackKind, Damage> = { phys: 'injury', mental: 'bias', psych: 'affliction' };

// R311: what each kind's overflow makes (Bill, 11-13: a Condition, from the unpublished physical rules).
export const OVERFLOW: Record<AttackKind, string> = { phys: 'Condition', mental: 'Conviction', psych: 'Burden' };

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

const total = (use: Record<RowName, number>) => ROWS.reduce((a, r) => a + use[r] * SIZE[r], 0);
const slots = (use: Record<RowName, number>) => ROWS.reduce((a, r) => a + use[r], 0);

// R310: every set of free Slots that covers what the absorb leaves, with none to spare; R311: when
// none covers it, one page using every free Slot, the rest overflow.
/** The pages for an Attack of `kind` with Result `result` against `char`. */
export function pages(char: Character, kind: AttackKind, result: number): Page[] {
  const d = COLUMN_OF[kind], left = result - (columnRoom(char, d)?.absorb ?? 0);
  if (left <= 0) return [{ use: none(), overflow: 0 }];
  const avail = free(char, d), found: Page[] = [];
  const walk = (i: number, use: Record<RowName, number>) => {
    if (i === ROWS.length) {
      const used = ROWS.filter(r => use[r] > 0);
      if (!used.length) return;
      const sum = total(use), smallest = Math.min(...used.map(r => SIZE[r]));
      if (sum >= left && sum - smallest < left) found.push({ use: { ...use }, overflow: 0 });
      return;
    }
    const row = ROWS[i]!;
    for (let n = 0; n <= avail[row]; n++) walk(i + 1, { ...use, [row]: n });
  };
  walk(0, none());
  if (!found.length) return [{ use: avail, overflow: left - total(avail) }];
  return found.sort((a, b) => total(a.use) - total(b.use) || slots(a.use) - slots(b.use));
}

/** Whether two pages use the same Slots and leave the same over. */
export function same(a: Page, b: Page): boolean {
  return a.overflow === b.overflow && ROWS.every(r => a.use[r] === b.use[r]);
}

// R312: a row is used in order: its named Slot waits for the attacker's name, then boxes are checked.
/** The character with the page's Slots used, and its overflow written in the Notes (R311). */
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
  const line = page.overflow > 0 ? `${OVERFLOW[kind]}: ${page.overflow} from ${by.name}'s Attack` : '';
  const notes = line ? (char.back.notes ? `${char.back.notes}\n${line}` : line) : char.back.notes;
  return { ...char, back: { ...char.back, notes, damage: { ...char.back.damage, [d]: column } } };
}
