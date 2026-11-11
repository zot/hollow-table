# Moves
**Requirements:** R178, R179, R182, R183

Drags go straight to the room, without passing through the GM's page; the GM's saved records settle
where things end up.

## Knows
- SEND_MS: 100 ms between sends of a piece in hand.
- filling, draining: the move actor's double buffer.

## Does
- send(items): `{s, items: [{rid, part?, x, y, z}]}` at most every SEND_MS while in hand; the drop
  is a move too, with its own number, and what the drop changed beyond places goes out right after
  it as a change (Game.change).
- receive(move): appended to `filling`; starts the actor if none is running.
- pass(): swaps the buffers and runs through the drained one **newest arrival first**. The first
  command to reach a piece places it; a later (older-arrived) one changes it only if it is from the
  same page with a higher number. Then, if `filling` has more, schedules the next pass on the next
  animation frame or a 100 ms timer, whichever comes first (a hidden tab gets no frames).
- hold(rid): a piece in your hand or being written in takes nothing until you let go, then is
  checked again.

## Collaborators
- Stamps: numbers and freshness.
- Game: the places, through change.

## Sequences
- seq-move.md
