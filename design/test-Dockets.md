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
**Purpose:** R532, R536, R538, R539, R541, R542, R543, R544, R529, R530, R535: making, filling, moving, tying and putting away a docket, across the GM's page and a player's.
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

