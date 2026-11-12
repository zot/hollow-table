# PieceView
**Requirements:** R5, R22-27, R62, R75, R202, R209, R213, R245, R248-250, R252-256, R258, R259, R263, R264, R265, R75-77

Draws one paper piece from its record and turns edits back into Game changes: character cards,
stickies, loose text, images, torn rolls and reference cards.

## Knows
- The record it shows, and the viewer (for redacted faces drawn face-down).

## Does
- frontOrder(front): the Damage columns in drawing order, rotated so `front` (the one brought
  forward, or none) is first, the rest following in turn (R253).
- draw(record, old): makes or updates a piece's element; text written in place is left alone while
  it holds the caret. The card's front reads in two columns, as printed. A card its viewer may not
  read lies face-down ("Hollow").
- glyphs (R54, R249, R258): a tap glyph, drawn as a tiny card, before each `<res>` and `<mot>` mark on the front, before each named Damage slot,
  and for each checked box; it starts Drag.startGlyph, and refuses the native drag and selection a
  press inside written text would start.
- card(record): two faces, flipped at the corner, one shown at a time (R252: no 3D, which Chrome
  draws blurred); a change of face turns the card by squeezing it to its edge and opening it on the
  other face (turn), instant under reduced motion; the front's marks drawn by MarkedText.render with
  their dice (`act`) and tap glyphs (`res`); the back's three Damage columns (Biases, Afflictions,
  Injuries), each a Mild, Min, Sig and Maj slot whose name is drawn as a span of its column's mark
  (`bias`, `aff`, `inj`) with a tap glyph, so CSS and the glyph handler treat it like a `res`; empty
  columns collapsed to their names; clicking a column's name brings it to the front (R253: it
  opens, the others' empty columns collapse, and the columns rotate so it is leftmost, drawn with
  CSS `order` from frontOrder; the one opened is kept per card in the Seat); Slot boxes, in front of their slot's Level word, toggle (a box can't be checked
  until its slot has a name), each checked box with a tap glyph of its own; how many boxes a slot has,
  and the absorb a column's heading shows when it isn't 0, come from Influence.columnRoom (R264,
  R265): never typed; a box checked beyond the count stays drawn until unchecked; with no attribute
  marked, the boxes the card has.
- actions (R75–R77): a small die before each `<act>` mark at rest (like the glyphs), which calls
  useAction (the roll row docks and fills, or the die shakes); the action in use (inUse, matched by
  label) carries `inuse`, its highlighter swish, even while written on.
- refuse (R259): a glyph whose tap the page refuses (someone else's Resource) shakes and carries
  nothing.
- dry (R250): each glyph is marked dry when its source has no Levels left (Tap.left), redrawn
  with the character.
- ruled(text) (R255): the notes over an SVG of lines with a non-scaling stroke, a line every 26 px;
  when the writing scrolls (the caret past the bottom), the lines shift with it, by the scroll
  modulo a line, so they stay under the text.
- sticky, text: handwriting, edited in place; a sticky with `big` is the big sticky (R248).
- marks look printed at rest (R245): the highlights show only while the piece is being written on,
  the same moment its pens are out (CSS on the piece); a Damage entry fills only once named (R263).
- image: from BlobStore by hash; striped and marked missing with why when absent.
- tornroll: its receipts, scrolling inside (the wheel scrolls it rather than zooming).
- reference: the static "How to play the table" and actions cards.
- edit: on input, MarkedText.read the element and Game.change the record's text.
- tilt: a small random tilt, squared while the piece holds the text cursor.
- pin: a pinned sticky, text or image follows its card.

## Collaborators
- MarkedText, MarkReader, BlobStore, Game, Pens

## Sequences
- seq-save.md
