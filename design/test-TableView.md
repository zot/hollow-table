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

## Test: a pinch is a sheet stuck to the fingers
**Purpose:** R479: pinchView keeps the table point under the fingers' first midpoint under their midpoint now, zooms by the ratio of their spacing within the wheel's limits, and never turns
**Input:** a view `{100, 50, 1}`, fingers at 200, 200 and 400, 200; moved apart to twice the spacing; moved together by 30, −10; turned a quarter about their midpoint; one moved far out; brought nearly together; from no spacing at all
**Expected:** `{−100, −100, 2}`; `{130, 40, 1}`; the view unchanged; `{700, −175, 2.5}`; zoom 0.25; `{220, 60, 1}`
**Refs:** crc-TableView.md
**Code:** `src/ui/table.test.ts`
**Alarm:** 3
**Fire alarm:** In pinchView, drop the clamp to the wheel's limits: the far-out pinch zooms to 10
**Inject:** src/ui/table.ts:pinchView
**Pulled:** 2026-11-23 — rang: the far-out pinch zoomed to 10 (x −800, y −1300); restored clean
