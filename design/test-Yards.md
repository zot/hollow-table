# Test Design: Yards
**Source:** crc-Yards.md

## Test: graveyards
**Purpose:** the mockup's `yards.cjs` and `doom.cjs` sequences, as pure calls
**Input:** those sequences
**Expected:** their results (numbering one past the highest in use; empty nameless ones vanish; the
only one kept; delete forever)
**Refs:** crc-Yards.md
**Code:** `src/rules/yards.test.ts`
