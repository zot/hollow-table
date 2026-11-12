# Test Design: GameStore
**Source:** crc-GameStore.md

## Test: write-through writes only what changed
**Purpose:** a save after a pause writes the differing records, deletes the vanished, in one tx
**Input:** MemoryDb; open the playtest game; change two records and delete one; a change that sets
a record to what's stored
**Expected:** after the pause, one transaction with two puts and one delete; nothing for the no-op
**Refs:** crc-GameStore.md, crc-Game.md, seq-save.md
**Code:** `src/store/gamestore.test.ts`

## Test: checkpoints and restore
**Purpose:** the checkpoint and restore round trip
**Input and Expected**, in order:
1. first visit: the playtest scene (8 pieces, round 0, no images, nothing buried) saved as a game
2. changes (Devreux moved, a chip, two rolls, round 2, an image, a burial); reopen: identical
3. checkpoint "Two rolls in", roll a third time (3 rolls)
4. restore "Two rolls in": 2 rolls; checkpoints newest first: "Before restoring “Two rolls in”",
   "Two rolls in"
5. restore "Before restoring …": 3 rolls
6. End twice: round 0; newest checkpoint "End of conflict, round 2"
7. the Ledger shows the name, "Saved hh:mm:ss", 4 checkpoints, 1 game
8. 25 automatic checkpoints: the newest 20 automatic kept; named ones all kept
**Refs:** crc-GameStore.md, seq-restore.md
**Code:** `src/store/gamestore.test.ts`

## Test: games and copies
**Purpose:** a list of games each with its own table; a player's copy is never listed or last
**Input:** create two games, change one, open the other and back; make a copy for a room; New game
**Expected:** each game's records intact; the list shows the games; New game is empty (no pieces,
round 0); `last` never names the copy
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
