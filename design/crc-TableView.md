# TableView
**Requirements:** R2, R15-17, R128, R215, R220, R226, R241, R269-273

The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
DOM a view of the records.

## Knows
- world: the transformed layer pieces live in; view `{x, y, zoom}` from the Seat, or none on a first visit.
- ZOOM_MIN 0.25, ZOOM_MAX 2.5, ZOOM_RATE 0.0012 a wheel unit (R270).
- views: rid → its PieceView or PoolView element.

## Does
- render(changed): on Game changes, makes, updates or removes the view of each changed rid; nothing
  else is touched.
- lift(key, el, at) / place(key, at) / letGo(key) (R220): the hand, for anything held, this page's
  or another's (Hands): key is the rid, or `rid#pool` for a pool. The piece is put in the world
  layer at `at`, squared up and raised (`lifted`); every layer skips it while held, so a redraw
  neither recreates nor moves it (a pool's contents are still drawn, at the held place). letGo puts a
  chip or card back in the loose layer if it was loose, and removes it if it was a hand's own;
  paper, cards and pools stay theirs, drawn again where their record says. Only a deletion takes a
  piece from the hand. A chip in the world layer is placed absolutely, like any piece.
- handFor(rid): the element drawing a chip or card (in a slot, a drawer or loose), or a new one
  shaped as a loose one for a piece drawn only in a pile.
- after: run at the end of every redraw (Hands draws its reactions again).
- push (R241): on the GM's page, when a pool's mat grows (not counting the docked roll row, which is
  this page's alone), the pieces it now covers (other characters'
  cards with what's pinned to them, unpinned paper, other pools with their gathered cards) move
  just clear below it in one change (pushClear); they glide on every page. One pass, no chains.
- glide (R226): a piece whose place changes in a redraw slides there (another page's carry slides
  in Hands instead, R298): `glide`, taken off at
  `transitionend`, unless the change was made inside still(fn): what this page let go itself
  never slides.
- pan (drag on empty table) and zoom (wheel, about the pointer, R270); saved to the Seat only. The view
  is placed at most once a frame (Gesture.paced), and a zoom saved once a frame too, not per tick.
- fit (R271): with no view in the Seat, the first render that draws anything fits it all: fitView
  takes the pieces' box in world coordinates and the table's size and gives the view (centred, zoom
  at most 1, a 20 px margin each side and 14 px from the top), which is kept in the Seat. Never on
  resize.
- images (R272): image files dropped on the table go to addImage with the world point, each a step
  of 24 further; the page stores the bytes (BlobStore.add) and puts the Image record.
- pins (R273): a pinned piece is drawn at least one above its card (pinnedZ) and marked `pinned`;
  while its card holds the caret its pinned pieces are raised over it (`atop`), and while carried
  they stay over it (`pinned` with `lifted`).
- passThrough: a press on a pool's empty space beside its name pans as if on the table.
- order: z from the records; peeking (an open used pile, an open pile) raises with a seat-only
  class, never by changing z.
- toWorld(clientX, clientY): screen to table coordinates, for drops.
- element(rid): the element drawing a piece, for Drag; pool(rid), loose(rid) and pools() for a
  character's mat and for chips or taps lying loose on the table. A loose card's Level is a button
  that answers clicks as in a drawer (R269: actions.cardClick; shift-click at Min deletes it), and
  a loose chip answers click and shift-click as in a slot (R40: actions.chipClick).
- gathered: a gathered card is drawn GATHER_GAP (14 px) under its pool's drawer, following the
  drawer as it grows (a ResizeObserver); the same on every page, since it's derived, not stored.
- A chip or card changing redraws the pools (it may have moved between two).

## Collaborators
- Game, Seat, PieceView, PoolView, Drag

## Sequences
- seq-save.md
