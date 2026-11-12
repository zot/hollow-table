# TableView
**Requirements:** R2, R15-17, R128, R215, R220, R226

The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
DOM a view of the records.

## Knows
- world: the transformed layer pieces live in; view `{x, y, z}` from the Seat.
- views: rid → its PieceView or PoolView element.

## Does
- render(changed): on Game changes, makes, updates or removes the view of each changed rid; nothing
  else is touched.
- lift(rid, el, at) / letGo(rid) (R220): the hand. A held chip or card is moved into the world layer
  at `at`, squared up and raised (`lifted`); pools and the loose layer skip it while held, so a
  redraw neither recreates nor moves it. letGo puts it back in the loose layer if it was loose, and
  removes it otherwise, before the drop's change draws it where it landed.
- glide (R226, R178): a piece whose place changes in a redraw slides there (`glide`, taken off at
  `transitionend`), unless the change was made inside still(fn): what this page let go itself
  never slides.
- pan (drag on empty table) and zoom (wheel, about the pointer); saved to the Seat only. The view
  is placed at most once a frame (Gesture.paced), and a zoom saved once a frame too, not per tick.
- passThrough: a press on a pool's empty space beside its name pans as if on the table.
- order: z from the records; peeking (an open used pile, an open pile) raises with a seat-only
  class, never by changing z.
- toWorld(clientX, clientY): screen to table coordinates, for drops.
- element(rid): the element drawing a piece, for Drag; pool(rid), loose(rid) and pools() for a
  character's mat and for chips or taps lying loose on the table.
- gathered: a gathered card is drawn GATHER_GAP (14 px) under its pool's drawer, following the
  drawer as it grows (a ResizeObserver); the same on every page, since it's derived, not stored.
- A chip or card changing redraws the pools (it may have moved between two).

## Collaborators
- Game, Seat, PieceView, PoolView, Drag

## Sequences
- seq-save.md
