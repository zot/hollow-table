# BootHillView
**Requirements:** R118, R120, R121, R123, R124, R125, R289, R295, R404, R405, R428, R457

The gravestone and its graveyard list.

## Does
- Doom (`src/ui/doom.ts`, R125, R457): arming something to delete forever, shared with the Ledger: the
  first shift-click turns it red and says so, reverting after 3 s; a second within that time deletes.
- R428: an Opinion Record's burial comes up as a record: put back, its Connection written to its cell,
  slid out under a card of its row; undoCard digs up the newest Info card or record. A record whose
  row is gone stays buried.
- badge: the count of the buried in every graveyard; the grey Sancreek stone fades when it's 0 (R289).
- stone (`src/ui/boothill.ts`): a button after the register; a click opens or closes the list, kept
  in the Seat with the graveyard browsed. Burials are listed by the names Yards.graveName gave them.
- panel: opens as the graveyard list below the gravestone: ‹, the editable name, › fixed at the
  top; the burials scroll, oldest first; "Nothing is buried here." when empty; a press anywhere
  else closes it (R289). ‹ and › browse (Yards.prev, Yards.next); typing names the graveyard, and
  leaving the name (change) applies Yards.rename, so an erased, empty one goes (R124).
- dig up (R120, R295): once a burial is dragged a few pixels (Gesture), Yards.exhume and
  Yards.raised put it back on top, under the pointer, in one change; the list closes and Drag carries it from where it came up (not from the press in the list) (a character by its pool), so dropped
  on the bar it is buried again. An Info card's burial (R405) comes up on its NPC instead
  (Yards.withInfo, slid out by the Seat), with no carry; while its NPC is not on the table it stays.
- undoCard() (R404, R428): digs up Yards.lastCard the same way, an Info card or a record; false when there is none, so the GM's
  Ctrl+Z / ⌘Z (main, only outside written text: isPageUndo) falls through to the page.
- doom (R125): a shift-click or a long press arms an item red, saying "Delete forever? Shift-click again"; the
  graveyard's name (shift-click or long press) says "Delete everything here? Shift-click again".
  Either reverts after 3 s; a second one deletes (Yards.forget, Yards.forgetAll).

## Collaborators
- Yards, Drag, Seat (which graveyard, open or not), Gesture, TableView (screen to table)

## Sequences
- none
