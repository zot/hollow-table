# Test Design: GameStore
**Source:** crc-GameStore.md

## Test: write-through writes only what changed
**Purpose:** a save after a pause writes the differing records, deletes the vanished, in one tx
**Input:** MemoryDb on a fake clock; open the playtest game; change two records and delete one,
the second change 300 ms after the first; a change that sets a record to what's stored; any save
already started is let finish before the pause is checked
**Expected:** nothing written until 400 ms after the last change; then one transaction with two puts
and one delete; nothing for the no-op. IdbDb, the page's IndexedDB, is the same interface and is
exercised by the browser tests (test-Network, test-Seat)
**Refs:** crc-GameStore.md, crc-Game.md, seq-save.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 1
**Fire alarm:** Keep the first change's timer instead of restarting the pause (drop the `clearTimeout`): the first write lands at 400 ms, before the pause after the last change is over
**Inject:** src/store/gamestore.ts:constructor
**Pulled:** 2026-11-12 — rang: a write landed before the pause after the last change was over (3 transactions logged, not 2)

## Test: checkpoints and restore
**Purpose:** the checkpoint and restore round trip
**Input and Expected**, in order:
1. first visit: the playtest scene (9 pieces, round 0, no images, nothing buried) saved as a game
2. changes (Devreux moved, a chip, two rolls, round 2, an image, a burial); reopen: identical
3. checkpoint "Two rolls in", roll a third time (3 rolls)
4. restore "Two rolls in": 2 rolls, and only the records that differ (meta, tape) written;
   checkpoints newest first: "Before restoring “Two rolls in”", "Two rolls in"
5. restore "Before restoring …": 3 rolls
6. End as Register does it (an automatic checkpoint "End of conflict, round 2", then round 0):
   round 0; newest checkpoint "End of conflict, round 2"
7. what the Ledger shows: the name, "Saved hh:mm:ss", 4 checkpoints, 1 game
8. 25 automatic checkpoints: the newest 20 automatic kept; named ones all kept
End's two presses and the Ledger's page are the views' (test-Table); this drives GameStore directly.
**Refs:** crc-GameStore.md, seq-restore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 2
**Fire alarm:** Take the book back on restore (load the checkpoint's records as they are): Dana's claim and gv 7 are lost
**Inject:** src/store/gamestore.ts:restore
**Pulled:** 2026-11-12 — rang: the restore wrote the book as well as meta and tape (`gamestore.test.ts:85`)

## Test: games and copies
**Purpose:** a list of games each with its own table; a player's copy is never listed or last
**Input:** create two games, change one, open the other and back; make a copy for a room; New game
**Expected:** each game's records intact; the list shows the games; New game is empty (no pieces,
round 0); `last` never names the copy
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 3
**Fire alarm:** Remember any game opened as the last (drop the `copyOf` test): `hollow.last` names `m-room-1`
**Inject:** src/store/gamestore.ts:open
**Pulled:** 2026-11-12 — rang: `hollow.last` named `m-room-1`, the copy

## Test: a restore's checkpoint names never nest
**Purpose:** R292: "Before restoring “X”", or "Before undoing “X”" when X was itself one
**Input:** `Two rolls in`; `Before restoring “Two rolls in”`; `Before undoing “Two rolls in”`
**Expected:** `Before restoring “Two rolls in”`, then `Before undoing “Two rolls in”` twice
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 4
**Fire alarm:** Always say restoring: the second reads `Before restoring “Before restoring “Two rolls in””`
**Inject:** src/store/gamestore.ts:beforeRestoring
**Pulled:** 2026-11-13 — rang: the second read `Before restoring “Before restoring “Two rolls in””`

## Test: a save that fails says why, and is tried again
**Purpose:** R291: "Not saved: " and why; the change is written by the next save that works
**Input:** the database refusing every transaction ("the disk is full") while Round 4 is saved;
then working again
**Expected:** `Not saved: the disk is full`; then "Saved" with the time, and Round 4 stored
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 5
**Fire alarm:** Drop the failed records instead of keeping them pending: Round 4 is never stored
**Inject:** src/store/gamestore.ts:GameStore.save
**Pulled:** 2026-11-13 — rang: with the database back, the status stayed `Not saved: the disk is full`, nothing retried
