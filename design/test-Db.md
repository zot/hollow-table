# Test Design: Db
**Source:** crc-Db.md

## Test: a transaction lands whole
**Purpose:** MemoryDb keeps IndexedDB's promises, which the store's tests rely on
**Input:** a transaction that puts two records and then throws; a readonly transaction that puts;
two transactions started together, the first slower; `all` with a game prefix
**Expected:** after the throw, neither record is there and nothing is logged; the readonly put is
refused; the second transaction sees the first's write; the prefix picks only that game's keys
**Refs:** crc-Db.md
**Code:** `src/store/db.test.ts`
**Alarm:** 1
**Fire alarm:** Keep what a failed transaction did (commit on throw): the two records from the throwing transaction are there
**Inject:** src/store/db.ts:tx
**Pulled:** 2026-11-12 — rang: the two records from the throwing transaction were kept
