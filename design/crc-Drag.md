# Drag
**Requirements:** R19, R21, R30, R34, R35, R48, R83, R113, R120

Lifting, carrying and dropping, and deciding what a drop means.

## Knows
- held: the piece (or supply, glyph, Base, tape, burial) in hand, its grab offset.
- NEAR_PX: how close to a pool a carried chip or card must come for the pool to widen.

## Does
- lift(thing, pointer): a lift shadow; Moves.hold; for a piece on the table, Moves.send while
  carrying.
- carry(pointer): moves it; widens the pool it comes near (only that one); shows "→ graveyard" over
  the bar; marks a would-be opponent while aiming.
- drop(pointer): resolves the target, in this order, then one Game.change:
  - a tap glyph or resource-made card on a resource-made card: Tap.feed (merge);
  - a chip or Influence card on a slot: into the slot (Pool.rollUp applied);
  - an Influence card on a drawer: home there (another character's drawer moves it);
  - anything on the bar: put away (bury, vanish, or go home, by kind);
  - a sticky, text or image on a card: pinned;
  - an Influence card anywhere else: home (a tap may stay loose);
  - the Base on a character: aim (RollRow);
  - otherwise: placed where dropped.
- supplies: dragging a supply makes its piece under the pointer; a new character pops its pool out
  above the card, or the card slides below the bar if there's no room.
- tear: dragging the tape tears off the whole roll as a torn-roll piece.
- exhume: dragging a name out of Boot Hill brings its records back under the pointer.

## Collaborators
- Game, Moves, Pool, Tap, Yards, PoolView, TableView, RollRow, Gesture

## Sequences
- seq-drag.md
