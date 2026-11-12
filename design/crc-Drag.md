# Drag
**Requirements:** R19, R21, R30, R34, R35, R48, R83, R113, R120, R215-217, R220-226

Lifting, carrying and dropping, and deciding what a drop means.

## Knows
- held: the piece (or supply, glyph, Base, tape, burial) in hand, its grab offset.
- NEAR_PX: how close to a pool a carried chip or card must come for the pool to widen.

## Does
- start(rid, press, move): lifts a piece, with what's pinned to it if it's a card: a lift shadow;
  Moves.hold; Moves.drag while carrying; Moves.drop and Moves.release at the drop. Lifting leaves
  any writing and clears the text selection (R223). (Prototype 9.4.1
  moves paper and pins it; the other drop targets below land with their views.)
- carry(pointer): sets where it is headed (Gesture.paced); the next frame moves it; widens the pool it comes near (only that one); shows "→ graveyard" over
  the bar; marks a would-be opponent while aiming.
- drop(pointer): resolves the target, in this order, then one Game.change:
  - a tap glyph or resource-made card on a resource-made card: Tap.feed (merge);
  - a chip or Influence card on a slot: into the slot (Pool.rollUp applied);
  - an Influence card on a drawer: home there (another character's drawer moves it);
  - anything on the bar: put away (bury, vanish, or go home, by kind);
  - a sticky, text or image on a card: pinned, its offset from the card kept; dropped off one,
    unpinned; a card carries what's pinned to it;
  - an Influence card anywhere else: home (a tap may stay loose);
  - the Base on a character: aim (RollRow);
  - otherwise: placed where dropped.
- supplies: dragging a supply makes its piece under the pointer; a new character pops its pool out
  above the card, or the card slides below the bar if there's no room.
- tear: dragging the tape tears off the whole roll as a torn-roll piece.
- exhume: dragging a name out of Boot Hill brings its records back under the pointer.

- startPool(rid): by its name, a pool carries its gathered card along.
- startItem(rid) (R220, R224): the chip or card itself is lifted (TableView.lift): taken out of its
  slot, drawer, pile or the table into the table's world layer, where the zoom applies to it as to
  everything else, and held there until let go. A card in card form becomes a chip in hand, centred
  on the pointer; a chip keeps the spot it was pressed. The pool it comes near widens.
- startGlyph(source) (R225): the tap is made as the drag starts (Tap.tap, the Level spent), lifted
  like any loose card with its glyph under the pointer, and stays a card in hand. Dropped on a
  resource-made card it merges into it (its Level back to its source and fed into that card).
- target (R222): while carrying, each frame lights the place the drop would land (`over`): the slot,
  the drawer, the kill box, the resource-made card a tap merges into, or for paper the card it
  would pin to. Over the bar, toss or bury lands with the bar (9.4.5).
- cursor (R221): carrying a chip, card or tap puts the pointing hand on the whole page (`tapping`).
- grip (R216): the press's offset from the piece's corner, kept in world coordinates; each frame
  places the piece at `toWorld(pointer) - grip`, so it stays glued at any zoom with nothing to
  scale. A chip from card form is gripped at its centre; a tap at its glyph's centre.
- land (R217, R226): a drop is one Game change made inside TableView.still, so the piece is drawn
  where it was let go with no glide.
- A card dragged alone leaves its pool from where it was drawn and is ungathered.

## Collaborators
- Game, Moves, Pool, Tap, Yards, PoolView, TableView, RollRow, Gesture

## Sequences
- seq-drag.md
