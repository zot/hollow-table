# Game
**Requirements:** R126, R128, R129, R170

The open game in memory: every record by rid, and the one door every change goes through. It knows
what changed since the last save, so saving and sending never diff the whole table.

## Knows
- records: rid → record (crc-Records.md).
- listeners: who hears about changes (views, the store's write-through, the network). Each keeps
  its own set of rids still to handle, so the store and the network never wait on each other.

## Does
- get(rid), all(kind?): read.
- change(fn): the only way to mutate. `fn` receives a writer with `put(rid, record)` and `del(rid)`
  (a rid, since the singletons have no oid); each put is checked (`Records.check`) and refused
  whole if it fails, and nothing is applied until `fn` returns. Then listeners hear the set of
  changed rids once, so a burial (a delete and a Boot Hill change) is one event. A put equal to
  what is there changes nothing.
- load(records): replace everything (open a game, restore a checkpoint, a full table arriving);
  listeners hear every rid, old and new.
- listen(fn): fn hears each change's rids; returns a function that stops it.
- Seat-tier state never enters here; it lives in Seat.

## Collaborators
- Records: check.
- GameStore: saves what changed.
- Seat: never touched by change().

## Sequences
- seq-save.md
