# BootHillView
**Requirements:** R118, R120, R121, R122, R125, R289, R290

The gravestone and its graveyard list.

## Does
- badge: the count of the buried in every graveyard; the grey Sancreek stone fades when it's 0 (R289).
- names (R290): a burial is named after its pool (or "Nameless"), "Note: " or "Writing: " and the first
  line (28 characters), a receipt's title, "Tape: N rolls, last <title>".
- panel: opens as the graveyard list below the gravestone: ‹, the editable name, › fixed at the
  top; the burials scroll, oldest first; "Nothing is buried here." when empty; a press anywhere
  else closes it (R289).
- drag a burial out: Drag.exhume, at the press, under the pointer; the list closes (R290).
- doom: shift-click (or long press) arms an item or the graveyard's name red, saying "Delete
  forever? Shift-click again", reverting after 3 s; a second one deletes (Yards.forget).

## Collaborators
- Yards, Drag, Seat (which graveyard, open or not), Gesture

## Sequences
- none
