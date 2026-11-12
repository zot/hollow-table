# Register
**Requirements:** R99, R112, R115, R116, R117, R284

The cash register: the Round, and End.

## Does
- Pure (`src/ui/register.ts`): stepped(meta, ±1), the Round within 0 to 99 (R284); ended(game), End's
  one change (R117, R99).
- The view (RegisterView): in the bar at its right end, the oak case, the glass window with the Round
  on its tab, ▲ ▼ and End (keys only on the GM's page, whose Round is the table's), the paper roll
  rolling the tape up and down (Tape.toggleUp, R112); the tape hangs under its left edge (R282).
- round: shown as a pop-up tab in the glass; ▲ ▼ change it (meta.round), from 0 to 99; a change
  drops the tab and brings it back up with the new number (R284).
- end(): the first press raises the orange "End conflict?" tab for 3 s; a second press within them
  ends the Conflict, in one Game.change after a checkpoint: Round to 0, Biases, Afflictions and
  Injuries recharged (Tap.recharge), used piles emptied (plain cards home, tapped cards gone), used marks
  cleared, CRIT! Influences cleared wherever they are.

## Collaborators
- Game, GameStore (the checkpoint), Tap, Tape

## Sequences
- none
