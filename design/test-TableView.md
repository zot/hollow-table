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
**Pulled:** 2026-11-12 — rang: the piece beside the mat was pushed too
