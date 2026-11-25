# Test Design: Dockets
**Source:** crc-Dockets.md

## Test: the hull and its path
**Purpose:** R534: the tape runs round the convex hull of the corners, its corners arcs.
**Input:** the corners of two boxes, one inside the other's reach; one box alone; a single point.
**Expected:** the hull keeps only the outer corners; the path has one arc per hull vertex and one line per edge; a single point is a circle.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts

## Test: the touch test
**Purpose:** R537: a box touches a tape inside it, on its cord or round its arcs, and not past them.
**Input:** a tape round one square; boxes inside it, holding it whole, crossing it with no corner in either, near an arc within r, just past r + CORD/2 off an arc, and far away.
**Expected:** true for inside, holding, crossing, within the arc's reach; false just past the reach and far away.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts
**Alarm:** 1
**Fire alarm:** drop step 5 (the distance step): a box that only reaches the rounded corner, within r of a hull vertex but outside the hull, reads as not touching
**Inject:** src/rules/dockets.ts:touches
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with step 5 returning false, 'the touch test' failed (the box round the arc read as not touching); restored clean

## Test: crossing shapes
**Purpose:** R537 step 4: a long thin box laid across a long thin tape, no corner of either inside the other, touches.
**Input:** a tape round a tall thin box; a wide thin box across its middle, farther than r from every vertex.
**Expected:** touches.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts
**Alarm:** 2
**Fire alarm:** drop the edge-crossing step: the crossing box reads as not touching
**Inject:** src/rules/dockets.ts:touches
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the edge-crossing step dropped, 'crossing shapes' failed; restored clean

## Test: the docket on top
**Purpose:** R538: where tapes overlap a drop joins the one on top; nothing touched, none.
**Input:** two dockets whose tapes both hold a box, at z 3 and 7; a box touching neither.
**Expected:** the z 7 docket; none.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts

## Test: a tied docket's pile
**Purpose:** R542: the papers pile under the label, a step apart, in z order.
**Input:** a label at (100, 100) 40 high; three papers at z 5, 2, 9.
**Expected:** the z 2 paper at (100, 140 + gap), the z 5 one a PILE_STEP right and down from it, then the z 9.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts

## Test: paper follows its holder
**Purpose:** R531: shared paper left behind by a move goes to the holder plus its offset on the GM's page only; a page's own `mine` paper on every page.
**Input:** a card moved without its pinned shared note; a docket moved without its `mine` note; the same records on a player's page.
**Expected:** on the GM's page both are put at holder + offset; on a player's page only the `mine` note; nothing when already in place.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts
**Alarm:** 3
**Fire alarm:** let repin leave a docket's paper alone (only cards as holders): the docket's note stays behind
**Inject:** src/rules/dockets.ts:repin
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with dockets left out of the holders, 'paper follows its holder' failed (the docket's mine note stayed behind); restored clean

## Test: paper whose holder is gone
**Purpose:** R545: paper pinned to a card or docket that is gone is unpinned, where it lies.
**Input:** a shared note pinned to a docket not in the game, deleted (tombstoned) or merely elsewhere, on the GM's page and on a player's.
**Expected:** the GM's page unpins it when the docket was deleted, its place unchanged, and keeps it when the docket is merely elsewhere; a player's page leaves it.
**Refs:** crc-Dockets.md
**Code:** src/rules/dockets.test.ts
**Alarm:** 4
**Fire alarm:** drop the unpinning of an orphan: the note keeps a pin to a docket that is gone
**Inject:** src/rules/dockets.ts:repin
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the unpinning dropped, 'paper whose holder is gone' failed; restored clean

## Test: a docket is paper, buried and filed with its papers
**Purpose:** R533, R544: a docket records readers and files in Papers; its burial takes its pinned paper, a `mine` note to the page's own; it is named "Docket: " and its name.
**Input:** a docket with two notes pinned, one of them `mine`.
**Expected:** drawerOf is papers; putAway's shared holds the docket and the shared note, own the mine note; graveName "Docket: Clues".
**Refs:** crc-Yards.md, crc-Drawers.md
**Code:** src/rules/yards.test.ts
**Alarm:** 5
**Fire alarm:** let burialOf gather pinned paper for characters only: the docket is buried without its notes
**Inject:** src/rules/yards.ts:burialOf
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with burialOf's docket line dropped, 'a docket is paper, buried and filed with its papers' failed (the docket buried alone); restored clean

## Test: the docket in the browser
**Purpose:** R532, R536, R538, R539, R541, R542, R543, R544, R591, R530, R535: making, filling, moving, tying and putting away a docket, across the GM's page and a player's.
**Input:** the GM takes a docket from the desk and names it; drops a sticky inside its tape, one on its cord, one far off; drags a docket's note within the tape and clear of it; drops a note on a card inside the tape; Sam carries the docket by its label while a GM-only note is in it; the GM ties it; a press on the pile carries it; the GM files it and takes it out.
**Expected:** the docket's name reads as typed; the two touching notes are pinned to it, the far one loose; the note dragged within stays pinned at its new place, the one dragged clear is loose; the note on the card is pinned to the card; on the GM's page the GM-only note followed Sam's move; tied, the notes pile under the label on the GM's page while Sam's still lie spread; carried by its pile the whole docket moves; filed and taken out, it comes back with its notes laid out as before.
**Refs:** crc-Drag.md, crc-TableView.md, crc-PieceView.md, crc-Dockets.md
**Code:** tests/dockets.spec.ts
**Alarm:** 6
**Fire alarm:** drop the GM page's repin listener: the GM-only note stays where it was when Sam carries the docket
**Inject:** src/main.ts:repinned
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the repin listener's microtask dropped, the across-pages spec failed in Chromium (the GM-only note stayed where it was when Sam carried the docket); restored clean

## Test: the tape leaves out the paper being carried
**Purpose:** R539: a docket's paper dragged clear comes off, because the tape it is tested against is drawn without it.
**Input:** the browser docket test's drag of a pinned note 500 px clear of its docket.
**Expected:** the note is loose after the drop.
**Refs:** crc-TableView.md, crc-Drag.md
**Code:** tests/dockets.spec.ts
**Alarm:** 7
**Fire alarm:** leave the carried paper in each target's tape: its own box always touches, so it never comes off
**Inject:** src/ui/table.ts:targets
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the carried paper left in each target's tape, the docket browser spec failed in Chromium; restored clean

## Test: a press on a tied pile carries the docket
**Purpose:** R543: a tied docket is closed; a drag on its pile moves the docket, the paper keeping its pin.
**Input:** the browser docket test's drag on the piled note.
**Expected:** the docket's place moved; the note's pin unchanged.
**Refs:** crc-Drag.md
**Code:** tests/dockets.spec.ts
**Alarm:** 8
**Fire alarm:** drop the redirect in Drag.start: the note is carried alone, off its docket, and the docket stays
**Inject:** src/ui/drag.ts:start
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with Drag.start's tied redirect dropped, the docket browser spec failed in Chromium; restored clean


## Test: a character's card joins a docket
**Purpose:** R584: a character's card let go just under a docket's label puts the character in.
**Input:** the GM's page: a docket "NPCs" and Gant, an NPC; Gant's card dragged by its corner to just under the label.
**Expected:** Gant's record pins it to the docket.
**Refs:** crc-Drag.md, crc-Records.md
**Code:** tests/dockets.spec.ts
**Alarm:** 9
**Fire alarm:** Drag's drop never pins a character (docketed keeps the character as it was); red: Gant has no pin
**Inject:** src/ui/drag.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the drop never pinning a character, Gant had no pin (line 163, Chromium); restored clean, dist rebuilt

## Test: a character's pool decides by its card
**Purpose:** R584: a pool let go alone keeps its character in while its card still touches the tape.
**Input:** as "a character's card joins a docket", then Gant's pool dragged a little, then far.
**Expected:** after the little drag Gant is still in, its offset changed; after the far one, out.
**Refs:** crc-Drag.md
**Code:** tests/dockets.spec.ts
**Alarm:** 10
**Fire alarm:** a carried pool aims at no docket (startPool's frame without the aim); red: the little drag takes Gant out
**Inject:** src/ui/drag.ts:startPool
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with a carried pool aimed at no docket, the little pool drag took Gant out (line 171, Chromium); restored clean, dist rebuilt

## Test: the tape goes round a character's card
**Purpose:** R585: a docket's tape takes in the cards of its characters.
**Input:** as "a character's card joins a docket".
**Expected:** the tape reaches below Gant's card.
**Refs:** crc-TableView.md
**Code:** tests/dockets.spec.ts
**Alarm:** 11
**Fire alarm:** TableView's dockets list no characters; red: the tape stops at the label
**Inject:** src/ui/table.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with TableView listing no characters, the tape stopped short of the card (line 166, Chromium); restored clean, dist rebuilt

## Test: the label carries a character's card and pool together
**Purpose:** R586: the drop of a carried docket moves each character's card and pool by the same amount.
**Input:** as "a character's card joins a docket", then the docket carried by its label.
**Expected:** Gant's card and pool moved by the same amount.
**Refs:** crc-Drag.md
**Code:** tests/dockets.spec.ts
**Alarm:** 12
**Fire alarm:** the docket's drop moves a character's card but not its pool; red: the pool's move differs from the card's
**Inject:** src/ui/drag.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the docket drop leaving the pool, the pool moved differently from the card (line 185, Chromium); restored clean, dist rebuilt

## Test: a tied docket piles its characters
**Purpose:** R588: tied, a docket piles each character's pool mat and card.
**Input:** as "a character's card joins a docket", then the knot clicked twice.
**Expected:** tied, two pieces piled (Gant's pool mat and card); untied, none.
**Refs:** crc-TableView.md, crc-Dockets.md
**Code:** tests/dockets.spec.ts
**Alarm:** 13
**Fire alarm:** TableView's pile leaves characters out; red: nothing piled
**Inject:** src/ui/table.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the pile leaving characters out, nothing piled (line 189, Chromium); restored clean, dist rebuilt

## Test: a buried docket takes its characters
**Purpose:** R589: burying a docket buries the characters in it, with everything on them.
**Input:** as "a character's card joins a docket", then the docket dropped on the bar.
**Expected:** Gant is gone from the table, and the burial "Docket: NPCs" holds Gant's record.
**Refs:** crc-Yards.md
**Code:** tests/dockets.spec.ts
**Alarm:** 14
**Fire alarm:** Yards.burialOf of a docket leaves its characters out; red: Gant is still on the table
**Inject:** src/rules/yards.ts:burialOf
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with burialOf leaving characters out, Gant stayed on the table (line 196, Chromium); restored clean, dist rebuilt

## Test: a docket's NPC follows a player's carry
**Purpose:** R587: the GM's page brings a character the carrier may not move to its docket's label.
**Input:** the GM's docket "NPCs" holding Gant, the GM's NPC; Dana, a player, carries the docket by its label.
**Expected:** on the GM's page Gant's card is back at the label plus its offset, its pool as far from the card as before.
**Refs:** crc-Dockets.md
**Code:** tests/dockets.spec.ts
**Alarm:** 15
**Fire alarm:** Dockets.repin brings no character; red: Gant stays where it was
**Inject:** src/rules/dockets.ts:repin
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with repin bringing no character, Gant stayed where it was on the GM's page (line 216, Chromium); restored clean, dist rebuilt

## Test: a player's desk buries a docket's characters
**Purpose:** R589: a player filing a docket on their desk files the docket and buries the characters in it.
**Input:** Dana's docket "Mine" holding Wren, her character; Dana drops the docket on her desk.
**Expected:** Dana's drawer holds "Docket: Mine" with the docket alone; Wren is gone from the table and buried.
**Refs:** crc-Drag.md
**Code:** tests/dockets.spec.ts
**Alarm:** 16
**Fire alarm:** Drag's filing takes no characters out of a player's docket; red: Dana's drawer holds Wren's records too
**Inject:** src/ui/drag.ts
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with no characters taken out of a player's docket, Dana's drawer held Wren too (line 222, Chromium); restored clean, dist rebuilt

## Test: a docket's open menu lies over the paper pinned to it
**Purpose:** R596: a paper's open ▾ menu is raised with its paper over every other piece, the docket's own pinned paper too.
**Input:** the GM's docket "Clues" with a sticky pinned just under its label; the GM opens the docket's ▾.
**Expected:** where the menu and the sticky overlap, the topmost element is the menu.
**Refs:** crc-PieceView.md
**Code:** tests/dockets.spec.ts
**Alarm:** 17
**Fire alarm:** the open menu's paper is not raised; red: the sticky is on top where they overlap
**Inject:** src/ui/theme.css
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with the `:has(> .readmenu)` rule removed, the sticky lay over the menu (Chromium and Firefox); restored clean, dist rebuilt

## Test: untied, the tape goes round the papers where they lie again
**Purpose:** R534, R542: tying and untying a docket leaves its tape as it was, round its papers where their records say.
**Input:** the GM's docket "Leads" with two stickies pinned well apart; the knot tied, then untied.
**Expected:** tied, the tape changes to go round the pile; untied, it is the same path as before the tie.
**Refs:** crc-TableView.md
**Code:** tests/dockets.spec.ts
**Alarm:** 18
**Fire alarm:** TableView.tapes reads the boxes before the untied papers go back; red: the untied tape still goes round the pile
**Inject:** src/ui/table.ts:tapes
**Pulled:** 2026-11-25 — 2026-11-25 — rang before the fix, the bug itself: untied, the tape kept the pile's shape (Chromium and Firefox); passes after
