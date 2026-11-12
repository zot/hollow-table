# Test Design: Dice
**Source:** crc-Dice.md

## Test: resolution
**Purpose:** Green takes the higher, Red the lower, ±1 after, automatic rows decide alone
**Input:** fixed dice for each row
**Expected:** Failure, at a cost, Success as the book gives
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`
**Alarm:** 1
**Fire alarm:** Let Red take the higher of White and Red: the Red row with White 5, Red 2 resolves a Success
**Inject:** src/rules/dice.ts:resolve
**Pulled:** 2026-11-12 — rang: the Red row with White 5, Red 2 resolved `success`, 5 instead of `failure`, 2
## Test: exploding and the Failure rule
**Purpose:** 6s chain; Yellows removed and bonus ignored on a Failure; floor at zero
**Input:** Blue 6, then added Yellows 6, 6 and 2; a Failure with Yellows and +3; a Success with −9
**Expected:** three added Yellows; Yellows dropped, bonus 0; result 0, "no noticeable effect"
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`
**Alarm:** 2
**Fire alarm:** Explode the Yellows a Failure dropped (filter without `!d.dropped`): the Failure rolls more dice than the test gives (the fixed faces run out)
**Inject:** src/rules/dice.ts:roll
**Pulled:** 2026-11-12 — rang: the Failure rolled more dice than the fixed faces give (`rolled more dice than the test gave`, `dice.test.ts:46`)
## Test: CRIT
**Purpose:** White 6 with Blue 5 or 6 is a Success against anything, choosing the larger result
**Input:** Outclassed with White 6, Blue 5; Red row where Red shows 1, White 6, Blue 6; a case where
doubling beats maximizing and one where it doesn't
**Expected:** Success both times, Yellows kept; `chosen` is the larger of max and dbl
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`
**Alarm:** 3
**Fire alarm:** Leave the bonus out of maximize: the Red-row CRIT reads max 12 instead of 14, and the tie case chooses dbl
**Inject:** src/rules/dice.ts:roll
**Pulled:** 2026-11-12 — rang: the Red-row CRIT read `max: 12` instead of `max: 14`
## Test: Level names
**Purpose:** the thresholds
**Input:** 0, 1, 4, 5, 9, 10, 14, 15, 19, 20
**Expected:** no noticeable effect, Minor, Minor, Significant, Significant, Major, Major, Extreme,
Extreme, Exquisite
**Refs:** crc-Dice.md
**Code:** `src/rules/dice.test.ts`
**Alarm:** 4
**Fire alarm:** Start Significant at 6: a result of 5 reads Minor
**Inject:** src/rules/dice.ts:NAMES
@alarm-hash: 1ffb46d8187f9d27
**Pulled:** 2026-11-12 — rang: a result of 5 read `Minor` instead of `Significant`
