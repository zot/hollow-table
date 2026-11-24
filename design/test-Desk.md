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
**Purpose:** R529, R510, R530, R512, R518: the bar shows the desk and the chips, no paper supplies; pressing the desk opens its pigeonholes (the Connection Table's on the GM's alone); dragging across them holds each one small; dragging out makes the piece under the pointer
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

## Test: the GM files an NPC, and Dana's page loses it
**Purpose:** R519-R521, R523, R524, R526, R527: let go over the GM's desk, Devreux is filed in NPCs with its cards, the hint saying "→ NPCs"; Dana's page holds nothing of it, not even its name; the open desk's NPCs drawer lists it; dragged out, it comes back where it is let go, with its cards, and Dana's page has it again
**Input:** the GM and Dana; the GM drags Devreux's pool over the desk (checks the hint) and lets go; opens the desk and the NPCs drawer; drags Devreux out onto the table
**Expected:** "→ NPCs" while over the desk; Devreux and its Influence cards gone from both pages' tables, in the GM's `desk` record and in no record of Dana's; the drawer lists "Devreux" (its pool's name, as Boot Hill names it); brought back, Devreux and its cards on both pages, the drawer empty ("Nothing filed here.")
**Refs:** crc-Desk.md, crc-Drag.md, crc-Drawers.md, crc-Authority.md
**Code:** `tests/desk.spec.ts`
**Alarm:** 5
**Fire alarm:** let `desk` out of isLocal; red: Dana's page holds the desk record with Devreux
**Inject:** src/model/records.ts:isLocal
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with desk out of isLocal, Dana's page held the GM's desk with Devreux's whole sheet (Chromium); restored clean

## Test: a player's drawer is her own
**Purpose:** R521, R525: Dana's desk has Papers alone; her sticky filed there leaves the table on every page and is in her `desk` record alone, through a reload; her character let go over her desk is buried
**Input:** Dana makes a sticky and lets it go over her desk; reloads; makes a character and lets its pool go over her desk
**Expected:** one drawer, Papers; the sticky in her `desk` and on no page's table, still after the reload; the GM's page holds no `desk` entry of hers; her character buried on Boot Hill, not filed
**Refs:** crc-Desk.md, crc-Drag.md, crc-Copy.md
**Code:** `tests/desk.spec.ts`
**Alarm:** 6
**Fire alarm:** file characters on a player's page too (drawerOf ignoring `gm`); red: her character goes into her desk
**Inject:** src/rules/drawers.ts:drawerOf
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with drawerOf ignoring gm, Dana's character lit her desk to be filed (Chromium); restored clean

## Test: the search line finds what is filed, and lists every name
**Purpose:** R546-R549: the open desk's search line lists every name with nothing typed, narrows as it is typed, says "Nothing found.", drags a result out, and reads the page's own desk.
**Input:** the GM's desk holding Devreux and a note "buy rope / the coach left at dawn"; the GM focuses the line, types COACH, then " nobody", clears it, types "dev" and drags the result out; Dana opens her desk's line.
**Expected:** Devreux (NPCs) and the note (Papers), alphabetical; COACH leaves the note; "Nothing found."; cleared, both again; Devreux back on the table, the desk holding the note; Dana's line says "Nothing filed here."
**Refs:** crc-Desk.md, crc-Drawers.md
**Code:** tests/desk.spec.ts
**Alarm:** 7
**Fire alarm:** leave the list shut when the line takes the caret (no `#searching` on focus): with nothing typed, no names show
**Inject:** src/ui/desk.ts:DeskView
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with no list on focus, the search line spec failed in Chromium (no names with nothing typed); restored clean

## Test: the GM's desks: browsed, named, and filed into by the board
**Purpose:** R551-R556: the GM's open desk names its desk between arrows; › makes another; carrying Devreux over the desk hangs the board, the open desk first; a row under the pointer lights and names itself in the hint, and letting go there files into it; search says the desk; ‹ goes back.
**Input:** the GM names Desk 1 "Act 1", makes another with › and names it "Act 2", carries Devreux over the desk and down onto Act 1's row, lets go, then searches and goes back with ‹.
**Expected:** "Desk 1" then the new "Desk 1" renamed; board rows Act 2, Act 1; hint "→ Act 2: NPCs" then "→ Act 1: NPCs" with the row lit; Devreux in Act 1; search shows "Act 1: NPCs"; ‹ shows Act 1's NPCs drawer holding Devreux. A player has no arrows.
**Refs:** crc-Desk.md, crc-Drag.md, crc-Drawers.md
**Code:** tests/desk.spec.ts
**Alarm:** 8
**Fire alarm:** file into the open desk whatever row is under the pointer (#deskAt ignores the row): Devreux lands in Act 2
**Inject:** src/ui/drag.ts:Drag
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with #deskAt ignoring the row, the GM's desks spec failed in Chromium at the row lighting (the row under the pointer not lit, the hint naming Act 2), before the drop; restored clean

## Test: the board puts the open desk first
**Purpose:** R554: the board's first row is the open desk, then the rest in order.
**Input:** the GM's desks spec, Act 2 open when Devreux is carried over the desk.
**Expected:** rows Act 2, Act 1.
**Refs:** crc-Desk.md
**Code:** tests/desk.spec.ts
**Alarm:** 9
**Fire alarm:** list the desks in their own order: Act 1 comes first
**Inject:** src/ui/desk.ts:DeskView
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the desks in their own order, the GM's desks spec failed in Chromium (rows Act 1, Act 2); restored clean
