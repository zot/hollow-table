# Test Design: Influence
**Source:** crc-Influence.md

## Test: the chip cycle
**Purpose:** click and shift-click on chips, riders and odd points
**Input:** the mockup's `poolclick.cjs` sequence: +1 → 2 → 4, back down to +1, removed; a 4 with a
rider: click, shift-click
**Expected:** values as in `poolclick.cjs`; rider click no change, shift-click removes it
**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`

## Test: cards stop at Min
**Purpose:** lowering a card never goes below Min
**Input:** a Sig card lowered three times
**Expected:** Min, Min, Min
**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`
