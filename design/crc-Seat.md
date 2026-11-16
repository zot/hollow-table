# Seat
**Requirements:** R127, R128, R136, R271, R364

Your seat at the table: everything about how you're looking, kept per game and per viewer, never
checkpointed, exported or sent.

## Knows
- Kept in localStorage under `hollow.seat.<game>.<viewer>`.
- view: pan and zoom, or null until the table has been fitted once (a first visit, R271).
- The roll row is not the seat's: it is the game's `rows` (R381).
- viewAs: who the GM is viewing as.
- tape: rolled up or down.
- boothill: the graveyard browsed, and whether the list is open.
- open: open used piles, open piles, opened narrow slots and card columns.

## Does
- types (R364): the roll type this viewer last chose for each action on each card (`<oid>:<label>` → type), so the next roll of it starts there.
- load(storage, game, viewer) / save(storage, game, viewer, seat): every read and write wrapped so
  a blocked or empty storage still gives a working seat.
- prune(seat, exists, yards): after a restore, drop what refers to records that no longer exist (`exists(rid)`):
  a docked roller whose pool vanished, a vanished opponent, open piles, slots and columns of
  vanished pieces; the graveyard browsed is kept within the yards.

## Collaborators
- Game: to prune against.

## Sequences
- seq-restore.md
