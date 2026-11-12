// CRC: crc-Dice.md | R89
// A Hollow roll, by the book (Hollow Folks IV). Pure, with the random source passed in so tests
// can fix it.

import type { Crit, Die } from '../model/records.ts';
import type { Row } from './odds.ts';

/** A source of numbers in [0, 1), like Math.random. */
export type Rng = () => number;

export function d6(rng: Rng): number {
  return 1 + Math.min(5, Math.floor(rng() * 6));
}

export type Outcome = 'failure' | 'cost' | 'success';
export type Roll = {
  dice: Die[]; resolved: number | null; outcome: Outcome; result: number; level: string; crit?: Crit;
};

const die = (c: Die['c'], v: number, added = false): Die => ({ c, v, added, dropped: false });

// R95: White 6 with Blue 5 or 6.
export function crit(white: number, blue: number): boolean {
  return white === 6 && blue >= 5;
}

// R94: Minor from 1, Significant from 5, Major from 10, Extreme from 15, Exquisite from 20.
const NAMES = [[20, 'Exquisite'], [15, 'Extreme'], [10, 'Major'], [5, 'Significant'], [1, 'Minor']] as const;
export function levelName(result: number): string {
  return NAMES.find(([from]) => result >= from)?.[1] ?? 'no noticeable effect';
}

// R91: Green takes the higher, Red the lower, then the row's ±1; 1–2 Failure, 3 at a cost, 4+ Success.
function resolve(row: Row, white: number, other: number | null): number | null {
  if (row.auto) return null;
  if (other === null) return white + row.mod;
  return (row.die === 'G' ? Math.max(white, other) : Math.min(white, other)) + row.mod;
}

function outcomeOf(row: Row, resolved: number | null, isCrit: boolean): Outcome {
  if (isCrit || row.auto === 'success') return 'success';
  if (row.auto === 'failure' || resolved === null || resolved <= 2) return 'failure';
  return resolved === 3 ? 'cost' : 'success';
}

// R89, R91, R92, R93, R94, R95, R96
/**
 * Rolls White (and Green or Red if the row has one), Blue and the Yellows, in that order. On a
 * Failure the Yellows are removed; every 6 on the Blue or a remaining Yellow adds a Yellow,
 * chaining. The result is their sum plus the bonus on a Success (even at cost), never below zero.
 * A CRIT is a Success whatever the row and takes the larger of maximize and double, both of which
 * include the bonus.
 */
export function roll(row: Row, yellows: number, bonus: number, rng: Rng): Roll {
  const white = d6(rng);
  const dice: Die[] = [die('W', white)];
  let other: number | null = null;
  if (row.die) {
    other = d6(rng);
    dice.push(die(row.die, other));
  }
  const blue = d6(rng);
  dice.push(die('B', blue));
  for (let i = 0; i < yellows; i++) dice.push(die('Y', d6(rng)));

  const isCrit = crit(white, blue);
  const resolved = resolve(row, white, other);
  const outcome = outcomeOf(row, resolved, isCrit);
  if (outcome === 'failure') for (const d of dice) if (d.c === 'Y') d.dropped = true;

  const result = dice.filter(d => d.c === 'B' || (d.c === 'Y' && !d.dropped));
  for (let i = 0; i < result.length; i++) {
    if (result[i]!.v === 6) {
      const y = die('Y', d6(rng), true);
      dice.push(y);
      result.push(y);
    }
  }
  const sum = result.reduce((a, d) => a + d.v, 0);
  const plain = Math.max(0, sum + (outcome === 'failure' ? 0 : bonus));
  if (!isCrit) return { dice, resolved, outcome, result: plain, level: levelName(plain) };

  const max = Math.max(0, result.length * 6 + bonus), dbl = plain * 2;
  const chosen = max >= dbl ? 'max' : 'dbl';
  const value = Math.max(max, dbl);
  return { dice, resolved, outcome, result: value, level: levelName(value), crit: { max, dbl, chosen, locked: false } };
}
