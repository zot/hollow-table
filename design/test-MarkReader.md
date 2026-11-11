# Test Design: MarkReader
**Source:** crc-MarkReader.md

## Test: action lines
**Purpose:** the action grammar as the cards write it
**Input:** `Mental Atk / Req: 5, 2d+3`, `…: 2, +2`, `…: 5, 1d`, `Tricky -Min: 5, 2d`, `Shoot: 4, +2 (unfr, x 2)`,
`Attack: 4 (Suasion, Charm), +1`, `Attack: -1, -1`, `With Finesse: 4, 1d+1`, `Defend: 6 / 5`
**Expected:** the mockup's `actions.cjs` table: label, base, yellows, bonus; null for Defend
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`

## Test: Influence and Defend
**Purpose:** `Name ±Level` and the three Defend forms
**Input:** `Money +Maj`, `Uncertain -Sig`, `Distrust`, `2`, `mental 2 / psych 4`, `6 / 5`
**Expected:** name, sign, level (null for a bare name); `{2,2}`, `{2,4}`, `{6,5}`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`

## Test: offers and spending
**Purpose:** the pen offer, and spend keeps the rest of the text
**Input:** plain `Infer: 4, +2`; `Money +Maj` under a Resources heading; `Money +Maj (bank)` spent by 1
**Expected:** `act`; `res`; `Money +Sig (bank)`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
