# Ask
**Requirements:** R601

The table's question card (`specs/table.md`, *Feel*): what the browser's `prompt()` and `confirm()` did,
asked on a small card laid in the middle of the table, so a browser without dialogs (the Claude Desktop
browser has none) still names a player, renames, names a checkpoint and hands a name over.

## Knows
- the card: one at a time, appended to the body over a dimming veil, the question, then a text line
  (for `ask`) or nothing (for `askYes`), then Cancel and OK (No and Yes).

## Does
- ask(doc, question, value?): a promise of the line written, trimmed by no one (the caller's rules
  apply: `gmName`, `arrivalName`, `named`), or null on Cancel or Escape; Enter answers; the line is
  focused with `value` selected.
- askYes(doc, question): a promise of true on Yes or Enter, false on No or Escape.
- Either takes the card away when answered. A second question while one is open waits behind it.
- While it is open, a press on the card and every key are the card's: the window hears them first (in
  the capture phase, before the page's own listeners on the document), so a panel that closes on a
  press elsewhere (the Ledger asking a checkpoint's name) stays open, and a carry's Escape or the GM's
  undo doesn't act on what the card answers.

## Collaborators
- FolksView (the renames, the hand-over), main.ts (the name on arrival, the GM's rename), LedgerView
  (a checkpoint's name).
