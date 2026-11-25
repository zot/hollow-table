# Test Design: Desktops
**Source:** crc-Desktops.md

## Test: who travels
**Purpose:** R558: players' and open characters with their cards, slot chips and pinned paper; players' paper and dockets with theirs; nothing else, and never the Connection Table or an Opinion Record.
**Input:** the playtest scene with an open character, a player's sticky pinned to an NPC, the GM's note pinned to a PC, a player's docket holding the GM's note, a loose chip, and this page's reference sheet.
**Expected:** exactly the travelers named in the purpose.
**Refs:** crc-Desktops.md
**Code:** src/rules/desktops.test.ts
**Alarm:** 1
**Fire alarm:** leave out paper pinned to a traveler: the GM's note on the PC stays behind
**Inject:** src/rules/desktops.ts:travelers
**Pulled:** 2026-11-24 — 2026-11-24 — rang: without the pass for pinned paper, 'who travels' failed (the GM's note on Sam stayed); restored clean

## Test: setting out and back
**Purpose:** R557, R559, R563: out to an empty desk, every stayer leaves the table into the old desk's desktop and the travelers stay where they lie; moved there, then back, the old desktop returns and each traveler goes back to where it lay.
**Input:** Desk 1 set out with the scene; Desk 2 empty; Sam moved on Desk 2's desktop.
**Expected:** set out to Desk 2: NPCs and the GM's paper deleted, kept in Desk 1's top, Sam where he was; back to Desk 1: they return as they were, Sam at his Desk 1 place, Desk 2 keeps Sam's place there.
**Refs:** crc-Desktops.md
**Code:** src/rules/desktops.test.ts
**Alarm:** 2
**Fire alarm:** forget to put the travelers at their spots: Sam stays where he was moved on Desk 2
**Inject:** src/rules/desktops.ts:setOut
**Pulled:** 2026-11-24 — 2026-11-24 — rang: without moving travelers to their spots, 'setting out and back' failed (Sam stayed where he was moved); restored clean

## Test: the knife switch in the browser
**Purpose:** R559-R562: the GM makes Act 2, throws its knife switch; Sam's page loses the NPCs and gets the empty table with the PCs; the GM files into the set-out desk by default; switched back, Devreux returns on both pages.
**Input:** the GM and Sam; Desk 1 renamed Act 1; › to a new desk named Act 2; its switch thrown; then ‹ and Act 1's switch thrown.
**Expected:** on Act 2 Devreux is gone from Sam's page and the GM's table, Sam's character is still there; Act 2's switch shows thrown; the board marks Act 2 first; back on Act 1, Devreux is back on both pages where it was.
**Refs:** crc-Desk.md, crc-Desktops.md
**Code:** tests/desktops.spec.ts
**Alarm:** 3
**Fire alarm:** never put the new desk's desktop on the table: switching back leaves Devreux missing
**Inject:** src/rules/desktops.ts:setOut
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the new desktop never put on the table, the knife switch spec failed in Chromium (Devreux missing after switching back); restored clean

## Test: the Connection Table never leaves the table
**Purpose:** R558: setting a desk out never takes the Connection Table (nor an Opinion Record) into a desktop.
**Input:** the setting out and back test's scene, which holds the Connection Table.
**Expected:** it is not among the deletions.
**Refs:** crc-Desktops.md
**Code:** src/rules/desktops.test.ts
**Alarm:** 4
**Fire alarm:** let the game's pieces onto the desktop: the Connection Table is deleted with the NPCs
**Inject:** src/rules/desktops.ts:setOut
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with the game's pieces let onto the desktop, 'setting out and back' failed (the Connection Table among the deletions); restored clean

## Test: a page's reference sheet stays on its table
**Purpose:** R593: setting a desk out leaves a page's reference sheet on the table.
**Input:** the setting out and back test's scene, with a reference sheet under `m:`.
**Expected:** the sheet is not among the deletions, nor in Desk 1's desktop.
**Refs:** crc-Desktops.md
**Code:** src/rules/desktops.test.ts
**Alarm:** 5
**Fire alarm:** setOut takes reference sheets as it takes other page-own paper; red: the sheet is deleted into the desktop
**Inject:** src/rules/desktops.ts:setOut
**Pulled:** 2026-11-25 — 2026-11-25 — rang: with setOut taking reference sheets, 'setting out and back' failed (the sheet deleted into the desktop); restored clean, dist rebuilt
