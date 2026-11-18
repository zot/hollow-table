# Connections
**Requirements:** R407-418

The Connection Table: its rules, pure (`src/rules/connections.ts`), and its sheet and the group
chooser on the GM's page (`src/ui/connections.ts`).

## Knows
- Connections (crc-Records.md): a piece, `{kind: 'connections', oid, place, away?, rows, cells}`.
  A row is `{id, name, oid?, group?}`: an NPC's, linked by `oid` to its card once it has one, or a
  group's. `cells` holds the Levels set, keyed `<row id>><column id>`, -5 to 5; a cell not there is 0.
  `away` is put away (R409): kept, not drawn.

## Does
- level(n) (R411): "+Min", "-Sig", "+Maj", "-Ext", "+Exq" for 1 to 5 either way, "0" for none.
- groupOf(front) (R413): the words in parentheses on the card's first line, marks left out, trimmed;
  none when there are none.
- named(c): a GM card given a name, not the supply's "Name" (R412).
- keep(table, c, id) (R412, R413, R415): the table with a row for a named GM card: its group's row
  when it has a group (made when there is none, with `id`); otherwise its own, found by oid, else a
  row of its name with no card, which it takes; else made. A found row takes the card's name.
- rename(table, id, name, chars) (R412, R415): the table and the characters it changes. A name cleared
  removes the row and every cell in its row and column. A group's row renames the group on its members'
  first lines; an NPC's row renames its card.
- set(table, row, col, n) (R411): one cell.
- order(rows) (R416): by name, alphabetical, ignoring case.
- seed (R418): *Connections in Unton* from *A Ghoulish Problem*: eight rows, Devreux linked to the
  playtest's card, and the book's Levels.
- the sheet (R407, R411, R416, R417): a ruled sheet: a header row of names, then a row per row name,
  an X where a row meets itself, each cell its Level; a thick line, then a column for each PC (a
  player's character), by name, empty (Opinion Records fill them, infer reveals Item 3). A row's name
  is written in place; on leaving it, rename. Clicking a cell opens the Levels, -Exq to +Exq; picking
  one sets it.
- the group chooser (R414): on the GM's page, `(` typed in a GM card's first line opens a list of
  the game's groups under the caret; typing narrows it, and Enter or a click writes the group, or the
  typed name when none matches, and closes the `)`. Escape leaves the `(` as typed.
- the keeper (R412, R415): on the GM's page, whenever a GM card's name or group changes from what was
  last seen, keep its row. A card first seen (a load, a dig-up) is only remembered, so a row the GM
  cleared stays cleared until its card is renamed. Taking the table from the supply keeps a row for
  every named GM card.

## Collaborators
- Records, Visibility, PieceView, Bar, Drag, MarkedText

## Sequences
- seq-drag.md
