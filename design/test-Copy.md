# Test Design: Copy
**Source:** crc-Copy.md

## Test: pending until answered
**Purpose:** the mockup's `away.cjs` logic, with a fake clock and wire
**Input:** a change whose edit is dropped; the GM's page away while two changes are made; a reload
with pending changes; the GM's page back
**Expected:** resent after 3 s; pending survives the reload; on the GM's return the whole table is
asked for and pending changes go again; answers clear them; after 5 tries the GM's version wins
**Refs:** crc-Copy.md, seq-edit.md
**Code:** `src/net/copy.test.ts`

## Test: catch-up and gaps
**Purpose:** a full table removes what the GM doesn't have, except pending new pieces; a gap asks
again; one player's catch-up doesn't move the version for another (`two.cjs`)
**Input:** a copy with an extra piece and a pending new one; batches 4, 6; a catch-up for another tab
**Expected:** the extra piece gone, the pending one kept; a sync asked after 1.5 s; seen unchanged
**Refs:** crc-Copy.md, seq-sync.md
**Code:** `src/net/copy.test.ts`
