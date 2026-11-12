# Test Design: Exchange
**Source:** crc-Exchange.md

## Test: export and import round trip
**Purpose:** a game survives export then import as a new game
**Input:** the playtest game with one image, two rolls and four checkpoints; export; import
**Expected:** a file `The-11-08-playtest.glimmer.json` holding the records, 4 checkpoints and the
image once; import makes a new game "The 11-08 playtest (imported)" with an equal table; both
games listed
**Refs:** crc-Exchange.md
**Code:** `src/store/exchange.test.ts`

## Test: a bad file is refused whole
**Purpose:** nothing half-imports
**Input:** a file with one record failing check; one with an image whose bytes don't match its hash
**Expected:** both refused; no game created
**Refs:** crc-Exchange.md
**Code:** `src/store/exchange.test.ts`
