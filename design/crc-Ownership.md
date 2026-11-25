# Ownership
**Requirements:** R142, R144, R146-149, R567, R579, R581, R582

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
- handOver(paper, who) (R579, R581): the note handed over: `by` is who, who leaves `to`, everyone stays
  everyone, and a "just me" note (`mine`, or the GM's `to: []`) becomes `handed`.
- takeHanded(all, self) (R581): the `handed` notes `self` owns, each as its own "just me": a player's
  under `m:` as `mine`, the GM's as `to: []`, with the table key it leaves. The page puts them in one
  change as they arrive (main), the GM's page as the GM whoever it is viewed as.
- handsOver(was, paper, who) (R582): whether a player's paper change is a hand-over: by its owner and
  exactly handOver of it, or, with no copy on the GM's page, a `handed` note for someone else.
  Authority takes it though the giver can't read the result. reread(a, b): whether readers differ.

## Collaborators
- Visibility: who the viewer is.

## Sequences
- none
