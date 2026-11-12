# PieceView
**Requirements:** R5, R22-27, R62, R75, R202, R203, R209, R213, R214, R245, R248-250

Draws one paper piece from its record and turns edits back into Game changes: character cards,
stickies, loose text, images, torn rolls and reference cards.

## Knows
- The record it shows, and the viewer (for redacted faces drawn face-down).

## Does
- draw(record, old): makes or updates a piece's element; text written in place is left alone while
  it holds the caret. The card's front reads in two columns, as printed. A card its viewer may not
  read lies face-down ("Hollow").
- glyphs (R54, R249): a tap glyph, drawn as a tiny card, before each `<res>` mark on the front, before each named Damage slot,
  and for each checked box; it starts Drag.startGlyph, and refuses the native drag and selection a
  press inside written text would start.
- card(record): two faces, flipped at the corner; the front's marks drawn by MarkedText.render with
  their dice (`act`) and tap glyphs (`res`); the back's three Damage columns (Biases, Afflictions,
  Injuries), each a Mild, Min, Sig and Maj slot whose name is drawn as a span of its column's mark
  (`bias`, `aff`, `inj`) with a tap glyph, so CSS and the glyph handler treat it like a `res`; empty
  columns collapsed to their names until clicked (and closed again at the next click elsewhere if
  still empty); Slot boxes, in front of their slot's Level word, toggle (a box can't be checked
  until its slot has a name), each checked box with a tap glyph of its own; a column's heading
  shows its absorb when it isn't 0, edited in place.
- dry (R250): each glyph is marked dry when its source has no Levels left (Tap.left), redrawn
  with the character.
- sticky, text: handwriting, edited in place; a sticky with `big` is the big sticky (R248).
- marks look printed at rest (R245): the highlights show only while the piece is being written on,
  the same moment its pens are out (CSS on the piece).
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
