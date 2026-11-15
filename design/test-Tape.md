# Test Design: Tape
**Source:** crc-Tape.md

## Test: the tape: titles, tearing, and who chooses a CRIT
**Purpose:** R279: a receipt's title edited on the tape; R113: the whole roll comes off as one
piece; R97: the rolling character's owner or the GM may switch a CRIT, until it is locked
**Input:** a tape of Dana's and the GM's receipts, the GM's retitled; torn at 5, 6; a CRIT of Dana's
for Dana, Ann, the GM and nobody; the same locked; a receipt with no CRIT
**Expected:** titles "roll a", "The big one"; a torn roll `0000000f` with both receipts at x 5;
true, false, true, false; false; false
**Refs:** crc-Tape.md
**Code:** `src/ui/tape.test.ts`
**Alarm:** 1
**Fire alarm:** In mayChoose, let anyone at the table switch: Ann switches Dana's CRIT
**Inject:** src/ui/tape.ts:mayChoose
**Pulled:** 2026-11-12 — rang: Ann could switch Dana's CRIT

## Test: who takes an Attack, and who names it
**Purpose:** R308: Take shows for the target's owner and the GM until the Attack is taken; R313: the name lines for whoever rolled it and the GM; the line's words
**Input:** an Attack Ann rolled at Dana's Sam; viewers Dana, Ann, the GM and nobody; then taken with a Min Bias waiting
**Expected:** Take for Dana and the GM only, none once taken; names for Ann and the GM only, none with nothing waiting; "Name Sam's Minor Bias", "Name Sam's Conviction" and "Name Sam's Burden" (R340)
**Refs:** crc-Tape.md
**Code:** src/ui/tape.test.ts
**Alarm:** 2
**Fire alarm:** let anyone see Take (`mayTake` true for any viewer); red: Ann is offered Take on Dana's Sam
**Inject:** src/ui/tape.ts:mayTake
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "who takes an Attack, and who names it" failed (Ann offered Take); restored clean

## Test: the name line for a Conviction or Burden
**Purpose:** R340: a new Conviction or Burden is named from the receipt with its own words
**Input:** a waiting `lasting` row on Sam's Biases and Afflictions
**Expected:** "Name Sam's Conviction" and "Name Sam's Burden"
**Refs:** crc-Tape.md
**Code:** src/ui/tape.test.ts
**Alarm:** 3
**Fire alarm:** in nameWords, drop the `lasting` case; red: "Name Sam's undefined Bias"
**Inject:** src/ui/tape.ts:nameWords
**Pulled:** 2026-11-15 — rang again after the simplifier pass (one OVERFLOW table): "Name Sam's undefined Bias"; restored clean *Earlier —* 2026-11-15 — rang: "who takes an Attack, and who names it" failed with "Name Sam's undefined Bias"; restored clean
