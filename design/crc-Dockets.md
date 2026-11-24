# Dockets
**Requirements:** R531, R534, R536, R537, R538, R539, R542, R543, R545

Dockets, pure: the red tape's shape and the touch test, where a docket's papers pile when it is tied,
and which pinned paper must be moved to its holder or let loose. No DOM: boxes come in, places and
paths go out.

## Knows
- Box: `{ left, top, right, bottom }` in table coordinates.
- Tape: `{ hull, r }`, the convex hull of corners (a polygon, anticlockwise on screen) and the radius
  it is pushed out by.
- RADIUS (the tape's push), CORD (its width), PILE_STEP (how far each piled paper sits from the last).

## Does
- hull(points) (R534): the convex hull, by the monotone chain; one point or two are their own hull.
- tapeOf(boxes) (R534): the tape round these boxes (the label's and its papers').
- path(tape) (R534): the SVG path of the tape: each hull edge pushed out by r, the corners arcs of
  radius r round the hull's vertices; a hull of one point is a circle round it.
- touches(tape, box) (R537): whether the box touches the tape, inside or on the cord, by the five
  steps of R537: the padded bounding box; a box corner in the hull; a hull vertex in the box; edges
  crossing; then the least vertex-to-edge distance within r + CORD/2.
- aimed(dockets, box) (R536, R538, R539): of the dockets whose tape (or label) the box touches, the one
  on top (highest z), or none. The caller leaves out the carried piece from every tape (R539) and
  never offers a docket for a docket.
- pile(label, papers) (R542, R543): where each of a tied docket's papers lies: squarely under the
  label, each PILE_STEP right and down from the last, in their z order.
- repin(all, gm, gone) (R531, R545): the puts that bring pinned paper to its holder (an ungathered
  card's card, or a docket's label) plus its offset, and that unpin paper whose holder was deleted
  (`gone`: the GM's page's tombstones): shared paper on the GM's page, and on every page its own `mine`
  paper. A holder merely not on the page keeps its paper. Nothing when all is where it belongs.

## Collaborators
- Records: Pin, Docket and the paper it pins; ridFor for what to put.

## Sequences
- none
