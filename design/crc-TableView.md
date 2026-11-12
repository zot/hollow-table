# TableView
**Requirements:** R2, R15, R16, R17, R128

The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
DOM a view of the records.

## Knows
- world: the transformed layer pieces live in; view `{x, y, z}` from the Seat.
- views: rid → its PieceView or PoolView element.

## Does
- render(changed): on Game changes, makes, updates or removes the view of each changed rid; nothing
  else is touched.
- pan (drag on empty table) and zoom (wheel, about the pointer); saved to the Seat only.
- passThrough: a press on a pool's empty space beside its name pans as if on the table.
- order: z from the records; peeking (an open used pile, an open pile) raises with a seat-only
  class, never by changing z.
- toWorld(clientX, clientY): screen to table coordinates, for drops.
- element(rid): the element drawing a piece, for Drag.

## Collaborators
- Game, Seat, PieceView, PoolView, Drag

## Sequences
- seq-save.md
