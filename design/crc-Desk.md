# Desk
**Requirements:** R529, R530, R512, R513, R514, R515, R516, R517, R520, R526, R527

The desk on the bar (`carves/organizing.md`): a little roll-top right after the wordmark, its
pigeonholes holding the paper supplies and its drawers what is filed (Drawers). Pressing it opens the
strip of pigeonholes; the press, wherever it goes, decides what is taken and how. A click opens it whole,
the drawers showing below the pigeonholes.

## Knows
- holes: the pigeonholes in order: character, sticky, text, image, howto, and on the GM's desk
  connections; each draws its supply small, as the bar drew them.
- open: whether the whole desk is open (a click), its pigeonholes staying until a press elsewhere.
- held: the supply whose small piece is in hand during a press, or none.

## Does
- press (R530): a press on the desk (or on a pigeonhole of the open desk) opens the strip and follows
  that pointer: over a pigeonhole, its supply is `held`, drawn small under the pointer (the ghost).
- leaving (R512): the pointer leaving the strip and the desk with a supply held hands it over: the
  page makes it at the pointer and carries it on the same press (BarWith.take, mode `press`), and the
  strip closes. The image instead keeps its small ghost to the drop (R515).
- release(state) (pure, R513-R516): what letting go means, from whether the pointer moved, the
  pigeonhole under it, the supply held, whether it was dragged out, and whether the pointer is touch:
  `open` (no move, on the desk: the whole desk), `loose` (in a pigeonhole: made and carried with no
  button held), `below` (in a pigeonhole, on touch: made just below the strip), `picker` (the image
  pigeonhole, or the image dragged out onto the table), or `close`.
- picker (R515): the hidden file input's picker, opened in the release's own event; chosen files go to
  BarWith.images with where they go and whether one is carried.
- refused(why) (R517): the image pigeonhole red with its label and tooltip, the desk edged red; null
  clears both.
- an open desk closes on a press anywhere outside it.
- drawers (R526): on the open desk, a drawer front per drawer (Drawers.DRAWERS) with a brass pull and its
  label; a click pulls one out (closing any other) and lists its entries (Drawers.inDrawer) by name,
  or "Nothing filed here." It is drawn again when the `desk` record changes (render).
- take out (R527): an entry dragged a few pixels (Gesture's drag) goes to DeskWith.takeOut with the
  pointer, and the desk closes; the page brings its records back under the pointer and carries them.
- the hint (R520): Drag marks the desk `file` with the drawer's name while a piece that would be filed
  is over it; the desk shows "→ <drawer>" beneath itself.
- the docket's pigeonhole (R529, R530): a label on red tape, between the reference card and the Connection Table.

## Collaborators
- Bar: makes it, in the bar after the wordmark, and passes its callbacks through.
- Drag (through the page): carries what is made, on the press or loose, and what comes out of a drawer.
- Drawers: what the drawers hold, read from the page's `desk` record.

## Sequences
- seq-drag.md
