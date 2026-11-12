# Games and your seat

Bill: *"It's important to keep state in local storage and support import/export for games… we at
least need a write-thru DB with checkpointing capability."*

## Two tiers of state

Every piece of state says which tier it's in.

- **The game** is shared: it is saved, checkpointed, exported, and sent to the table.
- **Your seat** belongs to you: when you refresh or restart, everything is just like it was, but it
  is never checkpointed, exported or sent. It holds the view (pan and zoom), the docked roll row
  (action, opponent and Defend, White row, hand adjustments, dice), "You are" (GM only), the tape
  rolled up or down, which graveyard you're browsing and whether the list is open, open used piles,
  and expanded piles. Seats are kept per game *and per viewer*.
- Rule of thumb: anything a click does *for looking* belongs to the seat. Peeking must not reorder
  anyone else's table.

## Saving

- **Write-through:** every change to the game is saved shortly after it's made (a 400 ms pause),
  only what differs from what's stored. A reload shows the same table.
- Saved state lives in the browser's database, per origin. It holds images too, by content hash, so
  photos don't run out of room.

## Games

- The browser holds **a list of games, each with its own table and its own name.** The game last
  open opens on load; the first visit makes one from the playtest scene.
- **The Ledger**, a green cloth-bound book beside Boot Hill, holds: the game's name (editable), the
  save status, Checkpoint, Export, Import, New game, the checkpoint list, and the game list (click to
  open). It opens as a **ledger page**, ruled with columns: games and checkpoints are entries written
  in the book, and its actions are written on the page, not set out as web buttons.
- **New game** starts an empty table beside the others.
- **How the Ledger looks and reads** (Bill, 11-12, as the mockup): a green cloth-bound book with
  "Ledger" up its spine, between the register and Boot Hill; a press anywhere else closes it. The
  save status reads "Saved 14:03:22", "Not saved: " and why, or "Not a game file: " and the file's
  name. Checkpoint asks for a name, offering "Round 3, 14:03:22" (blank is "Checkpoint"). Automatic
  checkpoints are written in grey. New game asks nothing and is named "New game Nov 12, 14:03:22".
  Export names the file after the game, punctuation turned to dashes
  (`The-11-08-playtest.glimmer.json`). The current game is greyed in the list. A player's Ledger
  says the GM's page holds the game and this browser keeps a copy.

## Checkpoints

- A checkpoint is a named copy of the whole game. Click one to restore it.
- **Restoring checkpoints the current table first**, so a restore can be undone: it asks nothing.
  That checkpoint is "Before restoring “X”", or "Before undoing “X”" when X was itself one, so
  the names never nest. A restore keeps
  your seat; whatever has vanished is skipped.
- **End makes one automatically** ("End of conflict, round 2"). Automatic checkpoints keep the newest
  20; named ones are kept.

## Export and import

- **Export** is one readable `.glimmer.json` file: the game, its checkpoints, and each image once.
- **Import always makes a new game** and never overwrites one ("(imported)" is added to a name that
  is already taken).

## A player's copy

- A player's page keeps its copy of the table in its own database, per room, so a reload shows the
  table at once. Its Ledger hides Checkpoint, Import, New game and the game list: the GM checkpoints
  and restores. The copy never becomes the browser's own game.

## Not yet

- Deleting a game or a checkpoint; storage-quota handling.
