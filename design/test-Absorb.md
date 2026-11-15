# Test Design: Absorb
**Source:** crc-Absorb.md

## Test: free Slots follow Wis and what is used
**Purpose:** a row's named Slot and boxes are free only while unused; a Slot waiting for a name is not free (R315)
**Input:** Sam with Wis 4 (one Mild, three Min, one Sig, one Maj); then the Min Slot named, a Min box checked, the Sig Slot waiting for a name
**Expected:** free bias = mild 1, min 3, sig 1, maj 1; after the changes, min 1 and sig 0
**Refs:** crc-Absorb.md
**Code:** src/rules/absorb.test.ts
**Alarm:** 1
**Fire alarm:** let a Slot waiting for a name count as free (drop `!s.naming` from namedFree); red: sig reads 1, not 0
**Inject:** src/rules/absorb.ts:namedFree
@alarm-hash: 0ceaf24366e879de
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "free Slots follow Wis and what is used" failed (sig counted free); restored clean

## Test: the pages for Sam taking 5
**Purpose:** every covering set with none to spare, each once (R310, Bill's ruling of 11-13)
**Input:** Sam (Wis 4, nothing used), a mental Attack with Result 5
**Expected:** five pages, fewest points first, then fewest Slots: Maj; Sig + Min; Sig + Mild; Min + Min + Min; Mild + Min + Min. Not Mild + Min + Sig, since dropping the Mild still covers it
**Refs:** crc-Absorb.md
**Code:** src/rules/absorb.test.ts
**Alarm:** 2
**Fire alarm:** drop the none-to-spare test (keep only `sum >= left`); red: wasteful sets such as Mild + Min + Sig appear among the pages
**Inject:** src/rules/absorb.ts:pages
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "the pages for Sam taking 5" and "absorb comes off first" failed (spare Slots among the pages); restored clean

## Test: only a Maj left takes a single point
**Purpose:** a last point uses a larger Slot when that is all that is free (Bill: "they must use the Maj slot to cover it")
**Input:** a back whose Biases have only the Maj Slot free; Result 1
**Expected:** one page: Maj
**Refs:** crc-Absorb.md
**Code:** src/rules/absorb.test.ts

## Test: absorb comes off first
**Purpose:** the column's absorb (Wis 5: 1) comes off the Result before Slots fill; all absorbed is one empty page
**Input:** a character with Wis 5; mental Results 1 and 3
**Expected:** Result 1: one empty page; Result 3: the pages for 2, any single Slot: Min, Mild, Sig, Maj
**Refs:** crc-Absorb.md, crc-Influence.md
**Code:** src/rules/absorb.test.ts
**Alarm:** 3
**Fire alarm:** stop subtracting the column's absorb (`left = result`); red: Result 1 gives four one-Slot pages instead of one empty page
**Inject:** src/rules/absorb.ts:pages
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "absorb comes off first" failed; restored clean

## Test: overflow
**Purpose:** nothing covers it: every free Slot fills, and a physical Attack's rest is a Condition in the Notes (R339)
**Input:** a back with only one Min Injury Slot free; a physical Result of 5
**Expected:** one page: Min, overflow 3; filling it makes the Min Slot wait for a name and adds "Condition: 3 from Beauford's Attack" to the Notes
**Refs:** crc-Absorb.md
**Code:** src/rules/absorb.test.ts

## Test: filling uses a row in order
**Purpose:** a row's named Slot first, then its unchecked boxes; the named Slot waits for the attacker's name (R312)
**Input:** Sam, Biases empty; a page using Min 2
**Expected:** the Min Slot waits for `{by: 'Beauford', id}`; its first box is checked; nothing else changes
**Refs:** crc-Absorb.md
**Code:** src/rules/absorb.test.ts
**Alarm:** 4
**Fire alarm:** check boxes before the named Slot (skip setting `naming` when the Slot is free); red: the Min Slot has no `naming` and both boxes are checked
**Inject:** src/rules/absorb.ts:fill
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "filling uses a row in order" and "overflow" failed (no naming on the Min Slot); restored clean

## Test: Mild Damage ends
**Purpose:** R338: mildEnds empties every Mild slot in all three columns, name, boxes (their number kept), spent and naming, and leaves every other row as it was
**Input:** Sam with a named Mild Bias with one of two boxes checked and 1 spent, a Mild Injury waiting for a name, and a named Min Affliction with a checked box
**Expected:** each Mild slot `{name: '', boxes: [false, false] (or as many as it had), spent: []}` with no `naming`; the Min Affliction unchanged
**Refs:** crc-Absorb.md
**Code:** `src/rules/absorb.test.ts`
**Alarm:** 5
**Fire alarm:** in mildEnds, clear the name but keep the boxes; red: the Mild Bias keeps its checked box
**Inject:** src/rules/absorb.ts:mildEnds
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "Mild Damage ends" failed, the Mild Bias kept its checked box; restored clean

## Test: overflow makes a Conviction, and more grows it
**Purpose:** R339, R340: a mental overflow starts the Biases' Conviction, waiting for the attacker's name, not a Note; more overflow adds its points and keeps its name; a psychological one is a Burden beside it
**Input:** Sam with every Bias Slot used; a mental Result of 3; then, named `Cheats win` with 1 spent, a mental Result of 4; then every Affliction Slot used and a psychological Result of 2
**Expected:** `lasting.bias` `{name: '', points: 3, spent: 0, naming: {by: 'Beauford', id: 'r9'}}` and the Notes unchanged; then `{name: 'Cheats win', points: 7, spent: 1}`; then both `bias` and `affliction`, the Burden at 2 points
**Refs:** crc-Absorb.md
**Code:** `src/rules/absorb.test.ts`
**Alarm:** 6
**Fire alarm:** in fill, drop the Conviction branch so every overflow is a Note; red: no `lasting` after the first overflow
**Inject:** src/rules/absorb.ts:fill
**Pulled:** 2026-11-15 — rang again after the simplifier pass (isLasting): "overflow makes a Conviction, and more grows it" failed; restored clean *Earlier —* 2026-11-15 — rang: "overflow makes a Conviction, and more grows it" failed, no `lasting` after the first overflow; restored clean
## Test: a Conviction's Level follows its points
**Purpose:** R341: Hollow Folks' ladder for Convictions and Burdens: Min to 2 points, Sig to 6, Maj to 12, Ext to 20, Exq beyond; the top of each Level
**Input:** points 0, 1, 2, 3, 6, 7, 12, 13, 20, 21, 30, 45
**Expected:** Levels 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5; tops 2, 2, 2, 6, 6, 12, 12, 20, 20, 30, 30, 30
**Refs:** crc-Absorb.md
**Code:** `src/rules/absorb.test.ts`
**Alarm:** 7
**Fire alarm:** use the Influence ladder (2 points a Level, tops 2, 4, 6, 8, 10) for TOPS; red: 3 points reads Sig but 6 reads Maj
**Inject:** src/rules/absorb.ts:lastingLevels
**Pulled:** 2026-11-15 — rang: "a Conviction's Level follows its points" failed on the Influence ladder; restored clean
