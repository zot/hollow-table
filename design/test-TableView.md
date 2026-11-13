# Test Design: TableView
**Source:** crc-TableView.md

## Test: a growing drawer pushes what it covers
**Purpose:** R241: only the pieces the grown mat covers slide, each just clear below it
**Input:** a mat grown to y 400; a piece whose top it covers, one beside it, one already clear below,
one overlapping its right edge
**Expected:** the covered piece slides 34 (to 414) and the edge one 264; the other two stay
**Refs:** crc-TableView.md
**Code:** `src/ui/table.test.ts`
**Alarm:** 1
**Fire alarm:** Test overlap on one axis only (drop the left/right test): the piece beside the mat is pushed too
**Inject:** src/ui/table.ts:pushClear
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the piece beside the mat was pushed too (dy 34) *Earlier —* 2026-11-12 — rang: the piece beside the mat was pushed too
## Test: a first visit fits the table
**Purpose:** R271: fitView shows a box in the table: centred, zoom at most 1 and never below the
least, 20 px a side and 14 px from the top
**Input:** the mockup's 1880 × 990 scene in a 1000 × 800 table; a 200 × 100 box at 100, 50; a very
wide box
**Expected:** zoom 960 / 1880, x 20, y 14; `{x 300, y −36, zoom 1}`; the least zoom
**Refs:** crc-TableView.md
**Code:** `src/ui/table.test.ts`
**Alarm:** 2
**Fire alarm:** In fitView, drop the cap at full size: the small box is drawn at zoom 4.5
**Inject:** src/ui/table.ts:fitView
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the small box was fitted past full size *Earlier —* 2026-11-12 — rang: the small box was drawn at zoom 4.5 (x −460, y −226)
