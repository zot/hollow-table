# Test Design: the table in the browser
**Source:** crc-TableView.md

One page, through the test hook, starting from the playtest scene (Sam: Player 1, Beauford:
Player 2, Devreux: GM; a GM sticky; a reference card).

## Test: characters and pools
**Purpose:** making, linking, following and burying characters; narrowing slots
**Expected:**
- the bar's supplies are character, note, text, image, how-to card and chips
- dropping a character on the table: a new pool pops out above its card, linked and gathered (gap
  14 px), owned by the maker (Player 2 when Player 2 drops it); a pool popped near the top is below
  the bar; dropped back on the bar, nothing is made
- dragging a pool brings its gathered card; the drawer growing keeps the card snapped; the card
  dragged alone stays put and ungathered while the drawer grows; Gather snaps it back
- putting away a pool or its card buries both; Boot Hill lists them; dragging Sam out puts his pool
  at the drop with his card following, his chip and note kept; a sticky on the bar is buried and
  comes back with its text
- an empty pool opens Bonus, Main, Edge and Stagger with B, A and I as strips at the right edge; carrying a chip over a strip opens it and closes the slot it came
  from (if now empty) or the first empty one to the left, and dragging back swaps them again
- a press beside a pool's name pans the table; on the name, it moves the pool
**Refs:** crc-PoolView.md, crc-Drag.md, crc-BootHillView.md, seq-drag.md
**Code:** `tests/table.spec.ts`

## Test: Influence in the browser
**Purpose:** drawers, piles, merging and secrecy as a person does them
**Expected:**
- Devreux's drawer starts `Keep the Peace +Sig, Self-Preservation +Sig, Old Sympathy for Sparkers
  +Min`; three 4s in Main make a pile acting as 6; an open pile lists its members; a member dragged
  to the table goes home; a card dropped on another drawer moves there; the kill box deletes
- taps merge into resource-made cards in drawers, in pools and across characters; a tap on a plain
  card doesn't merge
- as Player 1: Beauford's and Devreux's cards face-down; Devreux's chips show no names on hover
**Refs:** crc-PoolView.md, crc-Drag.md, crc-Tap.md
**Code:** `tests/table.spec.ts`

## Test: rolls, tape, register
**Purpose:** the roll row, aiming, receipts, the tape and the register
**Expected:**
- the bar has no roll controls; the row docks on a die click; White opens the nine-row Difference
  menu (words first, dice at the right); a click away closes it
- aiming Devreux's Attack (4) at Sam offers Mental 2 / Psych 4; Mental gives `vs Sam 2 (+2)`, White;
  Stagger −6 on Sam gives +8, Green + 1; Main +4 on Devreux gives 8 vs −4, +12, Outclass; a row
  picked by hand holds as pools change; the receipt records Total Influence and the Difference
- Player 1 can't aim at hidden Devreux ("Only the GM can aim at Devreux."); when the GM aims Sam at
  Devreux, Player 1's row shows `vs Devreux`, "White − 1 (set by the GM)", the menu locked
- the action in use is highlighted, follows the choice, survives an edit, clears with the Base
- a roll prints newest first under the register; the paper roll rolls the tape up and down; a press
  on the table lowers it under the pools; dragging it tears off the whole roll, which scrolls inside;
  the next roll starts a fresh tape; the torn roll buries as "Tape: 5 rolls, last Devreux, roll 5"
- a second roll sweeps used cards into the used pile; a card restored from it is kept for one roll;
  End once raises the tab and changes nothing; End twice: round 0, Biases recharged, used piles
  empty, plain cards home
**Refs:** crc-RollRow.md, crc-Tape.md, crc-Register.md
**Code:** `tests/rolls-local.spec.ts`

## Test: the quality floor
**Purpose:** every shift-click control also answers a long press; focus is visible; reduced motion
removes transitions; no text in the bar is instructions
**Input:** each control registered with Gesture; a long press on each
**Expected:** the same result as shift-click for every one
**Refs:** crc-Gesture.md, manifest-ui.md
**Code:** `tests/floor.spec.ts`
