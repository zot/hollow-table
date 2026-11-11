# Test Design: Pool
**Source:** crc-Pool.md

## Test: Roll Up
**Purpose:** chips merge, cards pile, riders are spent, chains continue
**Input:** the mockup's `rollup.cjs` cases (6 from 2,2,2 then 4,4; a rider spent on the third 2;
mixed signs), plus three equal cards, and two chips with one card
**Expected:** `rollup.cjs` results; cards and mixed give a pile, never a merge
**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`

## Test: best minus worst
**Purpose:** only the strongest of each sign counts
**Input:** +4, +2, −2, −6 in one slot; an empty slot
**Expected:** −2; 0
**Refs:** crc-Pool.md
**Code:** `src/rules/pool.test.ts`
