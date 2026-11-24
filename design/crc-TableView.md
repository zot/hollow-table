# TableView
**Requirements:** R2, R15-17, R128, R215, R220, R226, R241, R269-273, R419, R421, R438, R451, R479-482, R486, R534, R535, R537, R539, R542, R543, R568, R571-573, R575, R576

The walnut surface and everything on it: renders pieces from Game, pans and zooms, and keeps the
DOM a view of the records.

## Knows
- world: the transformed layer pieces live in; view `{x, y, zoom}` from the Seat, or none on a first visit.
- ZOOM_MIN 0.25, ZOOM_MAX 2.5, ZOOM_RATE 0.0012 a wheel unit (R270).
- fingers: each pointer down on the table, pointerId → where it is on screen, and whether a piece took
  it (a carry or another control's own pointer); the first two are the pinch (R479-482).
- watchers: what to call after the view is placed (Drag's carry, R482).
- views: rid → its PieceView or PoolView element.

## Does
- (R451) cancels `dragstart` on its root, so the browser's own drag never starts from a piece (WebKit's
  would swallow the pointer moves a carry needs); files dropped from outside still arrive.
- R419, R421, R438: a change to an Opinion Record or the Connection Table, or a piece going, redraws
  the cards, whose folders show them, on every page: a player's shows the records revealed to it.
- render(changed): on Game changes, makes, updates or removes the view of each changed rid on the table
  (Records.onTable: a torn roll's `t:` too, R486); nothing else is touched.
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
- pinch (R479): two fingers on the table pinch it: pinchView(view, a0, b0, a1, b1) gives the view in
  which the table point under the fingers' first midpoint is under their midpoint now, the zoom the
  first one times their spacing's ratio, clamped to ZOOM_MIN and ZOOM_MAX; no rotation. Measured from
  where the pinch began (the view and both fingers then), so it never drifts. Saved to the Seat when the
  pinch ends.
- hand-off (R480, R481, R482): every press on the table is noted in the capture phase, before a piece
  sees it. A second finger is the table's (stopped there, so no piece takes it) and starts a pinch with
  the first: a pan's finger, a press Gesture gives up (Gesture.claim, R481), or a carry's finger, whose
  piece then rides in its hand (R482). Lifting one finger of a pinch starts the pinch over as a pan from
  the other, unless a piece holds it, which carries on alone. A third finger is stopped and ignored.
- onView(fn) (R482): fn runs after each placing of the view, so a carry re-frames under a still finger.
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
- tapes(leads) (R534, R539, R542): draws each docket's red tape in one SVG layer under the pieces, round its label and the papers pinned to it that this page holds (Dockets.tapeOf, Dockets.path), leaving out a carried paper unless it is aimed at that docket; on a tied docket, round the pile, with the cross and bow drawn over it.
- tied piles (R542, R543): a tied docket's papers are drawn at Dockets.pile, marked piled (their insides take no presses), and a press on one carries the docket.
- box(rid) (R537): a drawn piece's box in table coordinates, for the touch test.
- tacked (R568): pinned paper whose holder is a card is marked `tacked`, so its tack shows.
- pinLine(rid, at, to) (R572, R571): one dashed amber line in table coordinates from the middle of paper
  `rid`'s tack (its corner at `at`, its tilt counted) to `to`, one below the paper's height, so under it
  and over its card; or none. With it, the cards it names are raised (`pinraised`) and the paper above
  them (`pinpaper`), above every other piece, the line between; taken away, they go back down (R573).
- gatheredAt(rid) (R575, R576): where a gathered card belongs: under its pool, this page's docked roll row
  left out. #snap draws it there (its own row below), and on the page holding the game puts the card's
  record there when it differs, not mid-carry; Dockets.repin then brings its paper.

## Collaborators
- Game, Seat, PieceView, PoolView, Drag

## Sequences
- seq-save.md
