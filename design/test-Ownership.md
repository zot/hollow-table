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

## Test: who writes a character
**Purpose:** R567: the owner and the GM write a character; an open one, the GM alone; nobody else.
**Input:** the GM, Dana (Sam's owner) and Ann, on Sam, Devreux and an open character.
**Expected:** the GM writes all three; Dana writes Sam only; Ann none.
**Refs:** crc-Ownership.md
**Code:** src/rules/ownership.test.ts
**Alarm:** 3
**Fire alarm:** let anyone write an open character (as anyone may claim it): Dana writes it
**Inject:** src/rules/ownership.ts:mayWrite
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with an open character anyone's to write, 'who writes a character' failed; restored clean

## Test: handing a note over
**Purpose:** R579, R581: handOver: the new owner leaves `to`; everyone's stays everyone's; the giver no longer reads it; a "just me" note goes `handed`
**Input:** Sam's notes: public, to Dana and Ann, to the GM; the GM's handout to Sam; paper with no maker; Sam's `mine` note; the GM's note to no one; each handed over
**Expected:** `by` the new owner each time; Dana dropped from `[Dana, Ann]`; `to: []` kept for the GM; `[Sam]` kept when the GM's handout goes to Dana; the two "just me" notes come `handed` with no `to` or `mine`
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`
**Alarm:** 4
**Fire alarm:** keep the new owner in `to`; red: "Ann still does, Sam no longer" gets `[Dana, Ann]`
**Inject:** src/rules/ownership.ts:handOver
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the new owner kept in to, handing a note over failed its assertion (to [Dana, Ann]); restored clean

## Test: a page takes what is handed to it
**Purpose:** R581: takeHanded: a player's page takes a `handed` note it owns under `m:` as `mine`, the GM's page the GM's as `to: []`, and nobody else's
**Input:** a note handed to Dana, one handed to the GM, Dana's note to the GM; taken as Dana, the GM and Sam
**Expected:** Dana takes hers from `o:` to `m:`; the GM's page puts the GM's back under `o:` with `to: []`; Sam takes nothing
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`
**Alarm:** 5
**Fire alarm:** take every `handed` note whoever owns it; red: Sam takes two
**Inject:** src/rules/ownership.ts:takeHanded
**Pulled:** 2026-11-25 — 2026-11-25 — rang: taking every handed note, a page takes what is handed to it failed (Sam took notes not his); restored clean

## Test: what the GM's page takes as a hand-over
**Purpose:** R582: handsOver: by its owner and exactly handOver of it; with no copy, a `handed` note for someone else
**Input:** Sam's note to Dana handed to Dana, by Sam, by Dana, by Sam keeping himself a reader, unchanged; with no copy: a note handed to Dana, one in Dana's name not handed, one handed to Sam by Sam
**Expected:** only Sam's own hand-over and the note handed to Dana are hand-overs
**Refs:** crc-Ownership.md, crc-Authority.md
**Code:** `src/rules/ownership.test.ts`
**Alarm:** 6
**Fire alarm:** drop the owner check; red: "Dana can't give Sam's" is a hand-over
**Inject:** src/rules/ownership.ts:handsOver
**Pulled:** 2026-11-25 — 2026-11-25 — rang: without the owner check, Dana giving Sam's note was a hand-over, and the GM page's paper test took it too; restored clean

