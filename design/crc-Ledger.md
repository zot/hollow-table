# Ledger
**Requirements:** R132, R133, R134, R139, R141, R291

The green cloth-bound book between the register and Boot Hill, opening to a ruled ledger page.

## Does
- book (R291, `src/ui/ledger.ts`): green cloth with "Ledger" up the spine, after the register and
  before Boot Hill; a click opens or closes the page, a press anywhere else closes it.
- page (R132): ruled, with a red margin rule: the game's name (editable; a blank one is not taken),
  the actions written on the page (Checkpoint, Export, Import, New game), the save status, then the
  checkpoints and the games as entries on the rules, their dates in the right-hand column.
- status (R291): GameStore.status() ("Saving…", "Not saved: …", "Saved hh:mm:ss"), every second
  while open; "Not a game file: " and the file's name when an import is refused.
- words (pure): stamp(at) "Nov 12, 14:03:22"; offer(round, now) "Round N, hh:mm:ss", what Checkpoint
  offers; named(answer): blank is "Checkpoint", cancel makes none; newGame(now) "New game <stamp>".
- checkpoints (R134): newest first, automatic ones in grey; clicking one restores it, unasked (the
  page keeps the seat, pruned of whatever vanished, R136).
- games: the current one greyed; clicking another saves this one and reloads onto it. New game
  (R133) and Import (R139) make the game and reload onto it.
- player (R141): only the name (read-only), Export and the status, and a note that the GM's page
  holds the game and this browser keeps a copy.

## Collaborators
- GameStore, Exchange, Seat (pruned after a restore), Gesture

## Sequences
- seq-restore.md
