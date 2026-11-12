# Test Design: Odds
**Source:** crc-Odds.md

## Test: totals
**Purpose:** which pools count for whom
**Input:** Base 4 with Main +4, Edge +2, Bias −2, Affliction −2, Injury −2, Stagger −6, Bonus +4
**Expected:** own total 4 (Stagger and Bonus excluded); as opposition with Defend 2, total −4 (2 + 4 + 2 − 2 − 2 − 2 − 6)
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`
**Alarm:** 1
**Fire alarm:** Count Stagger in the roller's own total: it reads −2 instead of 4
**Inject:** src/rules/odds.ts:total
**Pulled:** 2026-11-12 — rang: the roller's total read −2 instead of 4
## Test: every Difference row
**Purpose:** each edge of the table
**Input:** Differences −10, −9, −7, −6, −5, −4, −3, −2, 2, 3, 4, 5, 6, 7, 9, 10
**Expected:** Outclassed; Red − 1 (−9, −7); Red (−6, −5); −1 (−4, −3); White (−2, 2); +1 (3, 4);
Green (5, 6); Green + 1 (7, 9); Outclass (10)
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`
**Alarm:** 2
**Fire alarm:** Start Green at 4 instead of 5: Difference 4 reads `green`
**Inject:** src/rules/odds.ts:ADV
**Pulled:** 2026-11-12 — rang: Difference 4 read `green` instead of `+1`
## Test: Success Bonus
**Purpose:** written as is until the pool adds; regroup; negatives add no dice; hand adjustments
**Input and Expected**, in order (action, then Yellows and bonus):
1. Sam's `Infer: 4, +2`, empty Bonus pool: `0d +2`
2. +2 chip in the Bonus pool (4 points): `1d +1`
3. +4 chip too (the best is 4; 6 points): `2d +0`
4. hand: one more Yellow: `3d +0`
5. remove the 4 (back to 2 points, 1d+1, plus the hand's 1d): `2d +1`
6. a −4 too (pool −2, total 0, plus the hand): `1d +0`
7. Main +4, Edge +2, Bias −2, Stagger −6: Base 4 → 8, Total Influence 8 = Base 4, Main +4,
   Edge +2, Bias −2 (Stagger excluded); still `1d +0`
8. the −4 raised to −6 (pool −4, no dice): `1d −2`
9. a new action (`Mental Atk / Req: 2, +2`) drops the hand adjustment: Base 2 → 6, `0d −2`
10. Beauford's `Big Lie: 5, 2d+3`, empty pool: `2d +3`
**Refs:** crc-Odds.md
**Code:** `src/rules/odds.test.ts`
**Alarm:** 3
**Fire alarm:** Regroup even with an empty Bonus pool (drop `bonusPool !== 0`): step 10 reads `3d +0` instead of `2d +3`
**Inject:** src/rules/odds.ts:bonus
**Pulled:** 2026-11-12 — rang: step 10 read `3d +0` instead of `2d +3`
