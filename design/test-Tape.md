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
