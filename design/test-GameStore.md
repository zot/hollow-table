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
**Purpose:** the mockup's `persist.cjs` sequence
**Input:** roll twice, checkpoint "Two rolls in", roll, restore, restore "Before restoring…", End
twice; then 25 automatic checkpoints
**Expected:** `persist.cjs` results; 20 automatic kept, named ones all kept
**Refs:** crc-GameStore.md, seq-restore.md
**Code:** `src/store/gamestore.test.ts`

## Test: games and copies
**Purpose:** a list of games each with its own table; a player's copy is never listed or last
**Input:** create two games, change one, open the other; make a copy for a room
**Expected:** each game's records intact; list shows two; `last` never names the copy
**Refs:** crc-GameStore.md
**Code:** `src/store/gamestore.test.ts`
