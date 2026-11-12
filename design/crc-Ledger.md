# Ledger
**Requirements:** R132, R141, R291, R292

The green cloth-bound book beside Boot Hill, opening to a ruled ledger page.

## Does
- page(): the game's name (editable), the save status, the actions written on the page
  (Checkpoint, Export, Import, New game), the checkpoints and the games as ruled entries.
- player: shows only the name, the save status and Export, and says the GM's page holds the game
  and this browser keeps a copy.
- book (R291): green cloth with "Ledger" up the spine, between the register and Boot Hill; a press
  anywhere else closes it. Status words from GameStore ("Saved hh:mm:ss", "Not saved: …"), and
  "Not a game file: …" from Exchange. Checkpoint asks a name, offering "Round N, hh:mm:ss" (blank is
  "Checkpoint"); automatic checkpoints in grey; New game, unasked, "New game <date and time>"; the
  current game greyed.
- restore (R292): unasked, undoable; Export's file named after the game, punctuation as dashes.

## Collaborators
- GameStore, Exchange

## Sequences
- seq-restore.md
