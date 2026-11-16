// CRC: crc-Pool.md | R39, R366, R367, R46, R65, R79, R84, R211, R260
// What a slot's contents amount to. Pure: given the chips and Influence cards in one slot, it
// orders them, finds Roll Ups, and says what the slot is worth.

import { SLOTS, type Chip, type Influence, type Oid, type Sign, type SlotName } from '../model/records.ts';
import { STEP } from './influence.ts';

export type Item = Chip | Influence;

/** What an item counts for: its points, plus a riding +1. */
export function worth(i: Item): number {
  return i.points + (i.kind === 'chip' && i.rider ? 1 : 0);
}

// R39: positives from the top, negatives from the bottom, each strongest nearest the edge.
/** Each sign's items, strongest first (nearest its edge, drawn on top). */
export function order(items: Item[]): { pos: Item[]; neg: Item[] } {
  const by = (s: Sign) => items.filter(i => i.sign === s).sort((a, b) => worth(b) - worth(a));
  return { pos: by(1), neg: by(-1) };
}

/** Three chips or cards acting as one of the next value; each member kept as it is (R366). */
export type Pile = { sign: Sign; points: number; members: Unit[] };
export type Unit = Item | Pile;
const isPile = (u: Unit): u is Pile => 'members' in u;
const unitWorth = (u: Unit) => isPile(u) ? u.points : worth(u);

// R366, R367, R46, R65: three of one value and sign roll up into the next Level, chaining, as a pile.
/**
 * Three chips or cards of one value act as one of the next value: a pile, its members kept as they
 * are, never merged (R366). A chip with a rider counts at face value, its rider not counted in the
 * pile (R367); loose +1s never roll up. The same items always give the same piles: riderless chips
 * first, so a rider stays counted where it can, then chips before cards, then by oid.
 */
export function rollUp(items: Item[]): Unit[] {
  const units: Unit[] = [];
  const key = (u: Unit) => isPile(u) ? [2, 0, ''] as const : [u.kind === 'chip' && u.rider ? 1 : 0, u.kind === 'chip' ? 0 : 1, u.oid] as const;
  const before = (a: Unit, b: Unit) => {
    const [x, y] = [key(a), key(b)];
    return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
  };
  for (const sign of [1, -1] as const) {
    let side: Unit[] = items.filter(i => i.sign === sign && i.points >= STEP);
    for (;;) {
      const counts = new Map<number, Unit[]>();
      for (const u of side) counts.set(u.points, [...(counts.get(u.points) ?? []), u]);
      const v = [...counts.keys()].sort((a, b) => a - b).find(k => counts.get(k)!.length >= 3);
      if (v === undefined) break;
      const three = [...counts.get(v)!].sort(before).slice(0, 3);
      side = [...side.filter(u => !three.includes(u)), { sign, points: v + STEP, members: three }];
    }
    units.push(...side, ...items.filter(i => i.sign === sign && i.points < STEP));
  }
  return units;
}

// R79, R84: best positive minus worst negative, after Roll Up.
/** What a slot is worth: its strongest positive minus its strongest negative. */
export function value(items: Item[]): number {
  const units = rollUp(items);
  const best = (s: Sign) => Math.max(0, ...units.filter(u => u.sign === s).map(unitWorth));
  return best(1) - best(-1);
}

export type Pools = Record<SlotName, number>;

/** The value of each of a character's slots, for Odds. */
export function pools(character: Oid, items: Item[]): Pools {
  const inSlot = (name: SlotName) => items.filter(i =>
    typeof i.where === 'object' && 'slot' in i.where && i.where.slot === character && i.where.name === name);
  return Object.fromEntries(SLOTS.map(s => [s, value(inSlot(s))])) as Pools;
}

// R211: a card tapped from a Damage Resource goes only into its kind's slot (Hollow Folks, *Damage
// Resources*); R260: one tapped from a Motivation only into Main (Bunkum); everything else anywhere.
/** Whether an item may go into a slot. */
export function accepts(slot: SlotName, item: Item): boolean {
  if (item.kind !== 'influence') return true;
  if (item.damage) return item.damage === slot;
  return !item.mot || slot === 'main';
}
