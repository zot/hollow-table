# Seat
**Requirements:** R127, R128, R136

Your seat at the table: everything about how you're looking, kept per game and per viewer, never
checkpointed, exported or sent.

## Knows
- Kept in localStorage under `hollow.seat.<game>.<viewer>`.
- view: pan and zoom.
- roller: the docked roll row (pool, action, opponent and Defend kind, White row and whether picked
  by hand, hand adjustments, dice).
- viewAs: who the GM is viewing as.
- tape: rolled up or down.
- boothill: the graveyard browsed, and whether the list is open.
- open: open used piles, open piles, opened narrow slots and card columns.

## Does
- load(game, viewer) / save(): every read and write wrapped so a blocked or empty storage still
  gives a working seat.
- prune(game): after a restore, drop what refers to records that no longer exist.

## Collaborators
- Game: to prune against.

## Sequences
- seq-restore.md
