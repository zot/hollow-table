# Yards
**Requirements:** R119-125, R290, R403-405, R428, R487-489, R500, R544, R589

Boot Hill's rules, pure: graveyards, burials, numbering and deleting forever.

## Does
- putAway(piece, all) (R488, R500): the piece's burial (burialOf) split into the table's share and this
  page's own (torn rolls, `mine` paper); Drag buries the own share in the Hill, each alone, and makes
  no Boot Hill burial when the table's share is empty.
- graveName(piece) (R290): the pool's name (or "Nameless"); "Note: " or "Writing: " and the first line, 28
  characters at most; "Tape: N rolls, last <title>"; else "Image".
- bury(yards, cur, records, name): adds a burial to the current graveyard. A character is buried
  with its card, its Influence cards and what's pinned to it.
- burialOf(piece, all): the records a piece is buried with: for a character, its Influence cards,
  the chips and cards in its pool's slots, and what's pinned to it (R119).
- Every move below returns the yards and the graveyard now browsed (`cur`, a seat setting), and
  removes an empty, nameless graveyard when it is left, emptied, or its name erased; the only one is
  always kept.
- exhume(yards, cur, at): removes a burial and returns its records, or the Info card it holds (R405).
- An Info card's burial (R403): `{name, records: [], info: {oid, k, text}}`, its NPC, its place among
  the NPC's cards and its words. buryInfo(yards, cur, name, info) adds one, named "<name>: Info card".
  withInfo(c, info): the character with the card back at its place (or last, if fewer remain), and
  the place it took. lastCard(yards, cur, here) (R404, R428): the newest GM card's burial (an Info card or a record) in the
  current graveyard that `here` can bring back, or none.
- buryRecord(yards, cur, name, record, gm) (R428): a burial `{name: "<holder>: Opinion of <name>",
  records: [record], gm}`, found by lastCard like an Info card.
- raised(records, at, z): a burial placed to come up under the pointer: its lead (a character by its
  pool) grabbed 30, 14 in (20, 14 for anything else), everything with it moved by the same offset,
  all at height z (R120).
- next(yards, cur): › on the last graveyard makes "Graveyard N+1" (N the highest in use) only if
  this one has something or a name of its own. prev(yards, cur): ‹.
- rename(yards, cur, name): an erased name makes it nameless.
- forget(yards, cur, at) / forgetAll(yards, cur): deleting forever, after the two-shift-click arming
  (BootHillView).
- This page's own burials (R488, R489), in Hill: buryOwn(hill, yard, records, name) adds one under the
  graveyard's name; ownIn(hill, yards, cur): the indices of those shown in graveyard `cur`, its name's,
  and in the first graveyard those whose name no graveyard has; exhumeOwn(hill, k) and forgetOwn(hill,
  k) take one out; forgetOwnIn(hill, yards, cur): forgetAll's part for this page's own.
- ownTorn(all, yards, hill) (R487): the GM's page's own of what was shared: each `o:` torn roll moved
  to `t:`, and each burial in `yards` holding only torn rolls moved into Hill with its graveyard's name.
  ownedTorn(records): the same made on a checkpoint's records, before GameStore.restore loads them.
- burialOf a docket (R544, R589): the docket, the paper pinned to it, and each character in it with its
  own burialOf; graveName "Docket: " and its name.

## Collaborators
- Records

## Sequences
- none (pure)
