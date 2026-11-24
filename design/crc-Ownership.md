# Ownership
**Requirements:** R142, R144, R146-149, R567

What clicking or shift-clicking a character's die does to its owner. Pure: returns the new owner, or
nothing, with the reason when it's a refusal.

## Does
- click(viewer, character): your own or (for the GM) anyone's: dock the roll row, no change of
  owner. Open: claim it (the GM claims for the GM). Another player's, for a player: nothing.
- shiftClick(viewer, character): your own, or any for the GM: open it. Otherwise nothing.
- mayChange(viewer, before, after): the check the GM's page applies to a player's change: a
  character and its card belong to their owner, or to anyone while open, and a player can't hand a
  character to someone else.
- mayWrite(viewer, c) (R567): whether this viewer writes the character's card and name: the GM always;
  its owner, unless it is open.

## Collaborators
- Visibility: who the viewer is.

## Sequences
- none
