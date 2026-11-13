# Test Design: the table in the browser
**Source:** crc-TableView.md

One page (the GM's, through the test hook), in Chromium and Firefox, from the playtest scene (Sam:
Player 1, Beauford: Player 2, Devreux: GM; the big sticky; the reference card). Pieces are taken and
carried with the mouse, as a person does; measurements wait for the web fonts.

## Test: characters and pools
**Purpose:** the bar's supplies; making, carrying, burying and digging up characters; the strips
**Expected:**
- the bar holds character, note, text, image and how-to supplies, eight chips, Boot Hill and the register
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
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the loose 2 stayed 2 when clicked (Chromium) *Earlier —* 2026-11-13 — rang: the loose 2 stayed 2 when clicked (Chromium)
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
- viewing as Player 1, Sam's action dragged onto Devreux says "Only the GM can aim at Devreux."
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
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the held sticky jumped from 995,132 when its record changed (Chromium) *Earlier —* 2026-11-13 — rang: the held sticky jumped from 995,132 when its record changed (Chromium)
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
**Purpose:** R252–R256, R260, R268–R272
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
