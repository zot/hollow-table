# Odds
**Requirements:** R79, R80, R81, R82, R84, R85, R90

The numbers before the dice: Total Influence, the opponent's total, the Difference row, and the
Success Bonus. Pure.

## Knows
- ADV: the Difference table, nine rows from Outclass to Outclassed, each with its words, its die
  (Green, Red or none), its ±1, and whether it's automatic.

## Does
- total(base, pools): Base + Main + Edge + Bias + Affliction + Injury, with its breakdown.
- opposition(defend, pools): Defend + Main + Edge + Bias + Affliction + Injury + Stagger.
- row(difference): the ADV row for a Difference.
- bonus(action, bonusPool, hand): with an empty Bonus pool, the action's Yellows and bonus as
  written; otherwise the action's bonus points plus the pool's value regrouped to a Yellow per 3
  full points and the rest added (a negative adds no dice); then the hand adjustment on top.

## Collaborators
- Pool: slot values.

## Sequences
- none
