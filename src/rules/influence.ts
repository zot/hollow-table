// CRC: crc-Influence.md | R36
// Levels and points, and what a click or shift-click does to one chip or card. Pure: each returns
// the new record, or null when a click removes it.

import type { Chip, Influence, RowName } from '../model/records.ts';

/** Influence Levels and their points (Hollow Folks V), with no ceiling beyond Exquisite. */
export const LEVELS = [
  { word: 'Min', name: 'Minor', points: 2 },
  { word: 'Sig', name: 'Significant', points: 4 },
  { word: 'Maj', name: 'Major', points: 6 },
  { word: 'Ext', name: 'Extreme', points: 8 },
  { word: 'Exq', name: 'Exquisite', points: 10 },
] as const;
export const MIN = 2;
export const STEP = 2;

// R40, R42: a +1 becomes 2; otherwise +2 points.
export function raiseChip(chip: Chip): Chip {
  return { ...chip, points: chip.points === 1 ? 2 : chip.points + STEP };
}

// R40, R42: a 2 becomes a +1, a +1 is removed, otherwise −2 points. A rider goes with the point it rode.
export function lowerChip(chip: Chip): Chip | null {
  if (chip.points <= 1) return null;
  if (chip.points === 2) return { ...chip, points: 1, rider: false };
  return { ...chip, points: chip.points - STEP };
}

// R43: a click on a rider does nothing; shift-click removes it.
export function rider(chip: Chip, shift: boolean): Chip {
  return shift ? { ...chip, rider: false } : chip;
}

// R51: ±2 points; a card never drops below Min.
export function raiseCard(card: Influence): Influence {
  return { ...card, points: card.points + STEP };
}
export function lowerCard(card: Influence): Influence {
  return { ...card, points: Math.max(MIN, card.points - STEP) };
}

/** The Level word for an Influence's points: Min, Sig, Maj, Ext, Exq, then the points beyond. */
export function levelName(points: number): string {
  if (points < MIN) return String(points);
  return LEVELS[Math.floor(points / STEP) - 1]?.word ?? String(points);
}

// R61: Bias, Affliction and Injury slots are worth Mild and Min 1 Level, Sig 2, Maj 3.
export const ROW_LEVELS: Record<RowName, number> = { mild: 1, min: 1, sig: 2, maj: 3 };
export function rowLevels(row: RowName): number {
  return ROW_LEVELS[row];
}
