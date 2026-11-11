# Game
**Requirements:** R126, R128, R129, R170

The open game in memory: every record by rid, and the one door every change goes through. It knows
what changed since the last save, so saving and sending never diff the whole table.

## Knows
- records: rid → record (crc-Records.md).
- dirty: rids changed (put or deleted) since the last flush.
- listeners: who hears about changes (views, the store's write-through, the network).

## Does
- get(rid), all(kind?): read.
- change(fn): the only way to mutate. `fn` receives a writer with `put(record)` and `del(rid)`;
  each is checked (`Records.check`), applied, and its rid marked dirty. After `fn` returns, listeners
  hear the set of changed rids once, so a burial (a delete and a Boot Hill change) is one event.
- load(records): replace everything (open a game, restore a checkpoint, a full table arriving),
  marking every rid dirty.
- flush(): hand over and clear the dirty set (the write-through and the network each take it).
- Seat-tier state never enters here; it lives in Seat.

## Collaborators
- Records: check.
- GameStore: saves what changed.
- Seat: never touched by change().

## Sequences
- seq-save.md
