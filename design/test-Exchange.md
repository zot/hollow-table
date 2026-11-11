# Test Design: Exchange
**Source:** crc-Exchange.md

## Test: export and import round trip
**Purpose:** a game survives export then import as a new game
**Input:** the playtest game with one image and two checkpoints; export; import
**Expected:** a new game named "… (imported)"; records and checkpoints equal; the image once in the
file and present after
**Refs:** crc-Exchange.md
**Code:** `src/store/exchange.test.ts`

## Test: a bad file is refused whole
**Purpose:** nothing half-imports
**Input:** a file with one record failing check; one with an image whose bytes don't match its hash
**Expected:** both refused; no game created
**Refs:** crc-Exchange.md
**Code:** `src/store/exchange.test.ts`
