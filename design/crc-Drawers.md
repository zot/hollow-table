# Drawers
**Requirements:** R519, R521, R523-525, R527, R546, R547, R549

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

## Collaborators
- Records: the `desk` record and its pieces.
- Yards: burialOf and graveName name and gather what a filing takes.

## Sequences
- none
