# Test Design: Dice
**Source:** crc-Dice.md

## Test: resolution
**Purpose:** Green takes the higher, Red the lower, ±1 after, automatic rows decide alone
**Input:** fixed dice for each row
**Expected:** Failure, at a cost, Success as the book gives
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`

## Test: exploding and the Failure rule
**Purpose:** 6s chain; Yellows removed and bonus ignored on a Failure; floor at zero
**Input:** Blue 6 then 6 then 2; a Failure with Yellows and +3; a Success with −9
**Expected:** three added Yellows; Yellows dropped, bonus 0; result 0, "no noticeable effect"
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`

## Test: CRIT
**Purpose:** White 6 with Blue 5 or 6 is a Success against anything, choosing the larger result
**Input:** Outclassed with White 6, Blue 5; Red row where Red shows 1, White 6, Blue 6; a case where
doubling beats maximizing and one where it doesn't
**Expected:** Success both times, Yellows kept; `chosen` is the larger of max and dbl
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`

## Test: Level names
**Purpose:** the thresholds
**Input:** 0, 1, 4, 5, 9, 10, 14, 15, 19, 20
**Expected:** no noticeable effect, Minor, Minor, Significant, Significant, Major, Major, Extreme,
Extreme, Exquisite
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`
