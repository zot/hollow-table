# Absorb
**Requirements:** R309, R310, R312, R315, R338, R339-341

Taking an Attack into a Damage column, by Hollow Folks' *Absorbing Damage* and Bill's rulings of
2026-11-13 (`carves/done/damage.md`, Item 4). Pure (`src/rules/absorb.ts`).

## Knows
- SIZE: what a Slot absorbs: Mild 2, Min 2, Sig 4, Maj 6.
- COLUMN_OF: the Attack's kind to its column: physical → injury, mental → bias, psych → affliction.
- OVERFLOW: each column to what its overflow makes, the words the card and receipts use: Conviction
  (bias), Burden (affliction), Condition (injury).
- isLasting(d) (R341): whether a column keeps its overflow as a Lasting: bias and affliction.
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
  fewest Slots; when none covers, the one page uses every free Slot and carries the overflow (R339).
- fill(char, kind, page, by): the character with the page's Slots used, row by row in order: a named
  Slot waits for a name (`naming: {by, id}`, R312), a box is checked. The overflow, if any (R339):
  a mental or psychological one adds its points to the column's Lasting, or starts one with no name
  waiting for the attacker's (`naming: {by, id}`); a physical one is a line added to the Notes,
  `Condition: 3 from Beauford's Attack`.
- lastingLevels(points) (R341): Hollow Folks, *Convictions and Burdens*: 1 (Min) to 2 points, 2 (Sig)
  to 6, 3 (Maj) to 12, 4 (Ext) to 20, 5 (Exq) beyond; 0 at 0 points. lastingTop(points): the points
  that fill its Level (2, 6, 12, 20, 30), what *Sig (5/6)* shows after the slash.
- mildEnds(char) (R338): the character with every Mild slot emptied at End, in all three columns:
  no name, its boxes unchecked (their number kept), nothing spent, no name waited for.
- waitsIn(char, d, row) (R340): what a name for `row` goes into, a row's named Slot or, for row
  `lasting`, the column's Conviction or Burden.
- same(a, b): whether two pages use the same Slots (the GM's page checks a take against its own
  pages).

## Collaborators
- Influence: columnRoom, for absorb and the box count
- Records

## Sequences
- seq-take.md
