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
**Alarm:** 1
**Fire alarm:** Keep the file's name when it is taken: the import is named `The 11-08 playtest`, a second game of that name
**Inject:** src/store/exchange.ts:importGame
**Pulled:** 2026-11-12 — rang: the import was named `The 11-08 playtest`, not `The 11-08 playtest (imported)`

## Test: a bad file is refused whole
**Purpose:** nothing half-imports
**Input:** a file with one record failing check; one with an image whose bytes don't match its hash
**Expected:** both refused; no game created
**Refs:** crc-Exchange.md
**Code:** `src/store/exchange.test.ts`
**Alarm:** 2
**Fire alarm:** Skip the hash check on an image: the file with the wrong bytes imports and a game is created
**Inject:** src/store/exchange.ts:importGame
**Pulled:** 2026-11-12 — rang: the file with the wrong image bytes imported (`Missing expected rejection (BadFile)`)
