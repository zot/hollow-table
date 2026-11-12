// CRC: crc-Pool.md | R39, R44, R45, R46, R52, R65, R79, R84, R211
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

/** Three Influences acting as one of the next value; cards keep their names (R52). */
export type Pile = { sign: Sign; points: number; members: Unit[] };
export type Unit = Item | Pile;
const isPile = (u: Unit): u is Pile => 'members' in u;
const unitWorth = (u: Unit) => isPile(u) ? u.points : worth(u);

/** A Roll Up plan: chips to delete, chips to add, and the piles the rest form. */
export type Plan = { remove: Oid[]; add: Chip[]; units: Unit[] };

// R44, R45, R46, R52, R65: three of one value and sign roll up into the next Level, chaining.
/**
 * Three chips merge into one chip of the next value, their riders spent; if a card is among the
 * three they form a pile instead. A chip with a rider counts at face value; loose +1s never roll up.
 * `mint` names each chip a merge makes.
 */
export function rollUp(items: Item[], mint: () => Oid): Plan {
  const remove: Oid[] = [], add: Chip[] = [];
  const units: Unit[] = [];
  for (const sign of [1, -1] as const) {
    let side: Unit[] = items.filter(i => i.sign === sign && i.points >= STEP);
    for (;;) {
      const counts = new Map<number, Unit[]>();
      for (const u of side) counts.set(u.points, [...(counts.get(u.points) ?? []), u]);
      const v = [...counts.keys()].sort((a, b) => a - b).find(k => counts.get(k)!.length >= 3);
      if (v === undefined) break;
      const group = counts.get(v)!;
      // Plain chips without riders go first, so a rider is spent only when it must be.
      const plain = group.filter((u): u is Chip => !isPile(u) && u.kind === 'chip')
        .sort((a, b) => Number(a.rider) - Number(b.rider));
      let three: Unit[], made: Unit;
      if (plain.length >= 3) {
        const chips = plain.slice(0, 3), first = chips[0]!;
        const chip: Chip = { kind: 'chip', oid: mint(), where: first.where, n: first.n, sign, points: v + STEP, rider: false };
        for (const c of chips) {
          const k = add.indexOf(c);
          if (k >= 0) add.splice(k, 1); else remove.push(c.oid);
        }
        add.push(chip);
        three = chips;
        made = chip;
      } else {
        three = [...plain, ...group.filter(u => !plain.includes(u as Chip))].slice(0, 3);
        made = { sign, points: v + STEP, members: three };
      }
      side = [...side.filter(u => !three.includes(u)), made];
    }
    units.push(...side, ...items.filter(i => i.sign === sign && i.points < STEP));
  }
  return { remove, add, units };
}

// R79, R84: best positive minus worst negative, after Roll Up.
/** What a slot is worth: its strongest positive minus its strongest negative. */
export function value(items: Item[]): number {
  const { units } = rollUp(items, () => '');
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
// Resources*); everything else goes anywhere.
/** Whether an item may go into a slot. */
export function accepts(slot: SlotName, item: Item): boolean {
  return item.kind !== 'influence' || !item.damage || item.damage === slot;
}
