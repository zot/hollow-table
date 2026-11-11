# PieceView
**Requirements:** R5, R22-27, R62, R75, R202, R203

Draws one paper piece from its record and turns edits back into Game changes: character cards,
stickies, loose text, images, torn rolls and reference cards.

## Knows
- The record it shows, and the viewer (for redacted faces drawn face-down).

## Does
- card(record): two faces, flipped at the corner; the front's marks drawn by MarkedText.render with
  their dice (`act`) and tap glyphs (`res`, and on the back `bias`, `aff`, `inj`); the back's level
  columns, empty ones collapsed to their names until clicked (and closed again at the next click
  elsewhere if still empty); Slot boxes toggle (a box can't be checked until its column has a name).
- sticky, text: handwriting, edited in place.
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
