# Yards
**Requirements:** R119, R121, R122, R123, R124, R125

Boot Hill's rules, pure: graveyards, burials, numbering and deleting forever.

## Does
- bury(yards, cur, records, name): adds a burial to the current graveyard. A character is buried
  with its card, its Influence cards and what's pinned to it.
- burialOf(piece, all): the records a piece is buried with.
- Every move below returns the yards and the graveyard now browsed (`cur`, a seat setting), and
  removes an empty, nameless graveyard when it is left, emptied, or its name erased; the only one is
  always kept.
- exhume(yards, cur, at): removes a burial and returns its records.
- next(yards, cur): › on the last graveyard makes "Graveyard N+1" (N the highest in use) only if
  this one has something or a name of its own. prev(yards, cur): ‹.
- rename(yards, cur, name): an erased name makes it nameless.
- forget(yards, cur, at) / forgetAll(yards, cur): deleting forever, after the two-shift-click arming
  (BootHillView).

## Collaborators
- Records

## Sequences
- none (pure)
