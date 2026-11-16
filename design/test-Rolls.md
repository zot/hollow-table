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
Outclassed: automatic failure`; `6 + 3 + 2 bonus`, `6 + 3 − 1 bonus`, `6 + 3`; `Success +Maj`,
`Success at cost +Sig`, `Failure −Sig`, `Success +0` (R317); an Attack: `Success 10`, `Success at cost 4`, `Failure −Sig`
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 5
**Fire alarm:** In rowWords, write every range low to high: Disadvantage reads `−6 to −5`
**Inject:** src/net/rolls.ts:rowWords
**Pulled:** 2026-11-12 — rang: Disadvantage read `−6 to −5` (and the resolve receipt with it)

## Test: a roll with no action, and a note
**Purpose:** R382: the fresh row rolls as set, its hand the dice, with no action or Total Influence;
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

## Test: an Attack
**Purpose:** R346: an Attack goes at its own Defend (a Phys Attack at 0) whatever the intent's `defend` says; R307: its kind in the `vs` line; R308: a success carries the Attack on all three receipts; R316: the clicked alternative names the action; a `?` roll is no Attack
**Input:** Sam's `Mental Atk / Req` at Devreux, typed mental with `defend: psych`, typed phys, and typed `?`
**Expected:** `vs Devreux (mental N)` and `vs Devreux (physical M)` with M < N; action `Mental Atk`; `attack` {target Devreux, kind mental} on full, roller and table; the `?` roll has none
**Refs:** crc-Rolls.md
**Code:** src/net/rolls.test.ts
**Alarm:** 7
**Fire alarm:** let the intent's `defend` pick the Defend for an Attack (`const kind = intent.defend`); red: the mental Attack reads `(psych …)` and the phys one isn't below it
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "an Attack" failed with the intent's defend picking the Defend; restored clean

## Test: taking an Attack, and naming it
**Purpose:** R308, R312–R314: only the target's owner (or the GM) takes an Attack, only by one of the GM's own pages, only once; only the attacking character's owner (or the GM) names the Slot it leaves waiting, and every tape hears it
**Input:** the table harness: Ann's Beauford makes a Mental Attack on Dana's Sam; Ann tries to take it, Dana offers a page the GM didn't, Dana takes it by the first page, Dana takes it again by a page that still fits the changed card; Dana then Ann name the waiting Slot
**Expected:** Sam unchanged after Ann's take and the false page; changed after Dana's; unchanged by the second take; the receipt taken with Slots waiting on every tape; the Slot unnamed after Dana's name, named "Suspicious" and no longer waiting after Ann's, on every tape
**Refs:** crc-Rolls.md, crc-Absorb.md, seq-take.md
**Code:** src/net/rolls.test.ts
**Alarm:** 8
**Fire alarm:** drop the target-owner check in `#take` (`if (from && c.owner !== …) return`); red: "not Ann's to take" fails, Sam changed by Ann
**Inject:** src/net/rolls.ts:Rolls.#take
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "taking an Attack, and naming it" failed at "not Ann's to take"; restored clean

## Test: taking an Attack, the GM's own pages
**Purpose:** R314: a take must be one of the GM's own pages, and only once (the same run as above)
**Input:** as above: Dana's false page, then her second take
**Expected:** Sam unchanged by both
**Refs:** crc-Rolls.md, crc-Absorb.md
**Code:** src/net/rolls.test.ts
**Alarm:** 9
**Fire alarm:** drop the `pages(…).some(same)` check and the `a.taken` guard in `#take`; red: "a page the GM did not offer" or "taken once" fails
**Inject:** src/net/rolls.ts:Rolls.#take
**Pulled:** 2026-11-13 — 2026-11-13 — rang: without the pages check, failed at "a page the GM did not offer"; without the taken guard, failed at "taken once" (after the test's second take was given a page that still fits; before that it did not ring); restored clean

## Test: naming, the attacker's owner only
**Purpose:** R313, R314: only the attacking character's owner or the GM names a waiting Slot (the same run as above)
**Input:** as above: Dana names it, then Ann
**Expected:** unnamed after Dana, named after Ann
**Refs:** crc-Rolls.md
**Code:** src/net/rolls.test.ts
**Alarm:** 10
**Fire alarm:** drop the owner check in `#name` (`if (from && by.owner !== …) return`); red: "not Dana's to name" fails
**Inject:** src/net/rolls.ts:Rolls.#name
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "taking an Attack, and naming it" failed at "not Dana's to name"; restored clean

## Test: a kept roll survives a reload
**Purpose:** R308, R313: the GM's page keeps its rolls in its own book, so a fresh page on the same game (a reload) can still take an Attack and name its Slot
**Input:** a GM page with no table rolls Beauford's Mental Attack at Sam; a new Rolls on the same game takes it by its first page; another new one names the waiting Slot
**Expected:** Sam's Slot waits for a name after the take, and is named "Suspicious" after the name
**Refs:** crc-Rolls.md, crc-Records.md
**Code:** src/net/rolls.test.ts
**Alarm:** 11
**Fire alarm:** make `#keep` keep nothing (return at once), as the in-memory map did across a reload; red: "taken by a fresh page" fails
**Inject:** src/net/rolls.ts:Rolls.#keep
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "a kept roll survives a reload" failed (and CRIT, and taking); restored clean

## Test: a CRIT's choice moves an Attack's amount
**Purpose:** R308, R317: switching a CRIT changes the Result an untaken Attack offers; a taken one keeps what was taken
**Input:** a receipt with a CRIT (max 12, dbl 22) and an Attack of 12, switched to dbl; the same with the Attack taken
**Expected:** result 22 and "Success 22"; the taken one stays 12
**Refs:** crc-Rolls.md
**Code:** src/net/rolls.test.ts
**Alarm:** 12
**Fire alarm:** drop the Attack from `choose` (the amount stays at the first choice); red: result 12, not 22
**Inject:** src/net/rolls.ts:choose
**Pulled:** 2026-11-13 — 2026-11-13 — rang: "a CRIT's choice moves an Attack's amount" failed (result stayed 12); restored clean

## Test: pointing at the opposition
**Purpose:** R326, R336, R330: the GM's page looks up what was pointed at by name on its own copy (a Defend number, an action's Base, a Skill's Level plus Cha) and names it in `vs`; a name not on the card falls back to Defend (R328); a pointed Attack is still an Attack
**Input:** Beauford's Infer at Sam pointed at `{def: psych}`, `{act: Shoot}`, `{skl: Investigation}`, `{skl: Flying}`; his Mental Attack pointed at `{def: psych}`
**Expected:** `vs Sam (psych 4 → 10)`, `(Shoot 4 → 10)`, `(Investigation 2 + Cha 2 → 10)`, `(mental 8)`; the Attack `(psych 4 → 10)` with its `attack` still mental
**Refs:** crc-Rolls.md, crc-MarkReader.md
**Code:** src/net/rolls.test.ts
**Alarm:** 13
**Fire alarm:** ignore the intent's `against` in `resolve` (`point = null`); red: every pointed line reads as Defend
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-14 — 2026-11-14 — rang: "pointing at the opposition" failed (psych 4 read as Defend); restored clean

## Test: the rolled action's attribute
**Purpose:** R337: the GM's page adds the target's attribute that the rolled action names to a Skill pointed at
**Input:** Beauford given `Shoot: 3, +1 (unfr, no att)` and `Recall: 3, +1 (Int)`, each rolled at Sam pointed at `{skl: Investigation}` (Sam has a +6 chip in Main)
**Expected:** `vs Sam (Investigation 2 → 8)`, `vs Sam (Investigation 2 + Int 2 → 10)`
**Refs:** crc-Rolls.md, crc-MarkReader.md
**Code:** src/net/rolls.test.ts
**Alarm:** 14
**Fire alarm:** in resolve, call pointed without the action's attribute; red: Shoot reads `Investigation 2 + Cha 2 → 10`
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-15 — 2026-11-15 — rang: "pointing at the opposition" failed, Shoot read `Sam (Investigation 2 + Cha 2 → 10)`; restored clean

## Test: an overflow waits for its Conviction's name
**Purpose:** R339, R340: with every Bias Slot full, a taken Attack starts Sam's Conviction, the receipt lists it as waiting, and the name goes into it
**Input:** the GM's page alone; Sam's Bias Slots all named and boxed; Beauford's Mental Attack at Sam, taken by its one page; then named `Cheats win`
**Expected:** the one page has overflow; `waiting` is `[{damage: 'bias', row: 'lasting'}]` and the Conviction holds the overflow; named, `{name: 'Cheats win', points, spent: 0}` with no `naming`, and nothing waits
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 15
**Fire alarm:** in take, look for waiting names in the rows only (drop `lasting`); red: `waiting` is undefined
**Inject:** src/net/rolls.ts:#take
**Pulled:** 2026-11-15 — rang: "an overflow waits for its Conviction's name" failed, `waiting` undefined; restored clean

## Test: the world as opposition
**Purpose:** R345: the GM's page refuses an unaimed roll with an action; R351: a blank tray refuses, the world is the tray's number and nothing else, its number on the GM's receipt and for the GM's own character only, and an Attack at the world carries nothing to take
**Input:** the playtest scene with Sam's +6 chip and Hunch; Sam's Infer unaimed; at the world, blank; the world set at 4; Devreux's Phys Attack at the world, White 6
**Expected:** "Aim it first."; "The world has no number yet."; the GM's `vs` "the world (4), Difference +6", row Green; Dana's `vs` "the world", row as dice only, the table's "the world"; Devreux's own `vs` with the number; a Success with no `attack`
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 16
**Fire alarm:** drop the refusal of an unaimed roll with an action; red: the unaimed Infer rolls
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-15 — rang: "the world as opposition" failed, the unaimed Infer rolled; restored clean

## Test: a roll uses up the card its action suffered
**Purpose:** R353: the GM's page deletes a `once` card in the roller's pool instead of marking it used; R362: the Total Influence suffers it; R355: the receipt names the variant
**Input:** a Tricky -Min `once` card in Beauford's Main; Beauford's Tricky -Min as Mental Atk at Sam
**Expected:** the receipt's action `Tricky -Min`, Total Influence 3 on Base 5; after the roll the card is gone
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 17
**Fire alarm:** mark a `once` card used like any other; red: the card is still there
**Inject:** src/net/rolls.ts:resolve
**Pulled:** 2026-11-16 — rang: "a roll uses up the card its action suffered" failed, the card was still there; restored clean

## Test: a player's roll is aimed as the GM's page holds it
**Purpose:** R375: the intent's aim is not believed: with no aim held the roll waits; aimed at Beauford on the GM's page, a request naming Devreux rolls against Beauford
**Input:** Sam given to Dana; Dana's Infer naming Devreux, nothing held; then the GM aims Sam's row at Beauford and Dana asks again naming Devreux
**Expected:** "Aim it first."; then the roll, the GM's receipt `vs Beauford`
**Refs:** crc-Rolls.md
**Code:** `src/net/rolls.test.ts`
**Alarm:** 18
**Fire alarm:** believe the intent's aim (resolve the intent as sent); red: the first request rolls against Devreux
**Inject:** src/net/rolls.ts:#intent
**Pulled:** 2026-11-16 — rang: "a player's roll is aimed as the GM's page holds it" failed, the first request rolled; restored clean
