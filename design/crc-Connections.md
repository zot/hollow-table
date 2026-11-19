# Connections
**Requirements:** R407-430, R434, R436-438

The Connection Table: its rules, pure (`src/rules/connections.ts`), and its sheet and the group
chooser on the GM's page (`src/ui/connections.ts`).

## Knows
- Connections (crc-Records.md): a piece, `{kind: 'connections', oid, place, away?, rows, cells}`.
  A row is `{id, name, oid?, group?}`: an NPC's, linked by `oid` to its card once it has one, or a
  group's. `cells` holds the Levels set, keyed `<row id>><column id>`, -5 to 5; a cell not there is 0.
  `away` is put away (R409): kept, not drawn.
- Opinion (crc-Records.md): an Opinion Record, a piece with no place, `{kind: 'opinion', oid, holder,
  of, text}`: `holder` the row of the NPC or group it belongs to, `of` the row or PC it is of, `text`
  the GM's Opinions, a line each (R419, R426); `shown`, `on` and `name` once revealed (R436).

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
- connection(text) (R420, R434): the best positive fixed Level less the worst negative, by each line's
  first Level word (or a lone 0) outside parentheses; a line without one counts for nothing, and a
  tapped Opinion's adjusted value in parentheses is never read.
- skills(front) (R425): the card's Skills by name (a `Skills N:` line's at N, a Skill under a Field at
  the Field's Level unless it gives its own), names without ✓, †, a trailing Level or parentheses.
- respect(npc, pc) (R425): "Professional Respect (<common Skills>) <Level>", 1 Level plus 2 when the PC
  has 2 in any, or none; respected(text, pc) works the Level out again from the Skills left on the line,
  and drops the line when none are.
- rowOf(table, c) (R426): a card's row: its group's when it has a group, else its own.
- first(table, records, holder, of, npc, pc?) (R423, R424, R425): a new record's text: "Opinion <Level>"
  at the holder's cell for an NPC or group; for a PC, Reputation (the strongest nonzero cell among the
  holder's characters with a record of the PC; ties to the strongest Connection, then the positive one;
  inverted when the cell is negative) or "Reaction ?", then Professional Respect.
- synced(table, record) (R421, R428): the table with the record's Connection in its cell, kept even
  when 0, so a PC's cell shows it.
- reactionOf(d6) (R430): the book's Default Reaction, 1 -Sig, 2 -Min, 3-4 0, 5 +Min, 6 +Sig, as a Level
  number; awaits(text): whether a record has a "Reaction ?" line; reacted(text, n): the first such line
  written "Reaction <Level>".
- recordOf(records, t, npc, pc) (R429, R430): the record the NPC's row (its group's) holds of the PC.
- opinionItems(rec) (R436): what the eye can reveal of a record: each line with words, whole, keyed
  `o<record oid>:<line>`, in the Opinions category; revealed(rec) its `shown` lines as those keys.
- published(t, chars, rec) (R436, R437): the record as its revealed lines go out: no `on` or `name`
  when nothing is shown; else `on` the GM cards in its row (its own card, or every member's card for a
  group's), by oid, and `name` the name of what it is of (nameOf).
- recordsOn(records, c, t?) (R419, R426, R438): the records a card shows: with the table, its row's;
  without it, on a player's page, those whose `on` holds the card.
- the menu's candidates (R422): the PCs with no record from the holder, by name, then the other rows
  with none, by name.
- seed (R418): *Connections in Unton* from *A Ghoulish Problem*: eight rows, Devreux linked to the
  playtest's card, and the book's Levels.
- the sheet (R407, R411, R416, R417): a ruled sheet: a header row of names, then a row per row name,
  an X where a row meets itself, each cell its Level; a thick line, then a column for each PC (a
  player's character), by name, each cell a record's Connection, blank where none has been (R421). A row's name
  is written in place; on leaving it, rename. Clicking a cell opens the Levels, -Exq to +Exq; picking
  one sets it.
- the group chooser (R414): on the GM's page, `(` typed in a GM card's first line opens a list of
  the game's groups under the caret; typing narrows it, and Enter or a click writes the group, or the
  typed name when none matches, and closes the `)`. Escape leaves the `(` as typed.
- the publisher (R437): on the GM's page, whenever the game changes, each revealed record whose `on`
  or `name` published() would change is written again, in one change.
- the keeper (R412, R415): on the GM's page, whenever a GM card's name or group changes from what was
  last seen, keep its row. A card first seen (a load, a dig-up) is only remembered, so a row the GM
  cleared stays cleared until its card is renamed. Taking the table from the supply keeps a row for
  every named GM card.

## Collaborators
- Records, Visibility, PieceView, Bar, Drag, MarkedText

## Sequences
- seq-drag.md
