# Test Design: Pool
**Source:** crc-Pool.md

## Test: Roll Up
**Purpose:** chips merge, cards pile, riders are spent, chains continue
**Input and Expected** (positives / negatives after each):
1. green chips into one slot: 4, 4, 2, a +1 onto that 2, then 2, 2. The three 2s (one carrying
   the +1) roll up to 4, and the three 4s to 6: `[6] / []`
2. green 2 into an empty slot, a +1 onto it: `[2+1] / []`. Then 2, 2, 2 one at a time: when the
   third 2 arrives, three 2s (the 2+1 counting as 2) roll up to 4 and the +1 is spent; the fourth
   stays: `[4, 2] / []`
3. red 4, then green 2, into an empty slot: `[2] / [−4]` (each sign stacks on its own side)
4. three equal Influence cards: a pile acting as the next value; nothing merged
5. two chips and one card of one value: a pile, never a merge

**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
**Alarm:** 1
**Fire alarm:** Carry a rider onto the chip a merge makes (`rider: chips.some(c => c.rider)`) instead of spending it: step 1 ends `[6+1]` instead of `[6]`
**Inject:** src/rules/pool.ts:rollUp
**Pulled:** 2026-11-12 — rang: step 1 ended `[6+1] / []` instead of `[6] / []`
## Test: best minus worst
**Purpose:** only the strongest of each sign counts
**Input:** +4, +2, −2, −6 in one slot; +4, +2, −2; an empty slot
**Expected:** −2; 2; 0
**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
**Alarm:** 2
**Fire alarm:** Sum each sign instead of taking its strongest: the +4, +2, −2 slot reads 4 instead of 2
**Inject:** src/rules/pool.ts:value
**Pulled:** 2026-11-12 — rang: the +4, +2, −2 slot read 4 instead of 2
## Test: a Damage card goes only into its own slot
**Purpose:** a card tapped from a Damage Resource fits only its kind's slot (R211), one from a
Motivation only Main (R260); anything else fits all
**Input:** a Bias card, an Injury card, a plain card, a chip, a Motivation card; each offered to every slot
**Expected:** `bias`; `injury`; every slot; every slot; `main`
**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
**Alarm:** 3
**Fire alarm:** Let a Damage card go anywhere (`return true`): the Bias card fits every slot
**Inject:** src/rules/pool.ts:accepts
**Pulled:** 2026-11-12 — rang: the Bias card fit every slot instead of only `bias`
