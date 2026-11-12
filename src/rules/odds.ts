// CRC: crc-Odds.md | R79, R80, R81, R82, R84, R85, R90
// The numbers before the dice: Total Influence, the opponent's total, the Difference row, and the
// Success Bonus (Hollow Folks IV). Pure.

import type { Pools } from './pool.ts';

/** A row of the Difference table. */
export type Row = {
  key: string; words: string; min: number; die: 'G' | 'R' | null; mod: -1 | 0 | 1;
  auto: 'success' | 'failure' | null;
};

// R90: +10 or more Outclass … −10 or less Outclassed; `min` is each row's lowest Difference.
export const ADV: readonly Row[] = [
  { key: 'outclass', words: 'Outclass', min: 10, die: null, mod: 0, auto: 'success' },
  { key: 'green+1', words: 'Strong Advantage', min: 7, die: 'G', mod: 1, auto: null },
  { key: 'green', words: 'Advantage', min: 5, die: 'G', mod: 0, auto: null },
  { key: '+1', words: 'Weak Advantage', min: 3, die: null, mod: 1, auto: null },
  { key: 'white', words: 'No Advantage', min: -2, die: null, mod: 0, auto: null },
  { key: '-1', words: 'Weak Disadvantage', min: -4, die: null, mod: -1, auto: null },
  { key: 'red', words: 'Disadvantage', min: -6, die: 'R', mod: 0, auto: null },
  { key: 'red-1', words: 'Strong Disadvantage', min: -9, die: 'R', mod: -1, auto: null },
  { key: 'outclassed', words: 'Outclassed', min: -Infinity, die: null, mod: 0, auto: 'failure' },
];

/** The ADV row for a Difference. */
export function row(difference: number): Row {
  return ADV.find(r => difference >= r.min)!;
}

export type Total = { total: number; parts: Record<string, number> };

const sum = (parts: Record<string, number>): Total =>
  ({ total: Object.values(parts).reduce((a, b) => a + b, 0), parts });

// R79: Base + Main + Edge + Bias + Affliction + Injury; Stagger and Bonus don't count.
export function total(base: number, p: Pools): Total {
  return sum({ base, main: p.main, edge: p.edge, bias: p.bias, affliction: p.affliction, injury: p.injury });
}

// R84: as the opposition, Stagger counts too.
export function opposition(defend: number, p: Pools): Total {
  return sum({ defend, main: p.main, edge: p.edge, bias: p.bias, affliction: p.affliction, injury: p.injury, stagger: p.stagger });
}

export type Dice = { yellows: number; bonus: number };

// R80, R81, R82: the action as written until the Bonus pool adds; then a Yellow per 3 full points
// and the rest added, a negative adding no dice; the hand adjustment on top.
/** The Yellows and bonus for an action, given the Bonus pool's value and the hand adjustment. */
export function bonus(action: Dice, bonusPool: number, hand: Dice = { yellows: 0, bonus: 0 }): Dice {
  let { yellows, bonus: b } = action;
  if (bonusPool !== 0) {
    const t = b + bonusPool;
    if (t >= 0) { yellows += Math.floor(t / 3); b = t % 3; } else b = t;
  }
  return { yellows: Math.max(0, yellows + hand.yellows), bonus: b + hand.bonus };
}
