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

## Test: a Field Skill's check toggles
**Purpose:** R335: toggleCheck writes `✓ ` at the start of an indented Field Skill's text and takes a ✓ out again; a `Skills N:` line, a Skill with no Field above, and a line that isn't there are left alone
**Input:** a stray Skill, Private Investigator with Investigation and ✓ Rationalization, a `Skills 1: Tact` line under the Field
**Expected:** Investigation becomes `<skl>✓ Investigation (x2)</skl>`, toggled again it is as written; Rationalization loses its ✓; the stray Skill, the Skills line and line 99 return the same lines
**Refs:** crc-PieceView.md
**Code:** `src/ui/piece.test.ts`
**Alarm:** 3
**Fire alarm:** in toggleCheck, drop the skillIndents guard and toggle any `<skl>` line; red: the stray Skill with no Field above (line 0) gets a ✓
**Inject:** src/ui/piece.ts:toggleCheck
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "a Field Skill's check toggles" failed at `line 0 is left alone` (the stray Skill got a ✓); restored clean
