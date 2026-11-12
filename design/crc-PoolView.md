# PoolView
**Requirements:** R28, R29, R30, R31, R32, R33, R37, R41, R48, R49, R50, R53, R64, R78

Draws a character's pool, its drawer and used pile, and the header with the action and opponent.

## Knows
- The character, and the chips and Influence cards whose `where` is one of its slots, its drawer or
  its used pile.

## Does
- drawPool(character, items, old): makes or updates the mat; what a click or a drop does is in
  `src/ui/actions.ts` (pure: each gives one Game change, so they're tested without a browser): into
  a slot with Roll Up settled, into a drawer, onto the table, the kill box, a chip's click, a rider's
  shift-click, a loose ±1, a card's Level (or feed/unfeed for a resource-made card), a new card, the
  used pile, a tap from a glyph, a feed. New oids come from a minter: the GM counts up below the
  players' range; a player's page takes random oids in the players' range, so two players can't
  collide.
- slots: seven slots in order; an empty one is a 1em strip with its first letter and the full name
  on hover; a slot holding anything is full width.
- wide: all slots full width, anchored at the left edge, while Drag carries something near
  (NEAR_PX); narrow again when the drop ends elsewhere. A click on a strip widens that slot (the
  Seat's openings) until it's closed.
- chips: ordered by Pool.order; red chips show their sign; Influence cards in a slot as chips with
  their name on hover; piles (from Pool.rollUp) as one disc, opened and closed by click.
- empty slot space: click adds a +1, shift-click (or long press) a −1.
- drawer: its cards, the + and − writers, the used pile count (click opens it), the kill box.
- header: name, die (owner shown), gather, and the docked roll row's action and opponent.
- drag the pool: brings its card if gathered; Gather snaps the card under the drawer.

## Collaborators
- Pool, Influence, Game, Drag, RollRow, Gesture

## Sequences
- seq-drag.md
