# Test Design: Ownership
**Source:** crc-Ownership.md

## Test: the die
**Purpose:** click and shift-click for each viewer and owner
**Input and Expected**, in order (Devreux starts GM-owned):
1. Player 1 clicks Devreux's die: nothing; Devreux stays GM's, hidden from P1
2. GM shift-clicks it: open (seen by all)
3. Player 2 clicks it: claims it (owner Player 2)
4. Player 2 clicks again: docks the roll row
5. Player 1 clicks it: nothing (another player's)
6. Player 2 shift-clicks: open again
7. GM clicks the open one: takes it back (owner GM)
8. Player 1 clicks own Sam: docks; GM clicks Sam: docks, Sam stays Player 1's
9. GM shift-clicks then clicks Sam: takes Sam (owner GM)
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`
**Alarm:** 1
**Fire alarm:** Let a player's click claim any character not their own: at step 5 Player 1 takes Devreux from Player 2
**Inject:** src/rules/ownership.ts:click
**Pulled:** 2026-11-12 — rang: at step 5 (`ownership.test.ts:30`) Player 1's click was not refused
## Test: the GM's check
**Purpose:** mayChange refuses handing a character to someone else and touching another's
**Input:** Dana changes Sam (hers), Beauford (Ann's), an open pregen, and sets Sam's owner to Ann
**Expected:** yes, no, yes, no
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`
**Alarm:** 2
**Fire alarm:** Stop checking the owner after the change (`return true` at the end): Dana handing Sam to Ann is taken
**Inject:** src/rules/ownership.ts:mayChange
**Pulled:** 2026-11-12 — rang: Dana handing Sam to Ann was taken (true instead of false)
