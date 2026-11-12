# Influence
**Requirements:** R36, R40, R42, R43, R61, R269, R264, R265

Levels and points, and what a click or shift-click does to one chip or card (Hollow Folks,
*Tracking Influence* and *Absorbing Damage* for the Damage slots). Pure.

## Knows
- LEVELS: Minor (Min) 2, Significant (Sig) 4, Major (Maj) 6, Extreme (Ext) 8, Exquisite (Exq) 10
  points, and beyond with no ceiling.
- Damage slots (Bias, Affliction, Injury): Mild and Min are 1 Level, Sig 2, Maj 3.
- ROOM (Hollow Folks, *Absorbing Damage*), by Con or Wis Level, each row from that Level up: 1 Min +1;
  3 Min +2; 5 Min +2, absorb 1; 7 Min +2, Sig +1, absorb 1; 9 Mild +1, Min +2, Sig +1, absorb 1;
  10 the same, absorb 2; 11 Mild +2, Min +2, Sig +1, absorb 2; 15 Mild +2, Min +2, Sig +2, absorb 3.
  The book's negative rows ("worth only 1") are open; below 1, nothing extra.

## Does
- room(level): `{boxes: {mild, min, sig, maj}, absorb}` for a Con or Wis Level, from ROOM.
- columnRoom(character, damage): room for the column's attribute (Wis for Biases and Afflictions,
  Con for Injuries) read from the front's `<att>` marks (MarkReader.attributes), or null when the
  card has no such attribute marked (R264, R265).
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
