# Test Design: Desk
**Source:** crc-Desk.md

## Test: what letting go means
**Purpose:** R513-R516: release decides from the move, the pigeonhole, the supply held, a drag out and touch
**Input:** no move on the desk; a move ending in the sticky's pigeonhole, by mouse and by touch; in the image pigeonhole; the image dragged out onto the table; a move ending in the strip off any pigeonhole; nothing held off the strip
**Expected:** `open`; `loose` and `below`; `picker`; `picker`; `close`; `close`
**Refs:** crc-Desk.md
**Code:** `src/ui/desk.test.ts`
**Alarm:** 1
**Fire alarm:** ignore touch in release; red: a touch let go in the sticky's pigeonhole gives `loose`
**Inject:** src/ui/desk.ts:release
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with touch ignored, a touch let go in the sticky's pigeonhole gave loose; restored clean

## Test: the desk holds the paper supplies
**Purpose:** R509-R512, R518: the bar shows the desk and the chips, no paper supplies; pressing the desk opens its pigeonholes (the Connection Table's on the GM's alone); dragging across them holds each one small; dragging out makes the piece under the pointer
**Input:** the GM's page and Dana's; the GM presses the desk, moves across the sticky's, the text's and the sticky's pigeonholes again, and drags out onto the table
**Expected:** no `.supply.note` in the bar, eight chips; the strip shows six pigeonholes on the GM's page, five on Dana's; the ghost shows the sticky, the text, the sticky; a sticky (no loose text) lands with its middle at the pointer; the strip closes
**Refs:** crc-Desk.md, crc-Bar.md
**Code:** `tests/desk.spec.ts`
**Alarm:** 2
**Fire alarm:** make the held supply the first pigeonhole's whatever the pointer crosses; red: the ghost stays the sticky over the text's pigeonhole
**Inject:** src/ui/desk.ts:DeskView
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the first pigeonhole kept, the ghost stayed the sticky over the text's (Chromium); restored clean

## Test: let go in a pigeonhole, and it follows until the next press
**Purpose:** R513: the piece follows the pointer with no button held; the next press puts it down even on another piece, which stays where it is; a press on the bar, or Esc, takes it back unmade; a click opens the whole desk until a press elsewhere (R516)
**Input:** the GM lets go in the sticky's pigeonhole, moves over Sam's card's flip corner and presses; again, then presses on the bar; again, then Esc; clicks the desk, then presses the table
**Expected:** the first sticky lies where the press was, Sam's card unmoved and not turned over; no other sticky is made; the desk opens with its pigeonholes and closes
**Refs:** crc-Desk.md, crc-Drag.md
**Code:** `tests/desk.spec.ts`
**Alarm:** 3
**Fire alarm:** let the ending press through to what lies under it; red: Sam's card turns over (a press on a card's middle, unmoved, showed nothing: the first injection was silent)
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the ending press let through, Sam's card turned over (Chromium); restored clean. Its first form, a press on the card's middle, stayed green under the same injection and was rewritten

## Test: the image pigeonhole opens the picker, let go in or dragged out
**Purpose:** R515: let go in the image pigeonhole, the picker opens and the image comes carried; dragged out, the picker opens on the drop and the image lands there; R514: on touch a sticky lands below the strip
**Input:** the GM lets go in the image pigeonhole and picks a PNG, then presses the table; drags the image out to a point and picks a PNG; on a touch page, taps the desk and then the sticky's pigeonhole
**Expected:** a file chooser each time; the first image where the press was, the second with its middle at the drop; the touch sticky's top just below the strip
**Refs:** crc-Desk.md
**Code:** `tests/desk.spec.ts`
**Alarm:** 4
**Fire alarm:** open no picker on a drag out (release gives `close`); red: no file chooser after the drop
**Inject:** src/ui/desk.ts:release
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with a drag out giving close, no file chooser came after the drop (Chromium, timed out); restored clean
