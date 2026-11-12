# Test Design: RollRow
**Source:** crc-RollRow.md

## Test: docking and starting fresh
**Purpose:** R68, R69, R78: a pool's die docks the row there, fresh; the same die again starts
fresh; clearing the Base starts fresh; the GM's private switch stays
**Input:** dock on Sam; then Sam busy with Infer, an opponent and private, docked on Sam again, on
Beauford, and cleared
**Expected:** no action, no opponent, no row, hand one Yellow and +0; fresh on Sam with private kept;
on Beauford; fresh with private kept
**Refs:** crc-RollRow.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 1
**Fire alarm:** In dock, keep a busy row when the same pool's die is clicked: Sam's Infer survives the click
**Inject:** src/ui/rollrow.ts:dock
**Pulled:** 2026-11-12 — rang: Sam's busy Infer survived a click on his own die

## Test: an action, the hand and the row
**Purpose:** R76, R82, R276, R72: an action resets the hand, and the row to White unless aiming; a
picked row is held while aiming
**Input:** a row picked Green with a Yellow added and the bonus lowered, then Infer; the same while
aiming at Devreux, then Impress
**Expected:** Infer with the hand at 0, 0, no row, not by hand; while aiming, Green and by hand
**Refs:** crc-RollRow.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 2
**Fire alarm:** In withAction, keep the row whether or not aiming (the mockup's carry-over): Infer keeps Green
**Inject:** src/ui/rollrow.ts:withAction
**Pulled:** 2026-11-12 — rang: Infer kept the Green row though not aiming

## Test: what the row shows
**Purpose:** R79–R81: Base and Total Influence with its parts; the card as written until the Bonus
pool adds, then regrouped; the hand on top; with no action, the hand is the dice
**Input:** Sam's Infer (`4, +2`); then +4 in Main and +2 in Bonus; a Yellow by hand; Sam with no action
**Expected:** Infer, base 4, total 4, 0 Yellows, +2, White; total 8, Main 4, 1 Yellow, +1; 2
Yellows; no label, no total, 1 Yellow, +0
**Refs:** crc-RollRow.md, crc-Odds.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 3
**Fire alarm:** In shown, leave the Bonus pool out: Sam's Infer stays at 0 Yellows, +2
**Inject:** src/ui/rollrow.ts:shown
**Pulled:** 2026-11-12 — rang: with the Bonus pool left out, Infer stayed 0 Yellows, +2

## Test: who rolls for whom
**Purpose:** R68, R71: a character's owner, or the GM for anyone; nobody for an open character
**Input:** Sam (Dana's) for Dana, Ann and the GM; Devreux (the GM's) for Dana and the GM; an open Sam for the GM
**Expected:** true, false, true; false, true; false
**Refs:** crc-RollRow.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 4
**Fire alarm:** In rollsFor, let anyone at the table roll: Ann rolls for Sam
**Inject:** src/ui/rollrow.ts:rollsFor
**Pulled:** 2026-11-12 — rang: Ann could roll for Sam

## Test: aiming at an opponent
**Purpose:** R83–R85, R88: the opponent's Defend and pools (Stagger included) against your total;
the Difference picks the row live, until one is picked by hand, which holds until the next aim;
stopping keeps a picked row and drops a Difference row; whether the rolling character's owner sees
the opponent
**Input:** Sam's Infer aimed at Devreux's mental Defend; +6 in Sam's Main; −4 in Devreux's Stagger;
Red picked; aimed again at psych; Green picked and stopped; aimed and stopped; the GM's Devreux at Sam
**Expected:** Defend 6 / 5; Devreux 6, −2, not seen, White; +4, `+1`; Devreux 2; Red; 1,
`green+1`; Green with no opponent; White; seen
**Refs:** crc-RollRow.md, crc-Odds.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 5
**Fire alarm:** In shown, let a picked row give way to the Difference: Red picked by hand reads `+1`
**Inject:** src/ui/rollrow.ts:shown
**Pulled:** 2026-11-12 — rang: Red picked by hand gave way to the Difference

## Test: a Roll asks by names
**Purpose:** R100: the request names things, never numbers; the row goes along only when picked by
hand, or set with nobody aimed at
**Input:** Sam's Infer; with Green picked; aimed at Devreux with a Difference row of Red; aimed with
Red picked by hand
**Expected:** pool, action, no opponent, mental, the hand, no row; row Green; no row; row Red
**Refs:** crc-RollRow.md, crc-Rolls.md
**Code:** `src/ui/rollrow.test.ts`
**Alarm:** 6
**Fire alarm:** In intentOf, send the row whenever one is set: the Difference row Red goes along
**Inject:** src/ui/rollrow.ts:intentOf
**Pulled:** 2026-11-12 — rang: the Difference row Red went along with the request
