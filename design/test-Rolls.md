# Test Design: Rolls
**Source:** crc-Rolls.md

## Test: resolve
**Purpose:** the GM's page looks everything up itself, and each view carries only what its reader may know
**Input:** Dana's Sam, with a +6 chip and one of his Influence cards in his Main, rolls Infer (`4, +2`)
against Devreux's mental Defend (6); faces White 4, Blue 3. Then the same with the row picked by hand
as Red, and an action Sam doesn't have; then Devreux's Attack, applied, and Sam again
**Expected:** the GM's receipt (R279): "Sam, roll 1", action Infer, Total Influence 10, base 4, row
"+3 to +4 Weak Advantage: White + 1", `vs` "Devreux (mental 6), Difference +4", resolution "White 4
+ 1", Level "3 + 2 bonus", "Success 5, Significant", by Dana. Dana's: the same numbers, but `vs
Devreux` and row "White + 1" (she can't see Devreux). The table's: no Total Influence, base or row;
`vs Devreux`. Sam's count is 1 (R278) and his card in his pool is used. The hand-picked row is
"−5 to −6 Disadvantage: Red", read "lower of White 4 and Red 2", titled "Sam, roll 2". The
missing action is refused, saying so. Devreux's is "Devreux, roll 1", and Sam's next is still
"Sam, roll 2"
**Refs:** crc-Rolls.md, crc-Odds.md, crc-Dice.md, seq-roll.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 1
**Fire alarm:** Give the roller the full `vs` whatever they can see: Dana's receipt reads `Devreux 6 (+4)`
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-12 — rang: Dana's receipt read the full `vs` (`rolls.test.ts:39`)

## Test: a roll at the table
**Purpose:** a player's roll goes through the GM's page and each tape prints its own view
**Input:** the GM's page, Dana (Sam) and Ann (Beauford) over a fake room. Dana rolls Sam's Infer
against Devreux; Dana asks to roll Beauford; the GM's page away, Dana rolls; a page that hasn't heard
the GM rolls
**Expected:** Dana's tape: her view, with ✓; Ann's: the table view, rolled by Dana; the GM's: the Once the GM's page has gone (Rolls.left), a request says at once "Nobody can roll: the GM isn't at the table." (R103).
full receipt. Beauford: refused, "Beauford isn't yours to roll." Away: after 10 s "The GM's page
didn't answer that roll." Unheard: "Nobody can roll: the GM isn't at the table." The request named
no numbers
**Refs:** crc-Rolls.md, seq-roll.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 2
**Fire alarm:** Let anyone roll any character (drop the owner check): Dana's roll of Beauford goes through
**Inject:** src/net/rolls.ts:Rolls
**Pulled:** 2026-11-12 — rang: Dana's roll of Beauford went through

## Test: CRIT
**Purpose:** a CRIT takes the larger result, adds or strengthens CRIT!, and its owner can switch and lock it
**Input:** Dana rolls Sam's Infer with White 6, Blue 5 (a CRIT); again with a CRIT; Dana switches the
first to the other result and locks it (Ann's try at it first); then tries to switch it back
**Expected:** both results printed, the larger chosen; a CRIT! +Min card in Sam's drawer, then Sig;
Ann's switch is ignored; after Dana's every tape shows the other result, locked; the locked one
doesn't switch back
**Refs:** crc-Rolls.md, seq-roll.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 3
**Fire alarm:** Mint a new CRIT! card every time instead of strengthening the one there: two CRIT! cards of 2
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-12 — rang: a second CRIT! card was minted instead of strengthening the first

## Test: private rolls and gaps
**Purpose:** a private roll sends nothing; a lost roll is noticed
**Input:** the GM's private roll; one roll lost on the way to Ann; then 22 lost
**Expected:** "Private" on the GM's tape and nothing sent; Ann's tape "1 roll from the GM didn't
arrive", then "Many rolls from the GM didn't arrive"
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 4
**Fire alarm:** Send private rolls too: a roll message is sent
**Inject:** src/net/rolls.ts:Rolls
**Pulled:** 2026-11-12 — rang: the private roll went out, printed without `priv` (`rolls.test.ts:133`)

## Test: a receipt in the book's words
**Purpose:** R279: every row in full (its range, nearer zero first below zero; the book's name; its
dice); the Level as the dice add up, the bonus left out on a Failure; the outcome's words
**Input:** the nine rows; a White 2, Blue 6, a removed Yellow 4 and an exploded Yellow 3, with bonus
+2, −1, and +2 on a Failure; a Success 12, a Success at cost 5, a Failure 3
**Expected:** `+10 or more Outclass: automatic success` … `−5 to −6 Disadvantage: Red` … `−10 or less
Outclassed: automatic failure`; `6 + 3 + 2 bonus`, `6 + 3 − 1 bonus`, `6 + 3`; `Success 12, Major`,
`Success at cost 5, Significant`, `Failure 3, Minor Stagger`
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 5
**Fire alarm:** In rowWords, write every range low to high: Disadvantage reads `−6 to −5`
**Inject:** src/net/rolls.ts:rowWords
**Pulled:** 2026-11-12 — rang: Disadvantage read `−6 to −5` (and the resolve receipt with it)

## Test: a roll with no action, and a note
**Purpose:** R69: the fresh row rolls as set, its hand the dice, with no action or Total Influence;
R281: why not prints on the tape as a note with the time
**Input:** Sam with no action, two Yellows and +1 by hand, Green picked; faces 4, 2, 3, 5, 1; then
a note on a GM's page with no table
**Expected:** "Sam, roll 1", no action, no Total Influence, two Yellows, "+5 to +6 Advantage:
Green", Level "3 + 5 + 1 + 1 bonus"; the note titled with the text, outcome `missing`, at the clock's time
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 6
**Fire alarm:** In resolve, refuse a roll with no action (as before): Sam "has no action"
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-12 — rang: Sam with no action was refused, "has no action"
