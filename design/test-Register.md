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
