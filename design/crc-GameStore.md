# GameStore
**Requirements:** R129, R130, R131, R133, R134, R135, R137, R140, R141

The browser's games: the list, each game's records, checkpoints, and the write-through that keeps
them current. Talks to the database only through Db.

## Knows
- Db stores: `games` (id → {name, made, opened, copyOf?}), `records` ([game, rid] → record),
  `checkpoints` ([game, id] → {name, at, auto, records}), `blobs` (BlobStore's).
- last: the id of the game last open (localStorage), never a player's copy.
- SAVE_PAUSE: 400 ms.

## Does
- list(): the browser's own games, newest opened first; copies are left out.
- open(id) / create(name, records?) / rename(id, name): the first visit creates one from the
  playtest scene.
- copyFor(room): a player's copy (game id `m-<room>`), never listed, never `last`.
- writeThrough(game): on Game changes, waits SAVE_PAUSE after the last one, then writes the dirty
  records that differ from what's stored and deletes the ones that vanished, in one transaction.
- checkpoint(name, auto): a copy of every record. Automatic ones keep the newest 20; named ones are
  kept.
- restore(id): checkpoints the current table first ("Before restoring …"), then loads the
  checkpoint into Game. The table's version (book.gv) is not taken back.
- status(): "Saved 18:36:31" or "Saving…", for the Ledger.

## Collaborators
- Db: the database (IndexedDB on the page, memory in tests).
- Game: what to save, and what a restore loads.
- BlobStore: images.

## Sequences
- seq-save.md
- seq-restore.md
