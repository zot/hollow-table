# Pool
**Requirements:** R39, R366, R367, R46, R65, R79, R84, R211, R260, R379

What a slot's contents amount to. Pure: given the chips and Influence cards in one slot, it orders
them, finds Roll Ups, and says what the slot is worth.

## Knows
- An item: a chip or an Influence card, with sign, points and (for a chip) rider.

## Does
- order(items): positives from the top, negatives from the bottom, each strongest nearest the edge.
- rollUp(items) (R366, R367): three of one value and sign roll up into the next Level, chaining, as a
  `pile`: the three stay as they are, acting as one of the next value, chips and cards alike, never
  merged. The same items always give the same piles. A chip with a rider counts at face value, its
  rider not counted in the pile; loose +1s never roll up. Returns the slot's units: piles and the
  items left over.
- value(items): best positive minus worst negative, after Roll Up. Plain chips and cards alike.
- pools(character): the value of each of its slots, for Odds.
- accepts(slot, item): whether an item may go into a slot (Hollow Folks, *Damage Resources*). A card of a Damage kind goes only into
  its kind's slot, a `mot` card only into Main (R260); everything else goes anywhere.

## Collaborators
- Influence: points and Levels.

## Sequences
- none
