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
