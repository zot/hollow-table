# GameStore
**Requirements:** R129, R130, R131, R133, R134, R135, R137, R483, R141, R291, R292, R418, R454, R455, R457, R485, R459, R487

The browser's games: the list, each game's records, checkpoints, and the write-through that keeps
them current. Talks to the database only through Db.

## Knows
- Db stores: `games` (id → {name, made, opened, copyOf?, as?}), `records` ([game, rid] → record),
  `checkpoints` ([game, id] → {name, at, auto, records}), `blobs` (BlobStore's).
- last: the id of the game last open (localStorage), never a player's copy.
- SAVE_PAUSE: 400 ms.
- The playtest scene (`src/store/playtest.ts`): the 11-08 playtest of *A Ghoulish Problem* as
  records, Sam, Beauford and Devreux with Devreux's Influences (each tapped in full from her
  Motivation of that name, which reads `(0)`, R463, R261), a chip, the sticky and the reference
  card, the Connection Table put away with *Connections in Unton* (Connections seed, R418), plus the
  singletons. The first visit makes "The 11-08 playtest" from it (R131).
- The clock, timers and localStorage are passed in, so a test runs on a fake clock and memory.

## Does
- forget(id) (R457): deletes a game or a copy with its records and checkpoints; refuses the open one.
  forgetCheckpoint(id): deletes one of the open game's checkpoints. joined() (R485): the copies of
  tables joined, newest opened first. images() (R459): every image hash any game, copy or checkpoint
  in this browser uses, and the table as it stands.
- checkpoint (R454): a refused one is said by status() ("Checkpoint “name” not kept:" and why) until one
  is kept, and rethrown. (R455) After its first good save, asks `keep` (the page's
  navigator.storage.persist) once; kept() is its answer, null before.
- list(): the browser's own games, newest opened first; copies are left out.
- start(): opens the last game, or the newest, or on a first visit makes the playtest game.
- open(id) / add(name, records?, checkpoints?) / rename(name): add stores a game without opening
  it (New game, an import); opening saves the game that was open first.
- read(id): a game as stored, with its checkpoints, for Exchange.
- copyFor(room, id, own, as) (R483): a player's copy per room and name, never listed, never `last`: game id
  `m-<room>` for the name keeping the browser's key (`own`, so the copy kept before names had their own
  stays with it), `m-<room>.<id>` for any other, the name's user id, which a rename keeps. `as`, the name
  it was joined as, is set on each open, so a rename shows (R485).
- writeThrough(game): listens to Game, keeping its own pending rids; SAVE_PAUSE after the last
  change, writes the pending records that differ from what's stored and deletes the ones that
  vanished, in one transaction. save() does it at once (before a checkpoint, an export, closing).
- checkpoint(name, auto): a copy of every record. Automatic ones keep the newest 20; named ones are
  kept. End's is automatic, named by Register ("End of conflict, round 2").
- checkpoints(): the open game's, newest first, for the Ledger.
- restore(id): checkpoints the current table first (automatic, named by beforeRestoring), then loads
  the checkpoint into Game. The book (claims, the table's version gv, tombstones) is not taken
  back: the current one is kept. Torn rolls shared before are made this page's own first
  (Yards.ownedTorn, R487).
- beforeRestoring(name) (R292): "Before restoring “X”", or "Before undoing “X”" when X was itself
  one, so the names never nest.
- status() (R291): "Saving…", "Not saved: " and why the last save failed, or "Saved 18:36:31", for
  the Ledger. A failed save keeps its records pending, so the next change tries them again.

## Collaborators
- Db: the database (IndexedDB on the page, memory in tests).
- Game: what to save, and what a restore loads.
- BlobStore: images.

## Sequences
- seq-save.md
- seq-restore.md
