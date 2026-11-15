# Absorb
**Requirements:** R309-312, R315, R338

Taking an Attack into a Damage column, by Hollow Folks' *Absorbing Damage* and Bill's rulings of
2026-11-13 (`carves/damage.md`, Item 4). Pure (`src/rules/absorb.ts`).

## Knows
- SIZE: what a Slot absorbs: Mild 2, Min 2, Sig 4, Maj 6.
- COLUMN_OF: the Attack's kind to its column: physical → injury, mental → bias, psych → affliction.
- OVERFLOW: the kind to what its overflow makes: Condition, Conviction, Burden.
- A page: how many Slots of each row it uses (`Record<RowName, number>`), and the overflow (0 unless
  nothing covers).

## Does
- free(char, d): how many free Slots each row of a column has. A row's named Slot is free while it
  has no name and waits for none (R315); its boxes count as Influence.room (Con or Wis) gives, or as
  the card has them when unmarked, and any checked beyond that; a box is free while unchecked. A row
  is used in order: its named Slot first, then its boxes.
- pages(char, kind, result): the result less the column's absorb (Influence.columnRoom); nothing
  left is one empty page. Otherwise every count of free Slots per row whose sum covers what is left
  and whose sum less its smallest used Slot falls short (R310), each once, fewest points first, then
  fewest Slots; when none covers, the one page uses every free Slot and carries the overflow (R311).
- fill(char, kind, page, by): the character with the page's Slots used, row by row in order: a named
  Slot waits for a name (`naming: {by, id}`, R312), a box is checked. The overflow, if any, is a line
  added to the Notes: `Conviction: 3 from Beauford's Attack` (R311).
- mildEnds(char) (R338): the character with every Mild slot emptied at End, in all three columns:
  no name, its boxes unchecked (their number kept), nothing spent, no name waited for.
- same(a, b): whether two pages use the same Slots (the GM's page checks a take against its own
  pages).

## Collaborators
- Influence: columnRoom, for absorb and the box count
- Records

## Sequences
- seq-take.md
