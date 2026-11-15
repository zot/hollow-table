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

## Test: a Motivation spends into its parentheses
**Purpose:** R261: a Motivation's written Level stays and the Levels left follow it in parentheses,
gone again when back to full
**Input:** Keep the Peace +Sig spent 1, then 1, then 1 more; given back 1, then 1; given back at full;
Paranoia −Maj spent 1; a name with its own parentheses spent 1; motiveLeft of four texts; unadjusted;
influence of a spent text
**Expected:** `(+Min)`, `(0)`, null; `(+Min)`, no parentheses; unchanged; `(-Sig)`; the name's
parentheses kept; 1, 1, 0, 2; the bare text; the name without the parentheses
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 4
**Fire alarm:** In adjust, keep the parentheses when back to full: Keep the Peace +Sig refunded reads `(+Sig)`
**Inject:** src/rules/readmarks.ts:adjust
**Pulled:** 2026-11-12 — rang: Keep the Peace +Sig refunded to full read `(+Sig)` instead of no parentheses

## Test: a Motivation line is offered the Motivation pen
**Purpose:** R258: `Name ±Level` under a Motivations heading is offered the Motivation pen, either sign
**Input:** a positive and a negative line under Motivations (and Motivation); a Resource line; a
name with no Level
**Expected:** `mot`, `mot`, `res`, null
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 5
**Fire alarm:** Offer the Motivation pen only for a positive Level, like a Resource: Sparkers Are Trouble −Min gets none
**Inject:** src/rules/readmarks.ts:offer
**Pulled:** 2026-11-12 — rang: Sparkers Are Trouble −Min under Motivations was offered no pen

## Test: attributes
**Purpose:** R267: `Name N` pairs read from an `<att>` mark; a plain line of two or more offered the pen
**Input:** `Cha 2   Int 2   Wis 4`; `Con −1  Wis 10`; offers for Devreux's attribute line, her
"Saloon Proprietor, Rank 3", "Sparked: 46  Grains: 14", and `Wis 4` alone
**Expected:** `{Cha 2, Int 2, Wis 4}`; `{Con −1, Wis 10}`; `att`, null, null, null
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 6
**Fire alarm:** Offer the Attributes pen for one pair: `Wis 4` alone, and "Rank 3", are offered it
**Inject:** src/rules/readmarks.ts:offer
**Pulled:** 2026-11-12 — rang: `Wis 4` alone was offered the Attributes pen

## Test: Fields, Skills and their pens
**Purpose:** R323, R324: a Field by its Level and XP (a ✓ or a Rank is no Field); a `Skills N:` line split at commas outside parentheses; R207: the Field and Skill pens offered, a plain line only under a Field
**Input:** `Private Investigator 2 (5XP)`, `✓ Glimmersense (x2) 3`, `Saloon Proprietor, Rank 3`, `Skills 2: Profession (Saloon Keeper, Bar), Tact`; offers for a Field, a Skills line, and Composure with and without a Field above
**Expected:** {Private Investigator, 2}; null; null; two Skills; `fld`, `skl`, null, `skl`
**Refs:** crc-MarkReader.md
**Code:** src/rules/readmarks.test.ts

## Test: what a drop can point at
**Purpose:** R326, R336: every Defend number, action Base, Field and Skill on a card, where it is in its line, its base (a Field or Skill: Level plus the attribute asked for, Cha by default) and its words; a Field's Skills end at anything else; a ✓ is one Level higher; an XP note is no part of a name
**Input:** Sam's front with its Fields and Skills marked, a Skill under a heading, a heading straight after a Field's Skill, and Beauford's `Rhetoric (Salesman) (x2)` and `Finesse (x2, Rhetoric)`
**Expected:** the list in order with bases 4, 4, 4, 4, 5, 3, 3, 4, 2, 4; nothing for the Skill under the heading; `Rhetoric (Salesman) 3 + Cha 1`, `Finesse 3 + Cha 1`
**Refs:** crc-MarkReader.md
**Code:** src/rules/readmarks.test.ts
**Alarm:** 7
**Fire alarm:** never end a Field's Skills (drop the `fieldLevel = null` reset after a line with anything else); red: the Skill under the heading gets a Level and can be pointed at
**Inject:** src/rules/readmarks.ts:points
**Pulled:** 2026-11-14 — 2026-11-14 — rang: "what a drop can point at" failed (a Skill after a heading got a Level), once the test put a heading straight after a Field's Skill; before that it did not ring, a Skills line had already ended the Field; restored clean

## Test: an action's attribute
**Purpose:** R337: the attribute an action's roll uses is a whole entry in its parentheses, `no att` for none and `Int` for Int, any case, among other entries; else Cha
**Input:** `Shoot: 4, +2 (unfr, x2, no att)`, `Expertise: 3, +1 (Int)`, `Recall: 3 (Accounting, INT), +1`, `Infer: 4 (Intuition), +2`, and every plain action in the action test
**Expected:** null, `Int`, `Int`, `Cha`; the plain actions `Cha`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 8
**Fire alarm:** in actionAtt, take an entry that merely contains "int" as Int; red: `Infer: 4 (Intuition), +2` reads Int
**Inject:** src/rules/readmarks.ts:actionAtt
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "action lines" failed, `Infer: 4 (Intuition), +2` read Int; restored clean

## Test: the attribute a Field or Skill adds
**Purpose:** R336: a Field or Skill pointed at adds the target's attribute that was asked for: none adds nothing and says nothing, Int adds the card's Int, an attribute the card doesn't list counts 0
**Input:** Sam's Investigation pointed at with none and with Int; a card with only Cha, its Field with Int
**Expected:** base 2 `Investigation 2`; base 4 `Investigation 2 + Int 2`; base 3 `Snakeoil Salesman 3 + Int 0`
**Refs:** crc-MarkReader.md
**Code:** `src/rules/readmarks.test.ts`
**Alarm:** 9
**Fire alarm:** in points, ignore `att` and add the card's Cha as before; red: the none case reads `Investigation 2 + Cha 2`
**Inject:** src/rules/readmarks.ts:points
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "what a drop can point at" failed, the none case read base 4 `Investigation 2 + Cha 2`; restored clean
