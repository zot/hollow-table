# Test Design: Influence
**Source:** crc-Influence.md

## Test: the chip cycle
**Purpose:** click and shift-click on chips, riders and odd points
**Input and Expected**, in order, on one slot (positives / negatives):
1. click empty slot space: `[+1] / []`
2. shift-click empty slot space: `[+1] / [−1]`
3. click the +1: `[2] / [−1]`
4. click the 2: `[4] / [−1]`
5. shift-click the 4 twice: `[+1] / [−1]` (4 → 2 → +1)
6. shift-click the +1: `[] / [−1]` (removed)
7. a 4 carrying a +1 rider in Edge: shows `4+1`
8. click the rider: still `4+1`
9. shift-click the rider: `4`

**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`
**Alarm:** 1
**Fire alarm:** Lower a 2 by 2 like any other chip (drop the 2 → +1 case): step 5 shows `0` instead of `+1`
**Inject:** src/rules/influence.ts:lowerChip
**Pulled:** 2026-11-12 — rang: step 5 read `0` instead of `+1`
## Test: cards stop at Min
**Purpose:** lowering a card never goes below Min
**Input:** a Sig card lowered three times
**Expected:** Min, Min, Min
**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`
**Alarm:** 2
**Fire alarm:** Lower cards without the Min floor: the second lowering shows `0`
**Inject:** src/rules/influence.ts:lowerCard
**Pulled:** 2026-11-12 — rang: the lowerings read `0`, `-2` instead of `Min`, `Min`

## Test: Wis and Con size the Damage columns
**Purpose:** R264, R265: the extra boxes and absorb by Con or Wis, each row of Hollow Folks' table
from its Level up; read from the card's `<att>` marks (Wis for Biases, Con for Injuries); null when
unmarked
**Input:** room at 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15 and 30; the playtest's three cards;
Sam with `Con 7  Wis 10`; Sam with his attributes unmarked
**Expected:** the table's rows (Mild, Min, Sig, Maj, absorb) from `0 0 0 0 0` to `2 2 2 0 3`; Sam,
Beauford and Devreux get 2, 1 and 2 Min boxes, as their cards have, and no Injury room; absorb 2
and one extra Sig Injury box; null
**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`
**Alarm:** 3
**Fire alarm:** In room, take the first row whose Level is at most the attribute from the bottom (rows ascending): Wis 15 reads as Wis 1
**Inject:** src/rules/influence.ts:room
**Pulled:** 2026-11-23 — re-pulled after R496 (room changed): rang, Wis 15 read as Wis 1; restored clean *Earlier —* 2026-11-12 — rang: with the rows read from the bottom, every Level from 1 up came out as `0 1 0 0 0`
## Test: below 0 a slot is worth only 1
**Purpose:** R496: room's `one` rows, Mild at −1 and Mild and Min at −2 or below; slotWorth gives 1 for them and the usual size otherwise
**Input:** room at −3, −2, −1, 0; slotWorth for a card with Wis −2 (Bias Mild, Min, Sig) and Con 0 (Injury Mild)
**Expected:** `one` Mild and Min, Mild and Min, Mild, none; 1, 1, 4; 2
**Refs:** crc-Influence.md
**Code:** `src/rules/influence.test.ts`
**Alarm:** 4
**Fire alarm:** give `one` only at −2 and below (drop the −1 row); red: a Wis −1 Mild slot is worth 2
**Inject:** src/rules/influence.ts:room
**Pulled:** 2026-11-23 — rang: with the −1 row dropped, a Wis −1 Mild slot was worth 2; restored clean
