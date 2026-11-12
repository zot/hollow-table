# Test Design: PoolView
**Source:** crc-PoolView.md

## Test: slots fill the mat
**Purpose:** R228: slots open from the left while they fit, holding ones always open, the rest strips
at the right
**Input:** an empty pool; one holding only Injury; the same on a 445 px mat, where Stagger doesn't
fit but Bias would; one holding everything; an empty pool on a mat wide enough for all
**Expected:** Bonus, Main, Edge and Stagger open and the rest strips; Bonus, Main and Edge open with
Injury (Stagger, the first that doesn't fit, ends the opening); the same at 445 (Bias stays a
strip: the first N open, not any that fit); all open; all open
**Refs:** crc-PoolView.md
**Code:** `src/ui/pool.test.ts`
**Alarm:** 1
**Fire alarm:** Keep opening past the first slot that doesn't fit (`continue` for `break`): on the 445 px mat Bias opens after Stagger didn't
**Inject:** src/ui/pool.ts:openSlots
**Pulled:** 2026-11-12 — rang: on the 445 px mat Bias opened after Stagger did not fit

## Test: what pops
**Purpose:** R237: a Roll Up's new chip, a pile that forms and a Level that changes pop; a chip
dropped in from elsewhere and the first draw don't
**Input:** a first draw of three 2s and a 4 card, and of a pile; three 2s and a 4 card redrawn as a new 4 and the card at 6; a slot gaining a chip it
didn't lose any for; the three 2s as a pile
**Expected:** nothing on either first draw; the new 4 and the card; nothing; the pile
**Refs:** crc-PoolView.md
**Code:** `src/ui/pool.test.ts`
**Alarm:** 2
**Fire alarm:** Pop every new chip (drop the two-lost test): the chip dropped in from elsewhere pops
**Inject:** src/ui/pool.ts:pops
**Pulled:** 2026-11-12 — rang: the chip dropped in from elsewhere popped

## Test: where a card goes in a drawer
**Purpose:** R240: the gap's index among a drawer's cards in reading order, rows wrapping
**Input:** cards A and B on one row and C on the next; points before A, past A's middle, past the
first row, past C; no cards
**Expected:** 0, 1, 2, 3, 0
**Refs:** crc-PoolView.md, crc-Drag.md
**Code:** `src/ui/pool.test.ts`
**Alarm:** 3
**Fire alarm:** Compare against a card's left edge instead of its middle: past A's middle reads 0, not 1
**Inject:** src/ui/pool.ts:insertAt
**Pulled:** 2026-11-12 — rang: past A’s middle read 0, not 1

## Test: a carry over a strip trades space
**Purpose:** R244: the strip under a carry opens and the slot it came from pays if now empty, else
the first empty open slot to the left; nothing empty, the mat grows by that one slot
**Input:** an empty pool with the chip from Stagger over the Bias strip, then back over Stagger;
from Main (still holding) over Injury; from elsewhere over Affliction; Bonus to Stagger all
holding, over Bias
**Expected:** Stagger closes for Bias; back over Stagger, the plain layout; Bonus closes for Injury;
Stagger closes for Affliction; Bias opens and nothing closes
**Refs:** crc-PoolView.md, crc-Drag.md
**Code:** `src/ui/pool.test.ts`
**Alarm:** 4
**Fire alarm:** Forget the source slot (start the walk left without trying `from` itself): the chip from Stagger over Bias closes Edge, not Stagger
**Inject:** src/ui/pool.ts:reachFor
**Pulled:** 2026-11-12 — rang: the chip from Stagger over Bias closed Edge, not Stagger

