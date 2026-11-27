# Test Design: the table in the browser
**Source:** crc-TableView.md

One page (the GM's, through the test hook), in Chromium and Firefox, from the playtest scene (Sam:
Player 1, Beauford: Player 2, Devreux: GM; the big sticky). Pieces are taken and
carried with the mouse, as a person does; measurements wait for the web fonts.

## Test: characters and pools
**Purpose:** the bar's desk and chips (R591); making, carrying, burying and digging up characters; the strips
**Expected:**
- the bar holds the desk (its six pigeonholes on the GM's page), eight chips, Boot Hill and the register, and no paper supply of its own;
  under the wordmark, a local build says just "dev" (R305)
- a character dropped on the table: its pool above its card, gathered, the GM's; one dropped near
  the top lies below the bar; one dropped back on the bar is never made
- a pool's name carries the pool and its gathered card together; the card dragged alone stays
  ungathered, the pool where it was; Gather snaps it back
- Beauford put away buries his pool, card and Stagger chip; dragged out of Boot Hill he comes up at
  the drop, gathered, the chip back in Stagger; the big sticky put away comes back with its text
- an empty pool opens Bonus, Main, Edge and Stagger, with Bias, Affliction and Injury as strips; a
  chip from the bar dropped on Bias opens it and closes Stagger to pay for it
- a press beside a pool's name pans the table and moves nothing
- a chip in a slot and a chip loose on the table both rise by 2 on a click and fall on shift-click
**Refs:** crc-Bar.md, crc-PoolView.md, crc-Drag.md, crc-BootHillView.md, crc-Yards.md
**Code:** `tests/table.spec.ts`
**Alarm:** 1
**Fire alarm:** Find the carried chip only under the press: a chip taken from the bar isn't carried, and Bias stays a strip
**Inject:** src/ui/drag.ts:Drag.startItem
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the bar chip wasn't carried, Bias stayed a strip and the 4-chips never reached Main (Chromium) *Earlier —* 2026-11-13 — rang: the bar chip wasn't carried, so Bias stayed a strip (and the 4-chips never reached Beauford's Main) (Chromium)
## Test: a loose chip answers clicks
**Purpose:** R40 on the table, not only in a slot
**Expected:** a loose 2 clicked is 4, shift-clicked 2 again
**Refs:** crc-TableView.md
**Code:** `tests/table.spec.ts`
**Alarm:** 2
**Fire alarm:** Give a loose chip only its drag: clicks leave it at 2
**Inject:** src/ui/table.ts:TableView
**Pulled:** 2026-11-23 — re-pulled after R479–R482 (TableView changed): rang, the loose 2 stayed 2 when clicked (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R451 (TableView changed): rang, the loose chip's clicks did nothing (Chromium); restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, the loose 2 stayed 2 when clicked (Chromium) *Earlier —* 2026-11-13 — rang: the loose 2 stayed 2 when clicked (Chromium)
## Test: Influence in the browser
**Purpose:** drawers, Roll Up and piles, the kill box, taps merging, secrecy
**Expected:**
- Devreux's drawer reads Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers +Min
- three 4-chips in Beauford's Main Roll Up into a 6; Devreux's two +Sig cards and a 4-chip in his
  Main make a pile, "3 acting as one", showing 6, whose members show when it is opened
- a card dropped on the kill box is gone
- a tap from Sam's Money glyph into his drawer makes a card; a second tap dropped on it merges
- viewing as Player 1, Devreux's drawer is face-down and nameless, Sam's isn't
**Refs:** crc-PoolView.md, crc-Drag.md, crc-Tap.md, crc-Visibility.md
**Code:** `tests/table.spec.ts`

## Test: rolls, tape, register
**Purpose:** the roll row, aiming, receipts, the tape and the register
**Expected:**
- no roll controls in the bar; Devreux's die docks the row; White opens nine rows, words then dice;
  a click away closes it
- Devreux's Attack dragged onto Sam offers Mental and Psych; Mental gives `vs Sam 2 (+2)`, White,
  Sam's pool ringed; Stagger −6 on Sam gives `vs Sam −4 (+8)`, Green + 1; Main +4 on Devreux gives
  `4 → 8`, `(+12)`, Outclass; a row picked by hand holds as pools change; the receipt has Total
  Influence 8 and the Difference
- viewing as Player 1, Sam's action dragged onto Devreux aims at nothing, and the White is locked (R372, R374)
- five rolls print newest first ("Devreux, roll 5"); the paper roll rolls the tape up and down; a
  press on the table lowers it; dragged, the whole roll tears off; the next roll starts a fresh
  tape; the torn roll buries as "Tape: 5 rolls, last Devreux, roll 5"
- ▲ twice is Round 2; End once arms and changes nothing; twice, Round 0
**Refs:** crc-RollRow.md, crc-Tape.md, crc-Register.md
**Code:** `tests/rolls-local.spec.ts`

## Test: the quality floor
**Purpose:** R12–R14, R17
**Expected:** a long press does what shift-click does (Yellows, the bonus, a slot's loose −1, the
graveyard's name); tabbing shows focus on every control but writing (which shows its caret); with
reduced motion nothing on the page transitions or animates; nothing in the bar, the register or a
pool's labels selects as text but the build stamp
**Refs:** crc-Gesture.md
**Code:** `tests/floor.spec.ts`

## Test: the feel of carrying
**Purpose:** R215–R225, R240, R241, R243
**Expected:**
- the big sticky stays glued where it was taken hold of, at the fitted zoom and zoomed in, within a pixel
- dropped, its middle is where it was let go, and stays (no glide)
- held, it is lifted; a change to its record doesn't move it from the hand
- a chip from a slot is carried centred where it was taken; two loose chips lie at their own places
- Devreux's card carried over the table is a card; over Sam's slots a chip, Main lit; over Sam's
  drawer a gap opens, and closes when it leaves
- a tap is in the game the moment its glyph is dragged, held by its left end, the pointing hand on
- with Devreux's card aside, a sticky just under his mat is pushed down when his drawer grows
**Refs:** crc-Drag.md, crc-TableView.md, crc-PoolView.md
**Code:** `tests/drag.spec.ts`
**Alarm:** 3
**Fire alarm:** Redraw a held piece like any other: the sticky jumps from the hand when its record changes
**Inject:** src/ui/table.ts:TableView
**Pulled:** 2026-11-23 — re-pulled after R479–R482 (TableView changed): rang, a held piece was redrawn under the hand (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R451 (TableView changed): rang, a held piece was redrawn under the hand (Chromium); restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, the held sticky jumped from 995,132 when its record changed (Chromium) *Earlier —* 2026-11-13 — rang: the held sticky jumped from 995,132 when its record changed (Chromium)
## Test: a chip in hand
**Purpose:** R216 for a chip from a slot
**Expected:** centred on the pointer within a pixel
**Refs:** crc-Drag.md
**Code:** `tests/drag.spec.ts`
**Alarm:** 4
**Fire alarm:** Let the slot's relative position win on the table: the second loose chip is drawn below the first (and a chip carried among loose ones hangs below the pointer)
**Inject:** src/ui/theme.css
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the second loose chip was drawn below the first (Chromium) *Earlier —* 2026-11-13 — rang: the second loose chip was drawn below the first (Chromium)
## Test: the card and the view
**Purpose:** R252–R256, R463, R268–R272
**Expected:**
- no 3D in a card; the flip turns it to its back
- the damage columns rotate when a name is clicked; the blanks are one length in every column
- the notes' lines don't scale their stroke and move when the notes scroll
- a plain card's Level rises and falls on click and shift-click; shift-click at Min deletes a card
- Keep the Peace dropped on Edge goes home; on Main it stays
- a first visit shows every pool; the wheel zooms between 0.25 and 2.5; an image file dropped from
  the desktop lands where it's dropped
**Refs:** crc-PieceView.md, crc-TableView.md
**Code:** `tests/card.spec.ts`

## Test: pointing at the opposing number
**Purpose:** R326, R336, R329: in the browser, a drag from the Base over a number on the target's card draws the line and a box round just that number; the drop aims at it with no chooser; a drag onto a Skill aims at its Level plus Cha, and the receipt names it
**Input:** the GM's page; Devreux's Attack typed Skill, dragged onto the 4 of Sam's `psych 4`, held, then let go; then onto Investigation, and rolled
**Expected:** `#aimline` drawn, `#aimbox` visible and under 40 px wide, gone after the drop; no chooser; the vs title `Sam: psych 4,…`; then `Sam: Investigation 2 + Cha 2,…` and the receipt `vs Sam (Investigation 2 + Cha 2…`
**Refs:** crc-RollRow.md
**Code:** tests/rolls-local.spec.ts
**Alarm:** 5
**Fire alarm:** make `caretIn` find nothing (return null); red: no box, and the drop falls back to the chooser
**Inject:** src/ui/rollrow.ts:caretIn
**Pulled:** 2026-11-14 — 2026-11-14 — rang: chromium "pointing at the opposing number" failed at the box's toBeVisible; restored and rebuilt clean

## Test: ghost checks on a Field Skill
**Purpose:** R334, R335: in the browser, a ghost ✓ shows before an unchecked Field Skill only while the card is written on; a press in its margin writes the ✓ into the text and saves it, a press on the real ✓ takes it out, and a press on the Skill's name changes nothing
**Input:** the GM's page; Sam's card at rest; then the caret in its front; a press in Investigation's margin; a click on the name; a press in the margin again
**Expected:** at rest the Investigation line's `::before` has no content; writing, it is `"✓"`; after the press the record's front holds `✓ Investigation` and the line hangs (`sklhang`); the click on the name leaves it checked; the second press takes the ✓ out of the record
**Refs:** crc-PieceView.md, ui-card.md
**Code:** `tests/card.spec.ts`
**Alarm:** 6
**Fire alarm:** drop the pens-out guard from the ghost's CSS selector, so it shows at rest; red: the at-rest `::before` content is `"✓"`
**Inject:** src/ui/theme.css
**Pulled:** 2026-11-15 — 2026-11-15 — rang in Chromium and Firefox: the at-rest `::before` content was `"✓"`, expected `none`; restored clean

## Test: a press on a Skill's name is not a check
**Purpose:** R335: only the margin toggles; a press on the Skill's name places the caret as usual
**Input:** as above, the click on Investigation's name after it is checked
**Expected:** the record's front still holds `✓ Investigation`
**Refs:** crc-PieceView.md
**Code:** `tests/card.spec.ts`
**Alarm:** 7
**Fire alarm:** in the front's press handler, drop the margin test so any press on an indented Skill toggles; red: the click on the name takes the ✓ out
**Inject:** src/ui/piece.ts:checkPress
**Pulled:** 2026-11-15 — 2026-11-15 — rang in Chromium and Firefox at card.spec.ts:138: the click on the name took the ✓ out of the record; restored clean

## Test: a press at rest is not a check
**Purpose:** R335: the margin toggles only while the card is written on; at rest, where no ghost shows, a press there just starts the writing
**Input:** the GM's page; a press in Investigation's margin on Sam's card at rest, before anything else
**Expected:** the record's front still holds `<skl>Investigation (x2)</skl>`
**Refs:** crc-PieceView.md
**Code:** `tests/card.spec.ts`
**Alarm:** 8
**Fire alarm:** in checkPress, drop the guard that the front already holds the caret; red: the press at rest checks Investigation
**Inject:** src/ui/piece.ts:checkPress
**Pulled:** 2026-11-15 — 2026-11-15 — rang in Chromium and Firefox at card.spec.ts:133: the press at rest checked Investigation in the record; restored clean

## Test: a Conviction under Biases
**Purpose:** R341: a Conviction draws on a line under Biases, its kind, glyph, name, Level and points over its top, the name on a blank of its own (the column is too narrow for one line); no Burden, no line; a column with one never collapses; R342: points and name are written in place, and written away it is gone
**Input:** the GM's page; Sam given `lasting.bias` `{name: 'Cheats win', points: 7, spent: 0}`; flipped; the points written `5`; then points and name written away
**Expected:** the line reads `Conviction`, `Cheats win`, `Maj`, `7`, `/12`, with one glyph; the name over 100 px wide; the Burden line hidden; the Biases column not `empty`; at 5 points `Sig` and `/6` and the record's points 5; written away, the record has no `lasting` and the line hides
**Refs:** crc-PieceView.md, ui-card.md
**Code:** `tests/card.spec.ts`
**Alarm:** 9
**Fire alarm:** in the column's emptiness, forget the Conviction; red: the Biases column is `empty`
**Inject:** src/ui/piece.ts:damage
**Pulled:** 2026-11-15 — rang again after the simplifier pass (isLasting) in Chromium and Firefox at card.spec.ts:162, the Biases column `empty`; restored clean *Earlier —* 2026-11-15 — rang in Chromium and Firefox at card.spec.ts:162: the Biases column was `empty` (first rang at the width check, since a collapsed column squeezes the name; the empty check now comes first); restored clean
## Test: a Conviction's name has a blank of its own
**Purpose:** R341: the column is too narrow for kind, name, Level and points on one line, so the name takes its own blank below
**Input:** Sam's back with a Conviction, flipped
**Expected:** the name over 100 px wide
**Refs:** crc-PieceView.md, ui-card.md
**Code:** `tests/card.spec.ts`
**Alarm:** 10
**Fire alarm:** put the line back on one row (no wrap, the name `flex: 1`); red: the name is 0 px wide
**Inject:** src/ui/theme.css:.lastline
**Pulled:** 2026-11-15 — rang in Chromium and Firefox at card.spec.ts:163: on one row the name was 80 and 78 px, under 100; restored clean

## Test: the world as opposition
**Purpose:** R345–R347, R376, R350, R351 on the GM's page: Roll waits for a type and an aim; open table is the world; a blank tray refuses with the GM's reminder; the Opposition button slides the tray out and the GM types the number; aimed, its numbers, the ring and Roll free; the number is live; `vs` stops aiming; a drop on the tray aims; the tray in, the ring is on its button; the receipt names the world
**Input:** Devreux's die, then its Attack, `?`; as Skill; dragged to open table with the tray blank; 3 typed in the tray; dragged again; 9 typed; `vs` clicked; dragged to the tray; the tray slid in; Roll
**Expected:** Roll enabled for plain dice, then disabled "Say what this roll is", then "Aim it first"; the GM's reminder and no `vs`; the record `{set: true, total: 3}`; `vs the world 3 (+1)`, the tray ringed, Roll enabled; `vs the world 9 (−5)` and a Red die; Roll disabled and no ring; aimed again; the button ringed; the receipt "vs the world (9), Difference −5"
**Refs:** crc-RollRow.md, crc-Tray.md, crc-Rolls.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 11
**Fire alarm:** stop open table counting as the world (drop the `#table` and `#world` test in the aim's `under`); red: no note at all at the first drop on open table (the `?` one)
**Inject:** src/ui/rollrow.ts:#aim
**Pulled:** 2026-11-15 — rang (Chromium): "the world as opposition" failed at the first drop on open table, no note at all; restored clean

## Test: a `?` roll can't aim at the world
**Purpose:** R346: dragging a `?` roll to open table is refused with "Say what this roll is first.", before the tray is even asked
**Input:** Devreux's Attack at `?`, dragged to open table
**Expected:** the note "Say what this roll is first."
**Refs:** crc-RollRow.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 12
**Fire alarm:** drop the `?` refusal for the world in the aim's drop; red: the note is the blank tray's reminder instead
**Inject:** src/ui/rollrow.ts:#aim
**Pulled:** 2026-11-15 — rang (Chromium): "the world as opposition" failed at the `?` drop, the blank tray's reminder in place of "Say what this roll is first."; restored clean

## Test: a Finesse variant suffers its Tricky
**Purpose:** R362–R355 on the GM's page: Beauford's Tricky -Min indents under Mental Atk / Req with a die per alternative; choosing it puts one Tricky card in his Main, the header naming it, typed Mental Atk; again keeps one; a cleared Base takes it away; chosen again, aimed at Sam and rolled, the receipt names it, the card is gone and the row starts fresh
**Input:** Beauford's card; the variant's first die, twice; the Base; the die again; a drag to Sam; Roll
**Expected:** `varpad`; two dice titled "Roll this: Tricky -Min as Mental Atk" and "… as Req"; one `once` Tricky (−1, 2 points, Beauford's Main); `Tricky -Min` in the header, Mental Atk on the tag; still one; none; one; `vs Sam`; the receipt says Tricky -Min, no `once` card, no Base in the header
**Refs:** crc-PieceView.md, crc-RollRow.md, crc-Rolls.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 13
**Fire alarm:** don't indent variants (drop the `varpad` toggle); red: the Tricky line has no `varpad`
**Inject:** src/ui/piece.ts:frontGlyphs
**Pulled:** 2026-11-16 — rang (Chromium): "a Finesse variant suffers its Tricky" failed, the Tricky line had no `varpad`; restored clean

## Test: the row starts fresh after a variant's roll
**Purpose:** R353: a roll that goes through, of an action that suffers an Influence, starts the row fresh, so its next roll puts the card again
**Input:** Beauford's Tricky -Min aimed at Sam and rolled
**Expected:** no Base in Beauford's header afterwards
**Refs:** crc-RollRow.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 14
**Fire alarm:** make `rolled` do nothing; red: the header still holds Tricky -Min
**Inject:** src/ui/rollrow.ts:rolled
**Pulled:** 2026-11-16 — rang (Chromium): "a Finesse variant suffers its Tricky" failed at the end, the header still held a Base; restored clean

## Test: a Skill action, its Audience variant, and a lone Influence
**Purpose:** R363–R365 on the GM's page: Audience -Sig under Tact is its variant, with a die as Tact; a lone Audience -Min has no die; Tact starts at Skill; a Skill roll dropped on Devreux's pool falls back to his Defend through the chooser, aims, and reminds
**Input:** Sam's card with Tact, Audience -Sig under it, a plain line, a lone Audience -Min; Tact's die; a drag to Devreux's pool; the chooser's first button
**Expected:** `varpad` and "Roll this: Audience -Sig as Tact"; no die on the lone line; the tag Skill; `vs Devreux`; the note "A Skill or Attribute normally opposes a Skill."
**Refs:** crc-PieceView.md, crc-RollRow.md, crc-MarkReader.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 15
**Fire alarm:** give a lone Influence its die (drop the lone check in frontGlyphs); red: the lone Audience -Min has a die
**Inject:** src/ui/piece.ts:frontGlyphs
**Pulled:** 2026-11-16 — rang (Chromium): the lone Audience -Min had a die; restored clean

## Test: a Skill roll at a Defend is reminded
**Purpose:** R365: the reminder after a Skill roll falls back to Defend through the chooser
**Input:** Sam's Tact as Skill, dropped on Devreux's pool, the chooser's first button
**Expected:** the note "A Skill or Attribute normally opposes a Skill."
**Refs:** crc-RollRow.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 16
**Fire alarm:** make the reminder say nothing (`remind` a no-op); red: no note after the chooser
**Inject:** src/ui/rollrow.ts:#aim
**Pulled:** 2026-11-16 — rang (Chromium): no reminder after the chooser; restored clean

## Test: a Roll Up of chips is a pile, and its members are chips
**Purpose:** R366, R369 on the GM's page: three 4s dropped in Beauford's Main act as a 6, a pile, the records keeping three 4s; opened, the members are chips, and clicking one raises that chip, breaking the pile
**Input:** three 4-chips from the bar into Beauford's Main; the pile's disc; its first member
**Expected:** the disc reads 6, the records 4, 4, 4; members 4, 4, 4; the records then 4, 4, 6, no pile, the chips 6, 4, 4
**Refs:** crc-PoolView.md, crc-Pool.md
**Code:** `tests/table.spec.ts`
**Alarm:** 17
**Fire alarm:** draw a pile's members as faces with nothing to click (a plain button, not `chip()`); red: the member's click changes nothing
**Inject:** src/ui/pool.ts:pile
**Pulled:** 2026-11-16 — rang (Chromium): the member's click changed nothing, the records still 4, 4, 4; restored clean

## Test: a player cannot aim
**Purpose:** R372, R374: viewing as Player 1, Sam's Infer dragged onto Devreux aims at nothing and opens nothing; the White is locked
**Input:** "You are" Player 1; Sam's Infer; a drag from its Base to Devreux's pool, then to open table
**Expected:** no note, no `vs`; the White `locked`
**Refs:** crc-RollRow.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 18
**Fire alarm:** let anyone drag from the Base to aim (drop the GM test on the drag); red: Sam's row is aimed, `vs Devreux` shows
**Inject:** src/ui/rollrow.ts:#draw
**Pulled:** 2026-11-18 — re-pulled after the drag's GM test took in a Reaction; rang (Chromium): Sam's row was aimed from a player's page; restored clean *Earlier —* 2026-11-16 — first silent: the drop on Devreux, hidden from the player, showed nothing either way; with a drag to open table added it rang (Chromium), the blank tray's note opened; restored clean
## Test: an older game's Fields are marked and bold when the GM opens it
**Purpose:** R380, R332 on the GM's page: Sam's front without its Field and Skill marks and meta never marked, the page opened again, marks them, so "Private Investigator 2 (5XP)" is a Field drawn bold, and meta says so
**Input:** Sam's front stripped of `fld` and `skl`, `marked` taken off meta; the page opened again
**Expected:** one `.fld` holding Private Investigator, weight 700; meta `marked`
**Refs:** crc-Pens.md
**Code:** `tests/table.spec.ts`
**Alarm:** 19
**Fire alarm:** never apply markOlder on opening (drop the call in main); red: no Field on Sam's card
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R487 (the GM's load changed): rang, no Field on Sam's card (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R483-R485 (main changed): rang, no Field on Sam's card (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), no Field on Sam's card; restored clean *Earlier —* 2026-11-22 — re-pulled after R472 (main changed): rang (Chromium), no Field on Sam's card; restored clean *Earlier —* 2026-11-16 — rang (Chromium): no Field on Sam's card; restored clean
## Test: the die toggles the roll row
**Purpose:** R381, R382, R353 on the GM's page: Beauford's die brings his row up; Tricky -Min puts its card in Main; clicking the Base starts the row fresh, the card gone; the die again puts the row away, the card with it
**Input:** Beauford's die; Tricky -Min; the Base; Tricky -Min again; the die
**Expected:** one row; one `once` card; no Base, the row still there, no card; one card; no row, no card, no row in `rows`
**Refs:** crc-RollRow.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 20
**Fire alarm:** let the die start the row fresh as before (always bring it up); red: the row is still there after the second click
**Inject:** src/ui/rollrow.ts:dock
**Pulled:** 2026-11-16 — rang (Chromium): the row was still there after the second click; restored clean

## Test: writing shows the text cursor
**Purpose:** R384: text holding the caret shows the I-beam over its words and marks, while the controls inside it keep the pointing hand; text without the caret keeps the open hand
**Input:** Sam's card text before and after clicking into it; a mark, a Resource glyph and an action die in it; a pen; a sticky's text and a Damage slot's name, each holding the caret
**Expected:** `grab` before; `text` on the text and the mark; `pointer` on the glyph, the die and the pen; `text` on the sticky and the slot name
**Refs:** manifest-ui.md
**Code:** `tests/table.spec.ts`
**Alarm:** 21
**Fire alarm:** drop the `cursor: text` rule on focused writing; red: Sam's text shows `grab` while it holds the caret
**Inject:** src/ui/theme.css
**Pulled:** 2026-11-18 — rang (Chromium): Sam's text showed `grab` while it held the caret; restored clean

## Test: the GM adds, writes, buries and gets back an Info card
**Purpose:** R401, R397, R403–R405: the menu (on Devreux's pool, not Sam's) makes a card slid out with the caret in it; written, it stays, and stays slid out across a reload; emptied, it is buried once the caret leaves; undo outside the text digs it up, slid out, and a second undo does nothing; emptied again, dragging it out of Boot Hill's list brings it back
**Input:** Sam's pool; Devreux's ▾ and "Info card"; typing a clue; a click on the table; reload after the save; select all, delete, a click on the table; Ctrl+Z twice; emptied again; Boot Hill, "Devreux: Info card" dragged out
**Expected:** no ▾ on Sam's pool; the menu closed and the caret in the card; one Info tab; the card's text the clue; after the reload the card slid out with its clue; then no card, no `info`, Boot Hill's badge 1; after undo the card slid out with its clue and no badge, still one tab after the second; after the drag the card back with its clue, the list closed, no badge
**Refs:** crc-PieceView.md, crc-PoolView.md, crc-BootHillView.md, crc-Seat.md
**Code:** `tests/table.spec.ts`
**Alarm:** 22
**Fire alarm:** dig up nothing on undo (undoCard returns false); red: the card does not come back after Ctrl+Z
**Inject:** src/ui/boothill.ts:undoCard
**Pulled:** 2026-11-18 — re-pulled after undoCard took records too; rang (Chromium): the card did not come back after Ctrl+Z; restored clean *Earlier —* 2026-11-18 — rang (Chromium): the card did not come back after Ctrl+Z; restored clean
## Test: the GM keeps the Connection Table
**Purpose:** R407, R518, R409, R411, R412, R414, R416, R417: the GM's desk has the supply; taken, the table shows the seeded rows in order, an X where a row meets itself, the book's Levels, and Sam and Beauford's columns after the thick line; a cell set from its chooser; the `(` chooser writes a group onto Devreux's first line and its row appears; put away on the bar, nothing is buried, and the supply brings the same table back; taken again while out, the same table moves
**Input:** the GM's table; the Connection Table taken from the GM's desk; Eliza's cell under Obed, "+Sig"; Devreux's first line, typing ` (` then "Unton folk" and Enter; the table dropped on the bar; the supply dragged out twice
**Expected:** the row names Beatrice, Devreux, Eliza, Jake, Jameson, Jephthah, Maggie, Obed; Obed's row reads X under Obed and "+Sig" under Beatrice; columns Beauford, Sam after the line, empty; the cell "+Sig"; the first line ends "(Unton folk)" and a row "Unton folk" shows; after the drop no table, Boot Hill's badge unchanged; the supply's table still has "+Sig" for Eliza → Obed; one table on the table after the second take, where it was dropped
**Refs:** crc-Connections.md, crc-Bar.md, crc-Drag.md, crc-PieceView.md
**Code:** `tests/table.spec.ts`
**Alarm:** 23
**Fire alarm:** put the table away by burying it (drop the `connections` branch of putAway); red: Boot Hill's badge counts it
**Inject:** src/ui/drag.ts:putAway
**Pulled:** 2026-11-23 — re-pulled after R488 (putAway changed): rang, Boot Hill's badge counted the table (Chromium); restored clean *Earlier —* 2026-11-18 — rang (Chromium): Boot Hill's badge counted the table, 1 for none; restored clean
## Test: the GM keeps Opinion Records
**Purpose:** R419, R421, R422, R424-R426, R428: the menu's "Opinion of" lists Sam; picked, a pink record of Sam slides out after the Info cards, its first line "➔ Sam (Connection …)"; written, its cell in the Connection Table follows; leaving it works Professional Respect out again; a second card in the same group shows the same record; emptied, it is buried as "Devreux: Opinion of Sam", and undo brings it back
**Input:** the GM's table; Devreux's ▾, "Opinion of", Sam; the record's text; Professional Respect's Composure deleted and the table clicked; the Connection Table out; Devreux and a new GM card both in a group; the record emptied and the table clicked; Ctrl+Z
**Expected:** a tab "Sam", pink; the record "Reaction ?" and "Professional Respect (Composure, Suasion, Tact) +Maj", the first line "➔ Sam (Connection +Maj)"; after the edit "+Min" and the sheet's Devreux row reading "+Min" under Sam; the grouped card's tab "Sam" with the same words; then no tab, Boot Hill 1; after Ctrl+Z the record back with its words
**Refs:** crc-PieceView.md, crc-PoolView.md, crc-Connections.md, crc-BootHillView.md
**Code:** `tests/table.spec.ts`
**Alarm:** 24
**Fire alarm:** write a record's text without its cell (drop synced from the edit); red: the sheet's cell for Sam stays "+Maj"
**Inject:** src/ui/piece.ts:writeRecord
**Pulled:** 2026-11-18 — rang (Chromium): the sheet's cell for Sam stayed +Maj; restored clean

## Test: the GM calls a Reaction
**Purpose:** R429-R431: a "Reaction ?" line's die brings the PC's row up as a Reaction, White only; Roll writes the line and prints the receipt
**Input:** the GM's table; Devreux's ▾, "Opinion of", Sam; the die on "Reaction ?"; Roll on Sam's row
**Expected:** a `.reactdie` on the line; Sam's row with a White die and Roll, no Blue, Yellow or type tag, the header "Devreux's Reaction"; after Roll the tape's newest receipt reads "Devreux's Reaction: " and a Level, the record's line "Reaction " and the same Level, no die on it, and Sam's row gone
**Refs:** crc-PieceView.md, crc-RollRow.md, crc-Rolls.md
**Code:** `tests/table.spec.ts`
**Alarm:** 25
**Fire alarm:** draw a Reaction row as any other (skip its own drawing); red: Sam's row has a Blue die
**Inject:** src/ui/rollrow.ts:#draw
**Pulled:** 2026-11-18 — rang (Chromium): Sam's Reaction row had 3 of the Blue, Yellow ghost, bonus and type; restored clean

## Test: the GM taps an Opinion
**Purpose:** R432, R433: a record's Opinion lines have glyphs; dragging Reputation into Sam's Main makes "Devreux: Reputation", spends into parentheses, and the cell stays
**Input:** the GM's table; Devreux's record of Sam written `Reputation +Sig`; the Connection Table out; the Reputation glyph dragged onto Sam's Main slot
**Expected:** one glyph on the record's line; a card "Devreux: Reputation" in Sam's Main; the record `Reputation +Sig (+Min)`; the sheet's Devreux row reading "+Sig" under Sam before and after
**Refs:** crc-PieceView.md, crc-Tap.md
**Code:** `tests/table.spec.ts`
**Alarm:** 26
**Fire alarm:** draw no glyphs on a record (drop the Opinion glyphs from the paper); red: the record's line has no glyph
**Inject:** src/ui/piece.ts:recordGlyphs
**Pulled:** 2026-11-18 — rang (Chromium): the record's line had no glyph; restored clean

## Test: the GM reveals an Opinion
**Purpose:** R436: with the eye open and a record slid out, its lines are targets, the Opinions category lights them, and shutting the eye writes the record's revealed line, its cards and its name
**Input:** the GM's table; Devreux's record of Sam written `Reputation +Sig` and `Grudge -Min`; Devreux's eye arrow, "Opinions"; a click on `Grudge -Min`; the eye shut
**Expected:** both lines lit before the click; `Grudge -Min` torn after it; once shut the record's `shown` [`Grudge -Min`], `on` [Devreux], `name` "Sam"
**Refs:** crc-PieceView.md, crc-Connections.md
**Code:** `tests/table.spec.ts`
**Alarm:** 27
**Fire alarm:** shut the eye without writing the records (drop the records from the shut); red: the record has no `shown`
**Inject:** src/ui/eyes.ts:Eyes.shut
**Pulled:** 2026-11-19 — rang (Chromium): the shut record had no `shown`, `on` or `name`; restored clean

## Test: the GM transfers a Resource
**Purpose:** R441: a kept Request receipt on the GM's tape shows Transfer; it opens Devreux's givable Resources; picking Money moves it on both cards and the receipt says so
**Input:** the GM's table with Sam at Money +Min; a kept Request of Sam's against Devreux (Money +Ext), Major, on the GM's tape; Transfer; Money
**Expected:** a Transfer button; the list holding Money; after the pick, Sam's card `Money +Maj`, Devreux's `Money +Sig`, the receipt reading "Transfer: Money, 2 Levels from Devreux", and no Transfer button
**Refs:** crc-Tape.md, crc-Rolls.md
**Code:** `tests/table.spec.ts`
**Alarm:** 28
**Fire alarm:** never show Transfer (drop it from the receipt); red: no Transfer button
**Inject:** src/ui/tape.ts:TapeView
**Pulled:** 2026-11-19 — rang (Chromium): no Transfer button; restored clean


## Test: select-all takes the whole of an Opinion Record's text
**Purpose:** R450: Ctrl+A or ⌘A in a written place selects all of it, non-editable dice and glyphs included, and typing replaces it
**Input:** the GM makes Devreux's Opinion of Sam; clicks its text, presses select-all, types `Grudge`
**Expected:** the record's text is `Grudge`. Chromium and Firefox pass without the fix; WebKit only with it
**Refs:** crc-PieceView.md
**Code:** `tests/table.spec.ts`
**Alarm:** 29
**Fire alarm:** leave select-all to the browser (our keydown handler returns at once); red, in WebKit only: the typing lands after the old text
**Inject:** src/ui/piece.ts:writable
**Pulled:** 2026-11-19 — rang in WebKit on gpubox (the standing suite's Chromium and Firefox never had the bug): the typing landed after the old text, "…+MajGrudge"; restored clean

## Test: a sticky carries from its text, again and again
**Purpose:** R451: a press and move on a piece's text carries it, every time; the browser neither drags the text itself nor leaves the text being written after a carry
**Input:** three carries of the big sticky, each pressed on its text and moved 60 px left
**Expected:** each carry moves the sticky 60 px, within a pixel (its tilted box moves by fractions of one). Chromium and Firefox pass without the fix; WebKit only with it
**Refs:** crc-Drag.md, crc-TableView.md
**Code:** `tests/drag.spec.ts`
**Alarm:** 30
**Fire alarm:** stop leaving writing during a carry (`keepOut` does nothing); red, in WebKit only: a carry moves the sticky 2 px, not 60
**Inject:** src/ui/drag.ts:#carry
**Pulled:** 2026-11-19 — re-pulled after the spec allowed a pixel (it flaked in Firefox, 59 for 60 in 2 of 5): rang in WebKit on gpubox, the sticky ended 62 px off; restored clean *Earlier —* 2026-11-19 — rang in WebKit on gpubox (the standing suite's Chromium and Firefox never had the bug): a carry moved the sticky 2 px, not 60; restored clean

## Test: an image the browser won't keep is said on the image pigeonhole
**Purpose:** R517: when the store refuses a new image, the image pigeonhole turns red and says why, and the desk is edged red, until an image is added
**Input:** the page's `blobs.add` rejects with a QuotaExceededError; an image picked; then `blobs.add` as it was, and the image picked again
**Expected:** the pigeonhole's supply and the desk have class `refused`, the supply reads "storage full", its title "dot.png not added: this browser's storage is full…"; then plain again, reading "image"
**Refs:** crc-Bar.md
**Code:** `tests/table.spec.ts`
**Alarm:** 31
**Fire alarm:** drop the refusal on the floor (addImage's rejection handler does nothing); red: the pigeonhole never turns refused
**Inject:** src/main.ts:views
**Pulled:** 2026-11-24 — 2026-11-24 — re-pulled after #64 (addImage changed): rang, the pigeonhole never turned refused (Chromium); restored clean *Earlier —* 2026-11-19 — rang: the image supply never turned refused (Chromium); restored clean
## Test: End ends when its checkpoint isn't kept
**Purpose:** R454: End ends the conflict whether or not its checkpoint is kept
**Input:** the store's `checkpoint` rejects with a QuotaExceededError; the Round up to 1; End pressed twice
**Expected:** the Round is 0
**Refs:** crc-Register.md
**Code:** `tests/table.spec.ts`
**Alarm:** 32
**Fire alarm:** end only once the checkpoint is kept (`.then(end)`, as before R454); red: the Round stays 1
**Inject:** src/ui/register.ts:RegisterView
**Pulled:** 2026-11-23 — re-pulled after R492 (End's checkpoint call changed): rang, the Round stayed 1 (Chromium); restored clean *Earlier —* 2026-11-19 — rang: the Round stayed 1 (Chromium); restored clean
## Test: the GM rules on a flagged tap: allow keeps it, undo gives it back
**Purpose:** R464: a flagged card in a slot shows its flag, titled with why; on the GM's page a click offers Allow and Undo
**Input:** two flagged cards in Devreux's Main slot (plain, Money 1 fed); the first allowed, the second undone
**Expected:** the flag's title "Tapped into a plain card: the GM's call…"; allowed: no flag, 4 points; undone: 2 points, no flag, no tap
**Refs:** crc-PoolView.md, crc-Tap.md
**Code:** `tests/table.spec.ts`
**Alarm:** 33
**Fire alarm:** make Allow undo too (ruleFlag ignores `allow`); red: the allowed card drops to 2
**Inject:** src/ui/actions.ts:ruleFlag
**Pulled:** 2026-11-19 — rang: Allow undid the card too (Chromium); restored clean

## Test: two fingers pinch the table as a sheet stuck to them, and hand off to one
**Purpose:** R479, R480: a pinch keeps the table point under the fingers' midpoint and zooms by their spacing, stops at the limit while still panning; lifting a finger leaves the other panning with no jump; a second finger during a pan pinches even on a piece; a third does nothing
**Input:** touch pointers on open table spread half again; one lifted and the other moved 25, 15; a second finger on a piece in view, brought halfway in; a third finger moved; a fresh second finger spread far past the limit
**Expected:** the zoom half again, the midpoint's table point kept; the view moved exactly 25, 15 at the same zoom; the zoom halved and nothing lifted; the third changes nothing; the zoom 2.5 with the midpoint's table point kept
**Refs:** crc-TableView.md
**Code:** `tests/pinch.spec.ts`
**Alarm:** 34
**Fire alarm:** let a lifted finger end the gesture (drop the pan from the other finger in `end`); red: the remaining finger doesn't pan
**Inject:** src/ui/table.ts:TableView
**Pulled:** 2026-11-23 — rang: the remaining finger did not pan (the view moved 0, 0, not 25, 15; Chromium); restored clean

## Test: a second finger turns a press on a piece into a pinch
**Purpose:** R481: a press on a piece that hasn't moved is given up when a second finger lands: nothing picked up or clicked, and the table pinches
**Input:** a touch on the sticky, a second on open table spreading, the first moved 20, 10, both lifted, a wait past a long press
**Expected:** the sticky never lifted, its record unchanged, nothing being written in; the zoom changed
**Refs:** crc-TableView.md, crc-Gesture.md
**Code:** `tests/pinch.spec.ts`
**Alarm:** 35
**Fire alarm:** don't give the press up (drop `claim(id)` in the table's capture listener); red: the sticky is picked up
**Inject:** src/ui/table.ts:TableView
**Pulled:** 2026-11-23 — rang: the sticky was picked up (Chromium); restored clean

## Test: a piece in hand can be pinched under, and stays glued to its finger
**Purpose:** R482, R216: with a piece in hand a second finger pinches the table, the piece glued to its finger as the view moves under it; lifting the second finger carries on the drag, and the drop lands under the finger
**Input:** the sticky carried 20, 10 by touch; a second finger spread far past the limit (so the view slides under the still finger); the second lifted, the first moved and lifted
**Expected:** the zoom grew; the piece stays at the finger's table point less the grip, during the pinch, after it and where it lands
**Refs:** crc-TableView.md, crc-Drag.md
**Code:** `tests/pinch.spec.ts`
**Alarm:** 36
**Fire alarm:** don't watch the view during a carry (drop `table.onView` in `#carry`); red: the piece is left off its finger as the view slides
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-23 — rang: the piece was left about 812 table units off its finger as the view slid (Chromium); restored clean

## Test: End at Round 0 ends the scene
**Purpose:** R492, R493: at Round 0 End's tab says "End scene?", and the second press checkpoints "End of scene"; at Round 2 it says "End conflict?"
**Input:** the GM's page at Round 2 presses End twice (the Round goes to 0); then presses End twice again
**Expected:** "End conflict?" at Round 2; End's tooltip says ▲ to Round 1 first ends only the Conflict (R493); "End scene?" at Round 0; a checkpoint named "End of scene"
**Refs:** crc-Register.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 37
**Fire alarm:** always arm with "End conflict?"; red: the tab says "End conflict?" at Round 0
**Inject:** src/ui/register.ts:RegisterView
**Pulled:** 2026-11-23 — rang: always armed with "End conflict?", the tab said so at Round 0 (Chromium); restored clean

## Test: a shift-click on End's raised tab cancels it
**Purpose:** R494: the raised tab, shift-clicked, lowers at once and ends nothing
**Input:** the GM's page at Round 2 presses End, then shift-clicks the raised "End conflict?" tab, then presses End once
**Expected:** the register armed, then not armed within 1 s (well before End's 3 s) with the Round still 2, then armed again (a fresh first press)
**Refs:** crc-Register.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 38
**Fire alarm:** give the tab no shift gesture; red: the register stays armed after the shift-click
**Inject:** src/ui/register.ts:RegisterView
**Pulled:** 2026-11-23 — rang: with no shift gesture on the tab, the register stayed armed past 1 s (Chromium); restored clean. A first pull was silent: the check waited 5 s, and End's 3 s timer lowered the tab inside that; the check now waits 1 s

## Test: the Round's card is shaped like a register's number flag
**Purpose:** R495: the Round's white card is clipped to the flag's shape: a flat top on rounded shoulders that curves up, concave, to a small tip in the middle
**Input:** the GM's page, the register showing Round 0
**Expected:** the card's computed `clip-path` is the flag's path, its tip at the middle of the top (19, 0) and its shoulders 5.5 px down
**Refs:** crc-Register.md
**Code:** `tests/rolls-local.spec.ts`
**Alarm:** 39
**Fire alarm:** drop the card's `clip-path`; red: the card has none
**Inject:** src/ui/theme.css
**Pulled:** 2026-11-23 — rang: with the card's clip-path dropped, its computed clip was none (Chromium); restored clean

## Test: a slot worth only 1 reads "Mild (1)"
**Purpose:** R496: the back shows a slot worth only 1 after its Level word
**Input:** Sam's card with Wis −1, its back's Biases open
**Expected:** the Bias Mild slot reads "Mild (1)"; the Min slot reads "Min"
**Refs:** crc-PieceView.md, ui-card.md
**Code:** `tests/card.spec.ts`
**Alarm:** 40
**Fire alarm:** never write "(1)" on a slot; red: the Mild slot reads "Mild"
**Inject:** src/ui/piece.ts
**Pulled:** 2026-11-23 — rang: with no "(1)" written, the Mild slot read "Mild" (Chromium); restored clean

## Test: the name above a pool: set by the card, or written as a nickname
**Purpose:** R565, R566: writing the name on the card's first line resets the name above the pool; a nickname written above the pool leaves the card alone and lasts through other edits to the card, until its name changes again.
**Input:** the GM types " Jr" after Mistress Devreux's first line, writes "Madam" above its pool, types on the card's last line, then types on the first line again.
**Expected:** "Mistress Devreux Jr"; "Madam" with the card unchanged; still "Madam"; "Mistress Devreux Jrr".
**Refs:** crc-PieceView.md, crc-PoolView.md, crc-Connections.md
**Code:** tests/card.spec.ts
**Alarm:** 41
**Fire alarm:** let the card's edits leave the name alone: Devreux's pool keeps "Mistress Devreux"
**Inject:** src/ui/piece.ts:make
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the card's edits leaving the name alone, the pool name spec failed in Chromium; restored clean

## Test: a player can't write a name or card that isn't theirs
**Purpose:** R567: on a player's page another's character, and an open one, show their name and card unwritable; the GM's page writes them.
**Input:** the GM and Dana; Devreux; then Sam opened.
**Expected:** Devreux's name writable on the GM's page, not on Dana's; open Sam's name and card not writable on Dana's page.
**Refs:** crc-PoolView.md, crc-PieceView.md, crc-Ownership.md
**Code:** tests/card.spec.ts
**Alarm:** 42
**Fire alarm:** make the name writable for anyone (ignore mayWrite in drawPool): Dana's page lets her write Devreux's name
**Inject:** src/ui/pool.ts:drawPool
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the name writable for anyone, the spec failed in Chromium (Devreux's name writable on Dana's page); restored clean

## Test: an open character's card isn't written on a player's page
**Purpose:** R567: the card's front follows who may write it, not only whether its face is shown.
**Input:** the "a player can't write a name or card" spec, Sam opened.
**Expected:** Sam's front not writable on Dana's page.
**Refs:** crc-PieceView.md
**Code:** tests/card.spec.ts
**Alarm:** 43
**Fire alarm:** make the front writable whenever its face shows (ignore mayWrite): Dana's page lets her write Sam's card
**Inject:** src/ui/piece.ts:update
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the front writable whenever its face shows, the spec failed in Chromium (open Sam's front writable on Dana's page); restored clean

## Test: the thumbtack
**Purpose:** R568-R571: a sticky dropped on a card is tacked; dragged far it stays pinned at the new offset, the pin line showing while carried; its tack dragged to another card moves the pin, dragged to the table or cancelled with Esc changes nothing; clicked, it unpins.
**Input:** the GM drops a sticky on Sam's card, drags it off the card, drags its tack to Devreux's card, drags the tack to the table, presses Esc during a tack drag, then clicks the tack.
**Expected:** tacked and pinned to Sam; still pinned to Sam, the pin line shown mid-carry and gone after; pinned to Devreux with the sticky unmoved; unchanged; unchanged; loose, no tack.
**Refs:** crc-Drag.md, crc-PieceView.md, crc-TableView.md
**Code:** tests/card.spec.ts
**Alarm:** 44
**Fire alarm:** let a drag of pinned paper unpin it as before (drop it loose): the sticky dragged off Sam's card comes off
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with a drag of pinned paper unpinning it as before, the thumbtack spec failed in Chromium on its assertion (pin lost after the drag off Sam's card); first pull rang only by a TypeError on the missing pin, so the spec's check was tightened and pulled again; restored clean

## Test: the tack moves the pin, and only on a card
**Purpose:** R571: a tack let go on the table changes nothing.
**Input:** the thumbtack spec's tack drag to the table.
**Expected:** still pinned to Devreux.
**Refs:** crc-Drag.md
**Code:** tests/card.spec.ts
**Alarm:** 45
**Fire alarm:** let a tack let go anywhere unpin the paper: the pin is gone after the drag to the table
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with a tack let go anywhere unpinning, the thumbtack spec failed in Chromium (no pin after the drag to the table); restored clean

## Test: a click on the tack unpins
**Purpose:** R570: a click, with no drag, takes the tack out and the paper lies loose where it is.
**Input:** the thumbtack spec's last step.
**Expected:** no pin, the place unchanged, no tack.
**Refs:** crc-PieceView.md
**Code:** tests/card.spec.ts
**Alarm:** 46
**Fire alarm:** make the tack's click do nothing: the sticky stays pinned to Devreux
**Inject:** src/ui/piece.ts:tack
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the tack's click doing nothing, the thumbtack spec failed in Chromium (still pinned at the end); restored clean

## Test: the pin line lies under the paper, over its card
**Purpose:** R572: while pinned paper is carried, the pin line's height is below the paper's and not below its card's.
**Input:** the thumbtack spec's carry of the sticky off Sam's card.
**Expected:** line z below the sticky's, at or above the card's.
**Refs:** crc-TableView.md
**Code:** tests/card.spec.ts
**Alarm:** 47
**Fire alarm:** leave the line over everything, as #71 drew it: its z is above the paper's
**Inject:** src/ui/table.ts:pinLine
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the line over everything, as #71 drew it, the thumbtack spec failed in Chromium on the z check (3000000 not below the paper's 1000001); restored clean

## Test: the pinned pair is raised while the line shows
**Purpose:** R573: during a tack's drag the paper's own card and the card pointed at are raised, the paper above them, and all come down when the line goes.
**Input:** the thumbtack spec's tack drag over Sam's card, cancelled with Esc.
**Expected:** Devreux's and Sam's cards marked raised and the sticky raised during it; none after.
**Refs:** crc-TableView.md, crc-Drag.md
**Code:** tests/card.spec.ts
**Alarm:** 48
**Fire alarm:** raise nothing (pinLine ignores its cards): the cards aren't marked during the drag
**Inject:** src/ui/table.ts:pinLine
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with pinLine raising no cards, the thumbtack spec failed in Chromium (Devreux's card not marked raised during the tack's drag); restored clean

## Test: paper pinned to a gathered card keeps its place on the card through the pool's drag
**Purpose:** R574, R575: a sticky pinned to gathered Sam, nudged on the card, keeps its place on the card while Sam's pool is carried and after it is let go; the card's record is where it is drawn, and the sticky's place is the card's plus its pin.
**Input:** the GM pins a sticky to Sam's card, drags it a little, then carries Sam's pool and lets go.
**Expected:** the sticky's offset from the card within a few pixels mid-carry and after; card record equal to its drawn place; place minus card equal to the pin.
**Refs:** crc-Drag.md
**Code:** tests/card.spec.ts
**Alarm:** 49
**Fire alarm:** measure the pin from the card's record, as before (holder at the record): the sticky jumps mid-carry
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the pin measured from the card's record, the spec failed in Chromium mid-carry (the sticky jumped on the card); restored clean

## Test: a pool's drop takes its card's paper
**Purpose:** R574: let go, the sticky's record moved with the pool.
**Input:** the same spec, after the drop.
**Expected:** the sticky's place minus the card's equals its pin.
**Refs:** crc-Drag.md
**Code:** tests/card.spec.ts
**Alarm:** 50
**Fire alarm:** leave the paper behind on a pool's drop (no bringPapers in the pool branch): the sticky stays where it was
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the pool's drop leaving the paper, the spec failed in Chromium (the sticky's place minus the card's not its pin); restored clean

## Test: a pool's drop puts its gathered card's record where it is drawn
**Purpose:** R574: the gathered card's record follows its pool.
**Input:** the same spec, after the drop.
**Expected:** the card's record equals its drawn place.
**Refs:** crc-Drag.md
**Code:** tests/card.spec.ts
**Alarm:** 51
**Fire alarm:** leave the gathered card's record alone on the pool's drop: the record differs from where it is drawn
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the gathered card's record left alone, the spec failed in Chromium (record not where the card is drawn); restored clean

## Test: Gather, and a drawer that grows, bring a gathered card's paper with it
**Purpose:** R576: a card with a pinned sticky, dragged off its pool then gathered, goes back under the pool with its record, and the sticky keeps its place on it; a drawer that grows moves the gathered card down, its sticky with it.
**Input:** the GM pins a sticky to Sam's card, drags the card off, presses Gather, then adds eight Influence cards to Sam's drawer.
**Expected:** after Gather and after the drawer grows, the sticky's offset from the card as before, and its place the card's record plus its pin.
**Refs:** crc-TableView.md, crc-Dockets.md
**Code:** tests/card.spec.ts
**Alarm:** 52
**Fire alarm:** leave a gathered card's record alone when it snaps (no record write in #snap): the sticky stays behind on Gather
**Inject:** src/ui/table.ts:TableView
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with #snap leaving the record alone, the spec failed in Chromium (the sticky stayed behind on Gather); restored clean

## Test: repin counts gathered cards
**Purpose:** R576: paper pinned to a gathered card follows the card's record.
**Input:** the same spec.
**Expected:** as above.
**Refs:** crc-Dockets.md
**Code:** tests/card.spec.ts, src/rules/dockets.test.ts
**Alarm:** 53
**Fire alarm:** let repin skip gathered cards again: the sticky stays behind when the record moves
**Inject:** src/rules/dockets.ts:repin
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with repin skipping gathered cards, 'paper follows its holder' failed in the unit tests; restored clean

## Test: every page is given a reference sheet
**Purpose:** R594: a page opening a game for the first time is given a sheet, open at How to use the table.
**Input:** the GM's page opened afresh, its sheet kept.
**Expected:** one reference under `m:`, at `howto`, its heading "How to use the table".
**Refs:** crc-PieceView.md
**Code:** tests/reference.spec.ts
**Alarm:** 54
**Fire alarm:** main gives no sheet; red: no reference on the page
**Inject:** src/main.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with no sheet given, the page held no reference (line 15, Chromium); restored clean, dist rebuilt

## Test: a sheet is given once per game
**Purpose:** R594: a reload neither loses the sheet nor gives another.
**Input:** the sheet turned to Quick Character Creation, saved, then the page reloaded.
**Expected:** the one sheet, at `creation`.
**Refs:** crc-PieceView.md
**Code:** tests/reference.spec.ts
**Alarm:** 55
**Fire alarm:** the seat never remembers `given`; red: a second sheet after the reload
**Inject:** src/main.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with given never remembered, the reload gave a second sheet (line 36, Chromium); restored clean, dist rebuilt

## Test: the sheet turns its pages
**Purpose:** R592: "›" turns the sheet to the Quick Reference, then Quick Character Creation.
**Input:** the given sheet, "Next page" pressed twice.
**Expected:** the Quick Reference's heading, then Quick Character Creation's table; "Next page" disabled on the last.
**Refs:** crc-PieceView.md
**Code:** tests/reference.spec.ts
**Alarm:** 56
**Fire alarm:** a turn writes nothing; red: the heading stays How to use the table
**Inject:** src/ui/piece.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with a turn writing nothing, the heading stayed How to play the table (line 24, Chromium); restored clean, dist rebuilt

## Test: the Quick Reference reads the die as the dice do
**Purpose:** R592: Making Rolls says 4-6 Clean Success and 3 Success with cost, as R91 rolls and Bunkum's page 18 now prints.
**Input:** the sheet at the Quick Reference.
**Expected:** "4-6: Clean Success" and "3: Success with cost, like +1 Stagger".
**Refs:** crc-PieceView.md
**Code:** tests/reference.spec.ts
**Alarm:** 57
**Fire alarm:** the older printing (5-6 Clean Success, 3-4 with cost); red: no "4-6" line
**Inject:** src/ui/piece.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the older 5-6 printing, there was no 4-6 line (line 25, Chromium); restored clean, dist rebuilt

## Test: the sheet is its page's own
**Purpose:** R593: each page's sheet is under `m:` and never reaches another page.
**Input:** the GM's page and Dana's, each opened afresh, their sheets kept.
**Expected:** each holds one sheet; Dana's page holds nothing of the GM's.
**Refs:** crc-Records.md
**Code:** tests/reference.spec.ts
**Alarm:** 58
**Fire alarm:** Records.ridFor and check treat a reference as the table's; red: a sheet keyed `o:`
**Inject:** src/model/records.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with a reference keyed o:, the GM's own sheet went to the table and the GM's page deleted it as a shared card, leaving none (line 15, Chromium); restored clean, dist rebuilt

## Test: the desk gives a sheet of the page's own
**Purpose:** R591, R593: the "how to play" pigeonhole makes a sheet under `m:`, open at How to use the table.
**Input:** the GM's page with no sheet; the pigeonhole's piece let go on the table.
**Expected:** one sheet, keyed `m:`, at `howto`.
**Refs:** crc-Desk.md
**Code:** tests/reference.spec.ts
**Alarm:** 59
**Fire alarm:** main keys a supply by ridOf; red: no sheet made (the put is refused under `o:`)
**Inject:** src/main.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the supply keyed by ridOf, no m: sheet was made (line 48, Chromium); restored clean, dist rebuilt

## Test: older games' shared cards go
**Purpose:** R595: the GM's page deletes a reference held under `o:`.
**Input:** a shared reference card loaded into the GM's game, as an older game holds one.
**Expected:** it is gone.
**Refs:** crc-PieceView.md
**Code:** tests/reference.spec.ts
**Alarm:** 60
**Fire alarm:** the GM's page deletes no shared card; red: the card is still there
**Inject:** src/main.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with no shared cards deleted, o:0000c0de stayed (line 53, Chromium); restored clean, dist rebuilt
