# Dice
**Requirements:** R89, R91, R92, R93, R94, R95, R96

A Hollow roll, by the book (Hollow Folks IV). Pure, with the random source passed in so tests can
fix it.

## Knows
- d6(rng): 1 to 6.

## Does
- roll(row, yellows, bonus, rng): White, then Green or Red if the row has one; resolution (higher
  with Green, lower with Red, then the row's ±1; 1–2 Failure, 3 at a cost, 4+ Success; automatic
  rows decide alone); Blue and Yellows; on a Failure the Yellows are removed; every 6 on the Blue or
  a remaining Yellow adds a Yellow, chaining; the result is their sum plus the bonus on a Success,
  never below zero; the Level named from the result.
- crit(white, blue): White 6 with Blue 5 or 6. A CRIT is a Success whatever the row (so its Yellows
  are kept), and carries both `max` (every Result and Bonus die at 6, plus the bonus) and `dbl`
  (twice the result), choosing the larger.
- levelName(result): Minor from 1, Significant from 5, Major from 10, Extreme from 15, Exquisite
  from 20.

## Collaborators
- Odds: the row.

## Sequences
- none
