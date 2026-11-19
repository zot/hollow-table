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
**Pulled:** 2026-11-19 — re-pulled after R455 (the constructor changed): rang, the first write landed before the pause was over; restored clean *Earlier —* 2026-11-12 — rang: a write landed before the pause after the last change was over (3 transactions logged, not 2)
## Test: checkpoints and restore
**Purpose:** the checkpoint and restore round trip
**Input and Expected**, in order:
1. first visit: the playtest scene (10 pieces, the Connection Table among them, round 0, no images, nothing buried) saved as a game
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
**Pulled:** 2026-11-19 — re-pulled after R455 (save changed): rang, Round 4 was never stored; restored clean *Earlier —* 2026-11-13 — rang: with the database back, the status stayed `Not saved: the disk is full`, nothing retried
## Test: a checkpoint the store refuses is said until one is kept
**Purpose:** R454: a checkpoint a full store refuses is said in the status until one is kept
**Input:** a MemoryDb whose checkpoint writes throw a QuotaExceededError while full; a checkpoint "Round 3" while full; "Round 4" after
**Expected:** "Round 3" rejects and the status reads "Checkpoint “Round 3” not kept:" and why; after "Round 4" it reads "Saved…"
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 6
**Fire alarm:** leave a refused checkpoint unsaid (status ignores it); red: the status reads "Saved"
**Inject:** src/store/gamestore.ts:GameStore.status
**Pulled:** 2026-11-19 — rang: the status read "Saved", not the refused checkpoint; restored clean

## Test: the browser is asked to keep the storage once, after the first save
**Purpose:** R455: the browser is asked to keep this storage once, after the first save that writes something
**Input:** a store whose `keep` counts its calls and says yes; kept() before any save; two saves, each after a roll
**Expected:** null before; asked once; kept() true
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 7
**Fire alarm:** ask after every save (keep never forgotten); red: asked twice
**Inject:** src/store/gamestore.ts:GameStore.save
**Pulled:** 2026-11-19 — rang: asked twice; restored clean

## Test: deleting games, copies and checkpoints, and the images still used
**Purpose:** R457, R458, R459: forget a game or a copy with all it holds, never the open one; forget a checkpoint; list the copies; know every image still used, buried ones included
**Input:** the open game with an image in a checkpoint and then deleted; another game with an image; a copy; forget the open game; forget the other game, the checkpoint, then the copy; an image buried in Boot Hill's yards
**Expected:** images a (the checkpoint) and b (the other game); the copy listed as joined; forgetting the open game rejects; the other game gone with its records; then only a; after the checkpoint, none; the buried image counts; the copy gone
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
**Alarm:** 8
**Fire alarm:** count only top-level records as using an image (no deep look); red: the image in the checkpoint isn't counted
**Inject:** src/store/gamestore.ts:GameStore.images
**Pulled:** 2026-11-19 — rang: the image in the checkpoint wasn't counted (a in a checkpoint, b in another game); restored clean
