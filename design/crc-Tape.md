# Tape
**Requirements:** R97, R105, R110, R111, R112, R113, R114, R279-283

The paper tape from the register: this page's receipts, never sent.

## Knows
- The Tape record (each page's own).
- up: rolled up or down, and raised: over the pieces or under them (Seat).

## Does
- Pure (`src/ui/tape.ts`): retitled(tape, id, title) (R279); torn(tape, oid, place), the whole roll as
  a torn-roll piece (R113); mayChoose(viewer, receipt), the rolling character's owner or the GM until
  locked (R97).
- The view (TapeView): `#tape` inside the table, under the world (z 0) until raised (z 2); a press
  on it never pans the table; the wheel scrolls it. It doesn't rise for what was already there when
  the page opened.
- print(receipt): newest first; raises the tape; about three show, the rest scroll; the receipt slides
  in. The tape hangs under the register, 250 px wide and at most 380 tall; rolled up, a sliver
  (R282).
- receipt(r) (`src/ui/receipt.ts`, shared with torn rolls): built from text only, in R279's order:
  title and time (24-hour with seconds), "rolled by", the dice, the action's numbers, `vs`, the row's
  words, "Resolution: …", "Level: …", the outcome; the lines this page may know; the title editable;
  ✓ when sent; "N rolls from … didn't arrive". A receipt from before R279 (no action) prints its
  influence line without a label. The dice drawn as dice (R280): 28 px with their
  numbers, an exploded Yellow dashed, a die removed on a Failure faded and struck, tumbling in one
  after another, each titled. Cream paper about 300 px, PT Mono, a torn zigzag bottom.
- note(text): an error or a lost roll as a short red note with the time (R281).
- crit(r): both results with the larger chosen; the owner or GM may switch and lock; a lock punches
  the chosen line and removes the other.
- raise / lower: a roll or a press raises it; pressing anything else lowers it; the paper roll on
  the register rolls it up and down (toggleUp; down again, it rises).
- tear(): once a drag has gone a few pixels, hands the whole roll to Drag as a torn-roll piece,
  slightly tilted; the next roll starts a fresh tape. Pressing a receipt's title to edit it doesn't
  tear. A torn roll's wheel scrolls it, and zooms the table only at its ends (R283).

## Collaborators
- Rolls, Drag, Seat, Game

## Sequences
- seq-roll.md
