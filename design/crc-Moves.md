# Moves
**Requirements:** R298, R299, R300, R182, R183, R218

Drags go straight to the room, without passing through the GM's page. A move is only shown (Hands);
nothing saved changes until the drop's change.

## Knows
- SEND_MS: 100 ms between sends of a piece in hand.
- filling, draining: the move actor's double buffer.

## Does
- drag(items): `{s, items: [{rid, part?, x, y, z, aim?}]}` at most every SEND_MS while in hand: the
  piece held (what follows it, each page works out), and its aim (R299).
- drop(items): the drop is a move too, `drop: true`, sent at once with its own number and no aim;
  the drop's change goes out right after it (Game.change, R300).
- receive(from, move): appended to `filling`; starts the actor if none is running.
- pass(): swaps the buffers and runs through the drained one **newest arrival first**. The first
  command to reach a piece places it; a later (older-arrived) one changes it only if it is from the
  same page with a higher number. The winners go to `place` (Hands.show, or Hands.drop for a
  drop; on the GM's page only what Authority.mayMove allows). Then, if `filling` has more, schedules the next pass on the next animation frame or
  a 100 ms timer, whichever comes first (a hidden tab gets no frames); the scheduler is passed in.
- hold(rid) / release(rid): a piece in your hand or being written in takes nothing until you let
  go; then what waited for it is checked again, as if just arrived. Only the most recent move
  waits, by the pass's rule (the newest arrival, or the same page's higher number), never the moves
  in between (R218).

## Collaborators
- Stamps: numbers and freshness.
- Hands: shows what the winners say.

## Sequences
- seq-move.md
