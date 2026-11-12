# Test Design: Game
**Source:** crc-Game.md

## Test: one door for change
**Purpose:** every change is checked, lands whole, and is heard once
**Input:** the playtest scene loaded; a change moving Devreux and burying Sam (delete Sam, put the
yards); a change whose second put fails check; a put equal to what is there; a load
**Expected:** the burial is heard once, with both rids; the failing change throws and changes
nothing, its first put included; the equal put is not heard; load is heard with every rid, old and
new; a stopped listener hears nothing more
**Refs:** crc-Game.md, seq-save.md
**Code:** `src/model/game.test.ts`
**Alarm:** 1
**Fire alarm:** Apply each put as it is made instead of after `fn` returns: the refused change leaves Devreux renamed
**Inject:** src/model/game.ts:change
**Pulled:** 2026-11-12 — rang: the burial was heard with the wrong rids (`game.test.ts:22`): puts applied early made the change look like no change
