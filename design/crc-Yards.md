# Yards
**Requirements:** R119, R120, R121, R122, R123, R124, R125, R290, R403-405

Boot Hill's rules, pure: graveyards, burials, numbering and deleting forever.

## Does
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
  the place it took. lastInfo(yards, cur, here) (R404): the newest Info burial in the current
  graveyard whose NPC `here` finds, or none.
- raised(records, at, z): a burial placed to come up under the pointer: its lead (a character by its
  pool) grabbed 30, 14 in (20, 14 for anything else), everything with it moved by the same offset,
  all at height z (R120).
- next(yards, cur): › on the last graveyard makes "Graveyard N+1" (N the highest in use) only if
  this one has something or a name of its own. prev(yards, cur): ‹.
- rename(yards, cur, name): an erased name makes it nameless.
- forget(yards, cur, at) / forgetAll(yards, cur): deleting forever, after the two-shift-click arming
  (BootHillView).

## Collaborators
- Records

## Sequences
- none (pure)
