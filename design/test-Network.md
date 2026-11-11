# Test Design: the table over the wire (browser)
**Source:** crc-Wire.md

Two or more pages in a real browser, meeting through the relays, driven through the page's test
hook. Each ports a mockup script that passed on 11-11; its printed results become assertions.

## Test: join and sync
**Purpose:** `wire.cjs`, `presence.cjs`, `sync.cjs`: two pages find each other, prove identities,
sync; drags and edits show both ways; a refused move is put back; a reload shows the copy, then syncs
**Input:** a GM page and a player page
**Expected:** as in those scripts
**Refs:** crc-Wire.md, crc-Presence.md, seq-join.md, seq-sync.md
**Code:** `tests/sync.spec.ts`

## Test: secrets
**Purpose:** `secret.cjs`: Eve at the table, owning nothing, hears no secret word in the clear
**Input:** GM, Dana, Eve
**Expected:** as in `secret.cjs`
**Refs:** crc-Authority.md, crc-Seal.md
**Code:** `tests/secret.spec.ts`

## Test: away, claims, two players
**Purpose:** `away.cjs`, `claims.cjs`, `two.cjs`
**Expected:** as in those scripts
**Refs:** crc-Copy.md, crc-Claims.md
**Code:** `tests/away.spec.ts`

## Test: a deletion reaches a player who is at the table
**Purpose:** the 11-11 receipts bug, end to end
**Input:** GM rolls three times, tears off the tape, drags it to the bar, empties the graveyard,
with Dana present throughout; then again with Dana away and back
**Expected:** Dana's table has no torn roll in either case
**Refs:** crc-Authority.md, crc-Stamps.md, seq-sync.md
**Code:** `tests/deletion.spec.ts`

## Test: images and rolls
**Purpose:** `images.cjs`, `tablerolls.cjs`, `gmrolls.cjs`, plus a CRIT locked by its owner
**Expected:** as in those scripts; the lock shows on every tape
**Refs:** crc-ImageExchange.md, crc-Rolls.md, seq-roll.md, seq-images.md
**Code:** `tests/rolls.spec.ts`
