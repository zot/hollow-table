# PoolView
**Requirements:** R28, R29, R30, R31, R32, R33, R37, R41, R48, R49, R50, R53, R64, R78

Draws a character's pool, its drawer and used pile, and the header with the action and opponent.

## Knows
- The character, and the chips and Influence cards whose `where` is one of its slots, its drawer or
  its used pile.

## Does
- slots: seven slots in order; an empty one is a 1em strip with its first letter and the full name
  on hover; a slot holding anything is full width.
- widen(): all slots full width, anchored at the left edge; narrow() after the drag ends elsewhere.
  A click on a strip widens that slot until the next click elsewhere.
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
