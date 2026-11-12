# Tape
**Requirements:** R97, R105, R110, R111, R112, R113, R114

The paper tape from the register: this page's receipts, never sent.

## Knows
- The Tape record (each page's own).
- up: rolled up or down, and raised: over the pieces or under them (Seat).

## Does
- print(receipt): newest first; raises the tape; about three show, the rest scroll.
- receipt(r) (`src/ui/receipt.ts`, shared with torn rolls): built from text only: title, time (24-hour with seconds), "rolled by", dice, the lines
  this page may know, resolution, Level, outcome; ✓ when sent; "N rolls from … didn't arrive".
- crit(r): both results with the larger chosen; the owner or GM may switch and lock; a lock punches
  the chosen line and removes the other.
- raise / lower: a roll or a press raises it; pressing anything else lowers it; the paper roll on
  the register rolls it up and down.
- tear(): hands the whole roll to Drag as a torn-roll piece; the next roll starts a fresh tape.

## Collaborators
- Rolls, Drag, Seat, Game

## Sequences
- seq-roll.md
