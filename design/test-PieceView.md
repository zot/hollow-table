# Test Design: PieceView
**Source:** crc-PieceView.md

## Test: a column brought to the front leads
**Purpose:** R253: the columns rotate so the one brought forward is leftmost, the rest following in
turn; bringing the second forward each time cycles through all three
**Input:** frontOrder with none, Afflictions and Injuries; then three times, bring forward whichever
column is second
**Expected:** Biases, Afflictions, Injuries; Afflictions, Injuries, Biases; Injuries, Biases,
Afflictions; the leaders Biases, Afflictions, Injuries, Biases
**Refs:** crc-PieceView.md
**Code:** `src/ui/piece.test.ts`
**Alarm:** 1
**Fire alarm:** In frontOrder, move only the front column to the left and keep the rest in print order: Afflictions brought forward gives Afflictions, Biases, Injuries, and the second click brings Biases back instead of Injuries
**Inject:** src/ui/piece.ts:frontOrder
**Pulled:** 2026-11-12 — rang: Afflictions brought forward gave Afflictions, Biases, Injuries, so the cycle went back to Biases

## Test: a Field's Skills line up as printed
**Purpose:** R331: every Skill under a Field indents and a ✓ hangs, check or not; a `Skills N:` line, and a Skill with no Field above, stay flush
**Input:** a stray Skill, Snakeoil Salesman with Rhetoric and ✓ Rationalization, Private Investigator with Investigation, a Skills line
**Expected:** Rhetoric `pad`, Rationalization `hang`, Investigation `pad`, nothing else
**Refs:** crc-PieceView.md
**Code:** src/ui/piece.test.ts
**Alarm:** 2
**Fire alarm:** let Skills with no Field above group too (drop the `inField &&` guard); red: the stray Skill before any Field is indented
**Inject:** src/ui/piece.ts:skillIndents
**Pulled:** 2026-11-14 — 2026-11-14 — rang: "a Field's Skills line up as printed" failed (the stray Skill before any Field got 'pad'); restored clean. Re-pulled after the rule became always-indent (Bill 11-14); the earlier record guarded the old ✓-only rule *Earlier —* 2026-11-14 — 2026-11-14 — rang: "a Field's Skills line up as printed" failed (Investigation indented); restored clean
