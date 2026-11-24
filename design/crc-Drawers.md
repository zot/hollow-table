# Drawers
**Requirements:** R519, R521, R523-525, R527, R546, R547, R549-551, R556

The desk's drawers, pure: which drawer a piece files in, filing it, and taking it out again. Like
Yards, but each page's own (`desk`, Records.isLocal) and never shared.

## Knows
- Drawer: `characters | npcs | papers`.
- DRAWERS(gm): the GM's `characters`, `npcs`, `papers`; a player's `papers` alone (R521).

## Does
- drawerOf(piece, gm) (R521): a character the GM owns, `npcs`, and any other character (a player's, an
  open one) `characters`, on the GM's page only; a sticky, loose text or image `papers`; anything else
  null (not filed, R522).
- filed(desk, drawer, records, name) (R523): the desk with a new entry at the end of its drawer: the
  name (Yards.graveName) and the records a burial would take (Yards.burialOf), as they were.
- takeOut(desk, drawer, k) (R527): the desk without that entry, and its records as filed.
- inDrawer(desk, drawer): the entries of one drawer, oldest first, with their index in the desk.
- search(desk, query) (R546, R547, R549): the entries matching every word of the query, case aside, in
  their name or in the words on their records (wordsOf), name matches first, each group by name; with
  no words, every entry by name.
- wordsOf(record) (R546): the plain words on a filed record: a sticky's or loose text's text, a
  character's front, back notes and Info cards, a docket's name; marks left out.
- desksOf(record) (R550): the desks of a `desk` record, reading one from before (a single list) as one
  nameless "Desk 1"; none, one empty "Desk 1".
- filed(desks, at, drawer, records, name) and takeOut(desks, at, k) (R523, R527): as before, in desk `at`.
- deskNext, deskPrev, deskRename (R551): as Yards' next, prev and rename, for desks: a new one "Desk N"
  one past the highest, an empty nameless one swept when left, the only one kept.
- search(desks, query) (R546, R556): every desk's entries, each with its desk's index.

## Collaborators
- Records: the `desk` record and its pieces.
- Yards: burialOf and graveName name and gather what a filing takes.

## Sequences
- none
