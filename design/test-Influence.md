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
