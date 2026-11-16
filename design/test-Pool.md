# Test Design: Pool
**Source:** crc-Pool.md

## Test: Roll Up
**Purpose:** R366, R367: chips and cards pile alike, never merged, chaining; a rider counts at face value, uncounted in a pile and kept on its chip; riderless chips pile first
**Input and Expected** (each sign strongest first, a pile in brackets):
1. 4, 4, a 2 carrying a +1, 2, 2: the three 2s pile to 4 and the three 4s to 6: `[(6)] / []`, worth
   6; every chip is still a member somewhere, and the +1 is still on its chip; a pile of three 2s, one
   carrying a +1, is worth 4
2. 2, 2, 2 and a 2 carrying a +1: the riderless three pile, the 2+1 stays out: `[(4), 2+1] / []`
3. red 4 and green 2: `[2] / [−4]` (each sign on its own side)
4. three equal Influence cards: one pile of 6, its members by name; worth 6
5. two chips and one card of one value: a pile of 4

**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
**Alarm:** 1
**Fire alarm:** let only cards pile (chips left out of every pile); red: step 1 is no 6
**Inject:** src/rules/pool.ts:rollUp
**Pulled:** 2026-11-16 — re-pointed at the pile rule (#21; the merge it once guarded is gone) and rang: "Roll Up" failed, step 1 no 6, with "best minus worst" and the re-working test; restored clean *Earlier —* 2026-11-12 — rang: step 1 ended `[6+1] / []` instead of `[6] / []`
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

## Test: a Roll Up is worked out again, the same way every time
**Purpose:** R366: a member taken out breaks the pile; the same chips in any order give the same piles; R46: lowering can complete a Roll Up
**Input:** three −2s, then two of them; four −2s in two orders; 2, 2 and a 4 lowered to 2
**Expected:** `[(−4)]`, then `[−2, −2]`; the same chips piled both ways; `[(4)]`
**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
**Alarm:** 4
**Fire alarm:** pile the first three found, unsorted; red: the two orders pile different chips
**Inject:** src/rules/pool.ts:rollUp
**Pulled:** 2026-11-16 — rang: "a Roll Up is worked out again" failed, the two orders piled different chips; restored clean
