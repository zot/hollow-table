# Test Design: Register
**Source:** crc-Register.md

## Test: the Round runs from 0 to 99
**Purpose:** R115, R284: ▲ ▼ never take the Round below 0 or above 99
**Input:** ▼ at 0; ▲ at 98; ▲ at 99
**Expected:** 0; 99; 99
**Refs:** crc-Register.md
**Code:** `src/ui/register.test.ts`
**Alarm:** 1
**Fire alarm:** In stepped, drop the cap: ▲ at 99 gives 100
**Inject:** src/ui/register.ts:stepped
**Pulled:** 2026-11-12 — rang: ▲ at 99 gave 100

## Test: End ends the Conflict
**Purpose:** R117, R99: one change sets the Round to 0, recharges Damage, empties the used piles
(plain cards home, taps gone), clears used marks, and removes CRIT! cards wherever they are
**Input:** Round 4; Sam's Sig Bias spent 2; a plain card and a tap in the used pile; a used card in
Sam's Main; a CRIT! card in Sam's Main
**Expected:** Round 0; nothing spent; the plain card in the drawer, unused; the tap gone; the Main
card unused, still in Main; the CRIT! card gone
**Refs:** crc-Register.md, crc-Tap.md
**Code:** `src/ui/register.test.ts`
**Alarm:** 2
**Fire alarm:** In ended, send every used-pile card home (taps too): the spent tap comes back to the drawer
**Inject:** src/ui/register.ts:ended
**Pulled:** 2026-11-12 — rang: the spent tap came back to the drawer

## Test: End clears the Mild slots
**Purpose:** R338: End's one change empties every character's Mild slots
**Input:** Sam's Mild Bias named, with a box checked, then End
**Expected:** Sam's Mild Bias has no name and no box checked; his Sig Bias keeps its name
**Refs:** crc-Register.md, crc-Absorb.md
**Code:** `src/ui/register.test.ts`
**Alarm:** 3
**Fire alarm:** in ended, put the recharged character without mildEnds; red: the Mild Bias keeps its name
**Inject:** src/ui/register.ts:ended
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "End ends the Conflict" failed, the Mild Bias kept `Sore loser` and its box; restored clean

## Test: End takes what Mild gave
**Purpose:** R344: End applies Tap.mildGone to every tapped card it doesn't already delete: an unrolled Mild tap goes from the table, a mixed one keeps what its other source gave
**Input:** Sam's Mild Bias tapped into a card left on the table, never rolled; a card in his Bias slot fed 2 Levels by his Sig Bias and 1 by his Mild Bias, current Mild, 6 points; then End
**Expected:** the first card gone; the second at 4 points, ledger `{sig: 2}`, current Sig, still in the slot
**Refs:** crc-Register.md
**Code:** `src/ui/register.test.ts`
**Alarm:** 4
**Fire alarm:** in ended, leave tapped cards outside the used piles alone (skip mildGone); red: the unrolled Mild tap is still on the table
**Inject:** src/ui/register.ts:ended
**Pulled:** 2026-11-15 — rang: "End ends the Conflict" failed, the unrolled Mild tap stayed on the table; restored clean
