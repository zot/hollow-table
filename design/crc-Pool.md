# Pool
**Requirements:** R39, R44, R45, R46, R52, R65, R79, R84, R211

What a slot's contents amount to. Pure: given the chips and Influence cards in one slot, it orders
them, finds Roll Ups, and says what the slot is worth.

## Knows
- An item: a chip or an Influence card, with sign, points and (for a chip) rider.

## Does
- order(items): positives from the top, negatives from the bottom, each strongest nearest the edge.
- rollUp(items, mint): three of one value and sign roll up into the next Level, chaining. Returns a plan:
  for three chips, `merge` (delete three, add one chip of the next value, its riders spent); if any
  card is among the three, a `pile` (the three stay, acting as one of the next value). A chip with
  a rider counts at face value; loose +1s never roll up. `mint` names the chips a merge makes.
- value(items): best positive minus worst negative, after Roll Up. Plain chips and cards alike.
- pools(character): the value of each of its slots, for Odds.
- accepts(slot, item): whether an item may go into a slot (Hollow Folks, *Damage Resources*). A card of a Damage kind goes only into
  its kind's slot; everything else goes anywhere.

## Collaborators
- Influence: points and Levels.

## Sequences
- none
