# Test Design: Seat
**Source:** crc-Seat.md

## Test: the seat is not the game
**Purpose:** the mockup's `seat.cjs`: seat changes leave records byte-identical; reload restores the
seat; each viewer has their own; a restore keeps the seat
**Input:** the `seat.cjs` sequence, in the browser
**Expected:** `seat.cjs` results
**Refs:** crc-Seat.md, crc-Game.md
**Code:** `tests/seat.spec.ts`
