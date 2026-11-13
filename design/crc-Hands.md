# Hands
**Requirements:** R298, R299, R300, R301, R218, R220, R222, R240, R243, R244

Every piece in a hand, this page's and other pages', drawn the same way: lifted at its place, with
what its aim does. Nothing here is sent or saved.

## Knows
- hands: for each hand (this page, or another page's tab), its pieces in hand, each with its place
  and aim, and when it was last aimed (the latest aim wins a pool or drawer).
- landing: pieces another page let go, waiting for the drop's change (LAND_MS, 1 s).
- shown: the reactions now drawn: the lit place, the gap in each drawer, the strip open in each
  pool, the pieces shown as chips.

## Does
- show(hand, items): each item is lifted (TableView.lift, by its rid; a piece with no element of
  its own, a member of a pile, gets one) and put at its place; another page's slides there
  (`carried`, R218). A character's pool brings its gathered card and what's pinned to that card; a
  card brings what's pinned to it. Then the reactions are drawn (react).
- drop(hand, items): this page's: let go at once (Drag applies the drop's change). Another page's:
  each piece stays where it was dropped, its aim cleared, until its record changes (the drop's
  change arrived) or LAND_MS passes; then it is let go and drawn where its record says (R300).
- A piece in another page's hand is let go whenever its record changes, dropped or not: the change
  can overtake the drop (and, numbered after it, makes the late drop stale), and a later move takes
  it up again.
- leave(hand): every piece of that hand is let go (R301).
- react(): from every hand's aims, latest first, what should show: one lit place per hand
  (`over`), one gap per drawer (showGap), one strip per pool (reach, with the slot paying for it),
  and a card as a chip while its aim says so (asChip; put back when it doesn't). Only the
  differences from what's shown are drawn. Also run after every redraw (TableView's `after`), since
  a drawer's redraw drops its gap.
- An aim resolves in this page's own layout: a slot by its pool's oid and name, a drawer by its
  pool's oid, the kill box by its pool's oid, a tap or card by its rid. What this page doesn't draw
  resolves to nothing.

## Collaborators
- TableView: lift, letGo, render, the pools and elements by rid, and `after` for redraws.
- PoolView: reach, showGap, chipFace.
- Game: hears changes, for pieces landing.

## Sequences
- seq-move.md
- seq-drag.md
