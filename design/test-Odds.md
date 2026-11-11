# Test Design: Odds
**Source:** crc-Odds.md

## Test: totals
**Purpose:** which pools count for whom
**Input:** Base 4 with Main +4, Edge +2, Bias −2, Affliction −2, Injury −2, Stagger −6, Bonus +4
**Expected:** own total 4 (Stagger and Bonus excluded); as opposition with Defend 2, total −6
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`

## Test: every Difference row
**Purpose:** each edge of the table
**Input:** Differences −10, −9, −7, −6, −5, −4, −3, −2, 2, 3, 4, 5, 6, 7, 9, 10
**Expected:** the row the book gives for each
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`

## Test: Success Bonus
**Purpose:** written as is until the pool adds; regroup; negatives add no dice
**Input:** the mockup's `bonuspool.cjs` sequence
**Expected:** its results
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`
