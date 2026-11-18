# PieceView
**Requirements:** R5, R22-27, R62, R75-77, R202, R209, R213, R245, R248-250, R252-256, R258, R259, R263-265, R309, R310, R312, R316, R339, R341-343, R318, R331, R332, R334, R335, R354, R355, R363, R384, R388, R390, R392, R393

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
- the eye (R388, R392, R393): on the GM's own page, a card the GM owns has an eye at its front's upper right
  and a dropdown arrow beside it (Skills, Resources, Motivations). The open eyes are the page's own,
  never saved or sent (Eyes): each open card keeps a draft of its revealed entries, begun from `shown`.
  Open, the card is drawn torn from the back as below, but the back is translucent and its hidden
  text is written in a muted ink, each line with entries (MarkReader.entries) drawn as its label and
  its entries, each its own target; its text takes no caret, and a click on an entry tears it out or
  mends it in the draft, its line's label torn with it. Shutting the
  eye writes the draft as `shown` in one change (absent when empty). The dropdown's category opens
  the eye and highlights that category's unrevealed entries yellow. A shut card shows nothing of `shown`.
- torn from the back (R390, and R392 in the Infer state): a face-down card shows its front's face in brown, "Hollow" across it,
  its public `name` in its first line's place, and each line with words (its revealed entries, R394),
  as a white strip torn through it,
  in the text's own flow: ragged top and bottom edges picked from the card's oid and the line, and
  the torn piece rolled at its right end.
- the pointer over writing (R384): text written in place takes the I-beam while it holds the caret,
  its marks with it; the glyphs and action dice in it keep the pointing hand, and text without the
  caret keeps the open hand, a press there carrying the piece. A stylesheet rule
  (manifest-ui.md, Global rules), so a receipt's title on the tape gets it too.
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
- actions (R316, R76, R77): a small die before each alternative of an `<act>` label (split at `/`) at rest (like the glyphs), which calls
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

- taking (R309–R312): for a Take, the target's card turns to its back with the Attack's column at
  the front; a strip under the columns reads ‹ k of n ›, Take and Cancel, and the overflow when there
  is one ("3 left over: a Conviction", R339); the page's Slots are marked on the column as they would
  fill, and a Conviction or Burden it would start or grow is pencilled on its line.
  Take sends Rolls.take; Escape, Cancel or a click elsewhere backs out. A local view state, never
  saved.
- A Slot waiting for a name draws an empty mark with "Beauford names it" (R312).
- lasting (R341, R342, R343): under the Biases' and Afflictions' Maj slot, a line for the column's
  Conviction or Burden while the card has one: "Conviction", its tap glyph (source
  `<oid>:<damage>/lasting`), its name (written in place, waiting as a Slot's does), its Level word
  and its points in place over its top, `Sig (5/6)`, the points written in place too, and what it has
  spent. Writing its name and points away (no name, 0 points, nothing waited for) removes it. A
  column with one never collapses.

- A lone Influence (R363, MarkReader.suffers): an action line that is only an Influence and no variant
  gets no die.
- A variant (R354, R355, MarkReader.variants): its line gets `varpad` (indented under its action),
  and in place of its own die a die per alternative of the action it varies, each passing that
  alternative to useAction, so the roll is typed by it and named by the variant.
- skillIndents(front) (R331): which front lines are a Field's Skills, and which of those carry a ✓; the view gives them `sklpad` (indented) and `sklhang` (the ✓ hanging in the margin).
- toggleCheck(lines, line) (R335): the lines with that Field Skill's ✓ written (`✓ ` at the start of its text) or taken out; the same lines when the line isn't one `skillIndents` indents.
- The ghost ✓ (R334) is CSS on a `sklpad` line without `sklhang`, shown only while the card is written on; a press in an indented Skill's margin while the front holds the caret toggles its ✓ through toggleCheck and saves through the front's own `input`, as a pen does (R335).

## Collaborators
- Absorb: the pages and what they fill
- Rolls: take
- MarkedText, MarkReader, BlobStore, Game, Pens

## Sequences
- seq-save.md
