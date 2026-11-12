# Test Design: Tap
**Source:** crc-Tap.md

## Test: the ledger
**Purpose:** Levels move between sources and a card, and come back only to where they came from
**Input:** Sam's Resources `Money +Maj`, `Ammo +Sig`. Steps, with the card (Level, ledger) and Sam's
Resources after each:
1. tap Money: card `Money +Min {r1:1}`; Resources `Money +Sig, Ammo +Sig`
2. click the card: `Money +Sig {r1:2}`; `Money +Min, Ammo +Sig`
3. shift-click: `Money +Min {r1:1}`; `Money +Sig, Ammo +Sig`
4. drop Ammo's glyph on the card: `Money +Sig {r1:1, r2:1}`; `Money +Sig, Ammo +Min`
5. click (Ammo is now the current source): `Money +Maj {r1:1, r2:2}`; `Money +Sig, Ammo +0`
6. click with Ammo dry: no change
7. shift-click three times: `Money +Min {r1:1, r2:0}`; `Money +Sig, Ammo +Sig` (only Ammo's 2 come
   back; Money's 1 stays, since Ammo is the current source)

**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 1
**Fire alarm:** In feed, keep the card's current source when another is dropped on it: step 4 feeds Money and shows `Money +Sig {r1:2}`
**Inject:** src/rules/tap.ts:feed
**Pulled:** 2026-11-12 — rang: step 4 fed Money: `Money +Sig {r1:2}` instead of `{r1:1, r2:1}`
## Test: refusals and refunds
**Purpose:** a plain card can't be fed; a used card starts a new one; a killed tap refunds
**Input:** tap onto a plain `Keep the Peace` chip in a pool; tap onto a used card; Beauford's
`Liquid Courage +Sig` tapped and the card killed
**Expected:** no merge (the plain chip and a new card side by side); a new card beside the used
one; Beauford's Resources back to `Liquid Courage +Maj`
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 2
**Fire alarm:** Let kill refund a used card too (drop `card.used`): the last check returns Beauford
**Inject:** src/rules/tap.ts:kill
**Pulled:** 2026-11-12 — rang: killing the used card returned Beauford instead of nothing
## Test: Damage slots
**Purpose:** a slot needs a name; Damage Levels; a box is a Resource of its own with its slot's name
(R61, R62, R210)
**Input:** Sam's Sig Bias `Uncertain` with box 1 checked (the slots as on Samuel Diamond's card,
*A Ghoulish Problem*); tap the slot; click; click again; tap the box onto the card; End; tap the
unnamed Sig Injury and the unchecked box 2
**Expected:** card `Uncertain −Min {r4:1}`, a Bias Influence; click `Uncertain −Sig {r4:2}` and the
slot shows `−2`; the next click refused (a Sig slot holds 2); with the box `Uncertain −Maj {r4:2, r5:1}`;
End clears what was spent; the unnamed slot and the unchecked box refused. That a box can't be
checked before its slot has a name is PieceView's (R62).
**Refs:** crc-Tap.md, crc-Influence.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 3
**Fire alarm:** Count a slot's Levels without what was spent (`left: rowLevels(row)`): the third feed from the Sig slot succeeds instead of being refused
**Inject:** src/rules/tap.ts:inBack
**Pulled:** 2026-11-12 — rang: the third feed from the Sig slot succeeded instead of being refused (`tap.test.ts:93`)

## Test: only res marks on the front are sources
**Purpose:** on the front, only `<res>` marks are tapped; Damage lives only in its slots (R54, R209)
**Input:** Sam's front with `<inf>Luck +Sig</inf>` and `<inj>Broken Leg -Sig</inj>` added; tap
`Luck`; tap `Broken Leg`; tap `Money`
**Expected:** `Luck` and `Broken Leg` refused; `Money` taps
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 4
**Fire alarm:** Read every mark on the front as a source (drop the `'res'` filter in inFront): `Luck` taps
**Inject:** src/rules/tap.ts:inFront
**Pulled:** 2026-11-12 — rang: `Luck` in an `<inf>` mark tapped instead of being refused

## Test: a box draws on its own column and row
**Purpose:** a checked box spends its own Levels, from its own column and row (R210)
**Input:** Sam's Mild Bias `Jumpy`, Sig Bias `Uncertain` and Sig Injury `Broken Leg`, each with box 1
checked; tap `injury/sig#1`
**Expected:** card `Broken Leg −Min {injury/sig#1:1}`, an Injury Influence; the Sig Injury has spent 1
on its box and nothing on the slot; the Biases nothing
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 5
**Fire alarm:** Spend a box's Levels from its slot (`spent[0]` for `spent[k]`): the Sig Injury reads `[1]` instead of `[0, 1]`
**Inject:** src/rules/tap.ts:inBack
**Pulled:** 2026-11-12 — rang: the Sig Injury's box spent from its slot: `[1]` instead of `[0, 1]` (and the Sig Bias read `[3]` instead of `[2, 1]`)

## Test: a card takes only its own kind
**Purpose:** a Damage card takes only its kind; a `<res>` card no Damage (R211); anyone may tap (R212)
**Input:** Sam's Sig Bias `Uncertain`, Sig Affliction `Ashamed`, Sig Injury `Broken Leg`; a card tapped
from the Bias and one from Money; feed the Bias card from the Injury, the Affliction and Ammo; feed
the Money card from the Bias; feed the Bias card from its own source
**Expected:** the four mixed feeds refused; the Money card has no kind; the Bias card takes its own
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 6
**Fire alarm:** Let feed take any source (drop the kind check): the Injury feeds the Bias card
**Inject:** src/rules/tap.ts:feed
**Pulled:** 2026-11-12 — rang: the Injury fed the Bias card instead of being refused

## Test: what a source has left
**Purpose:** R250: Tap.left gives the Levels a source can still be tapped for, which fades a dry glyph
**Input:** Sam's Ammo before and after a tap and a feed take both its Levels; Money; an unknown name;
an unnamed Injury slot; the Sig Bias `Uncertain` with its first box checked, the slot, the box and the
unchecked second box
**Expected:** 2, then 0; 3; 0; 0; 2, 2, 0
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 7
**Fire alarm:** In left, read only the front: the named Bias slot has 0 left, its glyph faded
**Inject:** src/rules/tap.ts:left
**Pulled:** 2026-11-12 — rang: the named Sig Bias slot read 0 left instead of 2

## Test: tapping a Motivation
**Purpose:** R260–R262: a Motivation makes a Main Pool card of its sign, spends into its
parentheses, recharges at a scene's end, refunds back to full, and feeds only Motivation cards
**Input:** Devreux's playtest Motivations, spent out; a tap before and after rechargeMotives; a feed
from Money and one from Self-Preservation; the card killed; Sam's Money card fed from Keep the Peace
**Expected:** all three read `(0)` and refuse a tap; after the recharge no parentheses and a card with
`mot`, sign +1, 2 points, no Damage kind; Keep the Peace `(+Min)`; Money refused; Self-Preservation
feeds it to 4 and reads `(+Min)`; the kill restores both to full; Money's card refuses the Motivation
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 8
**Fire alarm:** In feed, drop the Motivation check: Money feeds the Motivation card
**Inject:** src/rules/tap.ts:feed
**Pulled:** 2026-11-12 — rang: Money fed the Motivation card instead of being refused

## Test: who may tap
**Purpose:** R259: a `<res>` only by its character's owner or the GM; anyone's Motivations and Damage
**Input:** Sam's Money for his owner, another player, the GM and nobody; Devreux's Keep the Peace for
three; Devreux's Money for two players; Sam's named Sig Bias for another player; an unknown source
**Expected:** true, false, true, false; true for all; false, false; true; false
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
**Alarm:** 9
**Fire alarm:** In mayTap, let anyone tap a Resource (drop the owner check): another player taps Sam's Money
**Inject:** src/rules/tap.ts:mayTap
**Pulled:** 2026-11-12 — rang: another player could tap Sam's Money
