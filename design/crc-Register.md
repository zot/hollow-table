# Register
**Requirements:** R99, R112, R115-117, R262, R284, R338, R344, R454, R492

The cash register: the Round, and End.

## Does
- End (R454): ends the conflict whether or not its checkpoint is kept.
- Pure (`src/ui/register.ts`): stepped(meta, ±1), the Round within 0 to 99 (R284); ended(game), End's
  one change (R117, R99), each character's Mild slots emptied by Absorb.mildEnds (R338),
  and every tapped card not already gone through Tap.mildGone (R344); ended(game, true), a scene's end
  (R492): the same, and every character's Motivations recharged (Tap.rechargeMotives, R262).
- The view (RegisterView): in the bar at its right end, the oak case, the glass window with the Round
  on its tab, ▲ ▼ and End (keys only on the GM's page, whose Round is the table's), the paper roll
  rolling the tape up and down (Tape.toggleUp, R112); the tape hangs under its left edge (R282).
- round: shown as a pop-up tab in the glass; ▲ ▼ change it (meta.round), from 0 to 99; a change
  drops the tab and brings it back up with the new number (R284).
- end(): the first press raises the orange "End conflict?" tab for 3 s; a second press within them
  ends the Conflict, in one Game.change after a checkpoint: Round to 0, Biases, Afflictions and
  Injuries recharged (Tap.recharge), used piles emptied (plain cards home, tapped cards gone), used marks
  cleared, CRIT! Influences cleared wherever they are. With the Round at 0 (R492) the tab says "End
  scene?" and the second press ends the scene (ended(game, true)) after a checkpoint named "End of
  scene".

## Collaborators
- Game, GameStore (the checkpoint), Tap (recharge, Motivations at a scene's end, and cards tapped from Mild at End), Absorb (Mild slots at End), Tape

## Sequences
- none
