# Drag
**Requirements:** R19, R21, R34, R35, R48, R83, R113, R120, R215-217, R220-223, R225, R226, R240, R243, R244, R251, R211, R260

Lifting, carrying and dropping, and deciding what a drop means.

## Knows
- held: the piece (or supply, glyph, Base, tape, burial) in hand, its grab offset.

## Does
- start(rid, press, move): lifts a piece, with what's pinned to it if it's a card: a lift shadow;
  Moves.hold; Moves.drag while carrying; Moves.drop and Moves.release at the drop. Lifting leaves
  any writing and clears the text selection (R223). (Prototype 9.4.1
  moves paper and pins it; the other drop targets below land with their views.)
- carry(pointer): sets where it is headed (Gesture.paced); the next frame moves it; over a pool's
  slots, opens the strip under it (PoolView.reach, R244), remembering the slot it came from; shows "→ graveyard" over
  the bar; marks a would-be opponent while aiming.
- drop(pointer): resolves the target, in this order, then one Game.change:
  - a tap glyph or resource-made card on a resource-made card: Tap.feed (merge);
  - a chip or Influence card on a slot: into the slot (Pool.rollUp applied); a card the slot
    refuses (Pool.accepts: a Damage card outside its kind, a Motivation's outside Main) goes home
    to its drawer instead (R211, R260);
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

- startPool(rid): from its name, frame or drawer (R251), a pool carries its card (and what is pinned
  to it) by the same offset, gathered or not; the drop saves both places.
- startItem(rid) (R220, R243): the chip or card itself is lifted (TableView.lift): taken out of its
  slot, drawer, pile or the table into the table's world layer, where the zoom applies to it as to
  everything else, and held there until let go. It keeps the spot it was pressed; a card stays a
  card in hand, and while the pointer is over a pool's slots it is drawn as a chip centred on the
  pointer, then as the card again with its grip when it leaves them.
- startGlyph(source) (R225): the tap is made as the drag starts (Tap.tap, the Level spent), lifted
  like any loose card with its glyph under the pointer, and stays a card in hand. Dropped on a
  resource-made card it merges into it (its Level back to its source and fed into that card).
- drawer gap (R240): over a drawer, each frame works out where among its cards the card would go
  (insertAt over the cards' rects, reading order) and has PoolView open the gap there; the drop
  puts it there (toDrawer with that index).
- target (R222): while carrying, each frame lights the place the drop would land (`over`): the slot,
  the drawer, the kill box, the resource-made card a tap merges into, or for paper the card it
  would pin to. Over the bar, toss or bury lands with the bar (9.4.5).
- cursor (R221): carrying a chip, card or tap puts the pointing hand on the whole page (`tapping`).
- grip (R216): the press's offset from the piece's corner, kept in world coordinates; each frame
  places the piece at `toWorld(pointer) - grip`, so it stays glued at any zoom with nothing to
  scale. Drawn as a chip over the slots, it is gripped at its centre; a tap at its glyph's
  centre.
- land (R217, R226): a drop is one Game change made inside TableView.still, so the piece is drawn
  where it was let go with no glide.
- A card dragged alone leaves its pool from where it was drawn and is ungathered.

## Collaborators
- Game, Moves, Pool, Tap, Yards, PoolView, TableView, RollRow, Gesture

## Sequences
- seq-drag.md
