# GameStore
**Requirements:** R129, R130, R131, R133, R134, R135, R137, R140, R141

The browser's games: the list, each game's records, checkpoints, and the write-through that keeps
them current. Talks to the database only through Db.

## Knows
- Db stores: `games` (id → {name, made, opened, copyOf?}), `records` ([game, rid] → record),
  `checkpoints` ([game, id] → {name, at, auto, records}), `blobs` (BlobStore's).
- last: the id of the game last open (localStorage), never a player's copy.
- SAVE_PAUSE: 400 ms.
- The playtest scene (`src/store/playtest.ts`): the 11-08 playtest of *A Ghoulish Problem* as
  records, Sam, Beauford and Devreux with Devreux's Influences, a chip, the sticky and the reference
  card, plus the singletons. The first visit makes "The 11-08 playtest" from it (R131).
- The clock, timers and localStorage are passed in, so a test runs on a fake clock and memory.

## Does
- list(): the browser's own games, newest opened first; copies are left out.
- start(): opens the last game, or the newest, or on a first visit makes the playtest game.
- open(id) / add(name, records?, checkpoints?) / rename(name): add stores a game without opening
  it (New game, an import); opening saves the game that was open first.
- read(id): a game as stored, with its checkpoints, for Exchange.
- copyFor(room): a player's copy (game id `m-<room>`), never listed, never `last`.
- writeThrough(game): listens to Game, keeping its own pending rids; SAVE_PAUSE after the last
  change, writes the pending records that differ from what's stored and deletes the ones that
  vanished, in one transaction. save() does it at once (before a checkpoint, an export, closing).
- checkpoint(name, auto): a copy of every record. Automatic ones keep the newest 20; named ones are
  kept. End's is automatic, named by Register ("End of conflict, round 2").
- checkpoints(): the open game's, newest first, for the Ledger.
- restore(id): checkpoints the current table first ("Before restoring “…”", automatic), then loads
  the checkpoint into Game. The book (claims, the table's version gv, tombstones) is not taken
  back: the current one is kept.
- status(): "Saved 18:36:31" or "Saving…", for the Ledger.

## Collaborators
- Db: the database (IndexedDB on the page, memory in tests).
- Game: what to save, and what a restore loads.
- BlobStore: images.

## Sequences
- seq-save.md
- seq-restore.md
