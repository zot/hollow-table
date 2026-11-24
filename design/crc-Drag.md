# Drag
**Requirements:** R19, R21, R34, R35, R48, R83, R113, R119, R120, R122, R211, R215-217, R220-223, R225, R226, R240, R243, R244, R251, R273, R288, R298-300, R409, R451, R463, R482, R488, R500, R513, R519-523, R532, R536, R538-541, R543, R555, R562, R569, R571

Lifting, carrying and dropping, and deciding what a drop means.

## Knows
- held: the piece (or supply, glyph, Base, tape, burial) in hand, its grab offset.

## Does
- over the bar (R288): while anything is carried over it the bar is `toss`, and `bury` with "→" and the
  current graveyard's name when letting go would bury; letting go there puts away (putAway; Yards.putAway splits what it buries: torn rolls and
  `mine` paper, a character's pinned `mine` paper included, are buried each alone in this page's Hill
  under the current graveyard's name, Yards.buryOwn, R488, R500, and Boot Hill gets no burial when
  nothing of it is the table's): a
  fresh supply is never made (R19), the reference card vanishes, the Connection Table is put away
  (`away`, kept for its supply, and no "→", R409), anything else is buried in the
  current graveyard with the table's share of burialOf's records under graveName (R119, R122, R290). Chips and cards go
  by their own bar target (vanish, or home).
- carrying a card lifts its pinned pieces with it; they stay drawn over it (`pinned` and `lifted`, R273).
- carry (R298, R299, R300): the one way anything is carried: paper, a card, a pool, a chip or an
  Influence card. Each kind gives only where the piece goes for the pointer, its aim, whether the
  bar would bury it, and what its drop changes. The carry leaves any writing and clears the text
  selection (R223; and again on each frame and at the release whenever the browser has put the focus
  back in writing, R451, as WebKit's selection does), lifts the piece (TableView.lift) and Moves.hold; each frame (Gesture.paced) it
  works out the place and aim, has Hands.show draw them on this page, sends the same items
  (Moves.drag), and lights the bar (this page's alone). At the release: Hands.drop, Moves.drop with
  no aim, the drop's change (one Game.change, inside still), Moves.release. A drop that changes
  nothing leaves the record as it was; the other pages put the piece back (R300).
- aim: worked out on this page from what's under the pointer: the target below, as oids and rids
  (a slot by its pool and name, a drawer by its pool and the gap's index, the kill box by its pool,
  a tap to merge with, a card paper would pin to); over a pool's slots, the strip under the pointer
  and the slot paying for it (R244, remembering the slot it came from); a card over the slots as a
  chip (R243). The drop resolves from the last aim.
- start(rid, press, move): paper or a character's card, with what's pinned to the card following it
  (Hands works that out on every page).
- drop(pointer): resolves the target, in this order, then one Game.change:
  - a tap glyph or resource-made card on a resource-made card: Tap.feed (merge);
  - a chip or Influence card on a slot: into the slot; a card the slot
    refuses (Pool.accepts: a Damage card outside its kind, a Motivation's outside Main) goes home
    to its drawer instead (R211, R463);
  - an Influence card on a drawer: home there (another character's drawer moves it);
  - anything on the bar: put away (bury, vanish, or go home, by kind);
  - a loose sticky, text or image on a card: pinned, its offset from the card kept; paper pinned to a
    card, let go anywhere: still pinned to it at its new offset (R569); a card carries what's pinned to it;
  - an Influence card anywhere else: home (a tap may stay loose);
  - the Base on a character: aim (RollRow);
  - otherwise: placed where dropped.
- supplies: a supply taken from the desk is made under the pointer (Desk); a new character pops its
  pool out above the card, or the card slides below the bar if there's no room.
- file (R519-R523): letting go over the desk (overDesk, by the pointer's x and y) files a piece
  Drawers.drawerOf gives a drawer, on this page's `gm`: its burialOf records (less `mine` paper on the
  GM's page, which holds none) go into the `desk` record's drawer under graveName, and are deleted from
  the table in the same change. Anything else over the desk is as over the bar. While a fileable piece
  is over the desk the bar is lit `file` with "→ <drawer>" (R520), not `bury`.
- loose (R513): start, startPool and startItem may carry with no button held, from a pointer
  position: the piece follows every pointer move until the next press, which is taken (its default
  prevented and kept from what lies under it) and puts the piece down there, or puts it away over the
  bar; Esc puts it away (a fresh supply is never made, R19). Zooming keeps it under the pointer.
- tear: dragging the tape tears off the whole roll as a torn-roll piece.
- exhume: dragging a name out of Boot Hill brings its records back under the pointer.

- startPool(rid): from its name, frame or drawer (R251), a pool carries its card (and what is pinned
  to it) by the same offset, gathered or not (Hands); the drop saves both places.
- startItem(rid) (R220, R243): the chip or card itself is lifted (TableView.lift), found by its rid
  when the press was elsewhere (a chip just taken from the bar was pressed on the supply): taken out of its
  slot, drawer, pile or the table into the table's world layer, where the zoom applies to it as to
  everything else, and held there until let go. It keeps the spot it was pressed; a card stays a
  card in hand, and while the pointer is over a pool's slots it is drawn as a chip centred on the
  pointer, then as the card again with its grip when it leaves them.
- startGlyph(source) (R225): the tap is made as the drag starts (Tap.tap, the Level spent), lifted
  like any loose card with its glyph under the pointer, and stays a card in hand. Dropped on a
  resource-made card it merges into it (its Level back to its source and fed into that card).
- drawer gap (R240): over a drawer, each frame works out where among its cards the card would go
  (insertAt over the cards' rects, reading order); the aim carries it and Hands opens the gap
  there; the drop puts it there (toDrawer with that index).
- target (R222): the aim's place, lit by Hands (`over`): the slot, the drawer, the kill box, the
  resource-made card a tap merges into, or for paper the card it would pin to. Over the bar, toss
  or bury is this page's own.
- cursor (R221): carrying a chip, card or tap puts the pointing hand on the whole page (`tapping`).
- grip (R216): the press's offset from the piece's corner, kept in world coordinates; each frame
  places the piece at `toWorld(pointer) - grip`, so it stays glued at any zoom with nothing to
  scale. Drawn as a chip over the slots, it is gripped at its centre; a tap at its glyph's
  centre. A pinch under a carry (R482) moves the view, not the pointer: the carry watches the
  view (TableView.onView) and places the piece again at the pointer's last spot.
- land (R217, R226): a drop is one Game change made inside TableView.still, so the piece is drawn
  where it was let go with no glide.
- A card dragged alone leaves its pool from where it was drawn and is ungathered.
- docket carry (R541, R543): a docket's label, or a press on a tied docket's pile, carries the docket; its papers follow (Hands) and the drop moves them by the same offset. A fresh docket, let go on the table, has its name selected (R532).
- docket aim (R536, R538, R539): carried paper not aimed at a card is aimed at the docket on top whose tape, drawn without the carried paper, it touches (Dockets.aimed); let go so, it is pinned to that docket at its offset from the label; let go clear, it is loose.
- filing among desks (R562, R555): over the desk or its hanging board, the desk is the row under the
  pointer or else the board's first (the desk set out); the hint names it and the drawer when there are
  several.
- pinned paper's carry (R569): aimed at nothing, the pin line drawn from its tack to its card's center
  each frame (TableView.pinLine), its drop keeping the pin at the new offset.
- startTack(rid, down, move) (R571): the tack's drag: the pin line runs to the pointer, the card under it
  lit; let go on another card, the pin moves there with the paper where it lies; anywhere else, or Esc,
  nothing changes. The paper itself doesn't move.

## Collaborators
- Game, Moves, Pool, Tap, Yards, PoolView, TableView, RollRow, Gesture

## Sequences
- seq-drag.md
