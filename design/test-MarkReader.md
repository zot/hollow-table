# Test Design: MarkReader
**Source:** crc-MarkReader.md

## Test: action lines
**Purpose:** the action grammar as the cards write it
**Input and Expected** (label, base, yellows, bonus):

| Text inside `<act>` | label | base | yellows | bonus |
|---|---|---|---|---|
| `Mental Atk / Req: 5, 2d+3` | Mental Atk / Req | 5 | 2 | 3 |
| `Mental Atk / Req: 2, +2` | Mental Atk / Req | 2 | 0 | 2 |
| `Mental Atk / Req: 5, 1d` | Mental Atk / Req | 5 | 1 | 0 |
| `Tricky -Min: 5, 2d` | Tricky -Min | 5 | 2 | 0 |
| `Shoot: 4, +2 (unfr, x 2)` | Shoot | 4 | 0 | 2 |
| `Attack: 4 (Suasion, Charm), +1` | Attack | 4 | 0 | 1 |
| `Attack: -1, -1` | Attack | −1 | 0 | −1 |
| `With Finesse: 4, 1d+1` | With Finesse | 4 | 1 | 1 |
| `Attack: 1, +0` | Attack | 1 | 0 | 0 |
| `Infer: 4, +2` | Infer | 4 | 0 | 2 |
| `Defend: mental 2 / psych 4`, `Defend: 6 / 5`, `Sparked: 46  Grains: 14`, `Slots: Mild, Min ×3, Sig, Maj` | null | | | |

**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 1
**Fire alarm:** Split at the first comma whatever the parentheses: `Attack: 4 (Suasion, Charm), +1` reads as null
**Inject:** src/rules/readmarks.ts:splitComma
**Pulled:** 2026-11-12 — rang: `Attack: 4 (Suasion, Charm), +1` read as null
## Test: Influence and Defend
**Purpose:** `Name ±Level` and the three Defend forms
**Input:** `Money +Maj`, `Uncertain -Sig`, `Distrust`, `2`, `mental 2 / psych 4`, `6 / 5`
**Expected:** `{Money, +1, Maj}`, `{Uncertain, −1, Sig}`, `{Distrust, level null}`; Defend `{2,2}`,
`{2,4}`, `{6,5}`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 2
**Fire alarm:** Drop the Unicode minus from MINUS: `Uncertain −Sig` reads as a bare name with no Level
**Inject:** src/rules/readmarks.ts:MINUS
@alarm-hash: 10d2ae2d9da1f72f
**Pulled:** 2026-11-12 — rang: `Uncertain −Sig` read as a bare name, sign and Level null
## Test: offers and spending
**Purpose:** the pen offer, and spend keeps the rest of the text
**Input:** plain `Infer: 4, +2`; `Money +Maj` under a Resources heading; `Money +Maj (bank)` spent by 1
**Expected:** `act`; `res`; `Money +Sig (bank)`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 3
**Fire alarm:** In spend, rebuild the text as name, sign and Level, dropping what follows the Level: `(bank)` is lost
**Inject:** src/rules/readmarks.ts:spend
**Pulled:** 2026-11-12 — rang: spend gave `Money +Sig` instead of `Money +Sig (bank)`
