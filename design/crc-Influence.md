# Influence
**Requirements:** R36, R40, R42, R43, R51, R61

Levels and points, and what a click or shift-click does to one chip or card (Hollow Folks,
*Tracking Influence* and *Absorbing Damage* for the Damage slots). Pure.

## Knows
- LEVELS: Minor (Min) 2, Significant (Sig) 4, Major (Maj) 6, Extreme (Ext) 8, Exquisite (Exq) 10
  points, and beyond with no ceiling.
- Damage slots (Bias, Affliction, Injury): Mild and Min are 1 Level, Sig 2, Maj 3.

## Does
- raiseChip(chip): a +1 becomes 2; otherwise +2 points.
- lowerChip(chip): a 2 becomes a +1; a +1 is removed; otherwise −2 points.
- rider(chip, shift): a click on a rider does nothing; shift-click removes it.
- raiseCard(card) / lowerCard(card): ±2 points; a card never drops below Min.
- levelName(points): Min, Sig, Maj, Ext, Exq for Influences.
- rowLevels(level): the Levels a Damage slot (or one of its boxes) is worth.

## Collaborators
- none

## Sequences
- none
