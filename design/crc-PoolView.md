# PoolView
**Requirements:** R28, R31-33, R37, R41, R48-50, R53, R64, R78, R220, R227-240, R244, R251, R260, R268, R269, R142, R144, R146, R285

Draws a character's pool, its drawer and used pile, and the header with the action and opponent.

## Knows
- The character, and the chips and Influence cards whose `where` is one of its slots, its drawer or
  its used pile.

## Does
- chipFace(i) (R285): a chip's face, its points with a red one's sign; a +1 reads "+1" ("−1") since it
  modifies another chip. Every chip drawn uses it: in a slot, carried (Drag), loose (TableView).
- die (R142, R144, R146): the die by the pool's name shows its owner (GM, open, or the player);
  click claims an open character or docks the roll row (Ownership.click), shift-click opens it
  (Ownership.shiftClick); a refusal shakes the die and titles it with why.
- toSlot (actions): a `mot` card dropped into a Main slot joins that character's drawer, its
  `home` set to the slot's character (R260), so a card tapped from an NPC's Motivation is the
  tapper's.
- carry (R251): a drag from the name, the frame of slots or the drawer starts Drag.startPool; chips and
  cards there take the press first (their own drag), and the header's empty space is left to the table.
- drawPool(character, items, old): makes or updates the mat; what a click or a drop does is in
  `src/ui/actions.ts` (pure: each gives one Game change, so they're tested without a browser): into
  a slot with Roll Up settled, into a drawer, onto the table, the kill box, a chip's click, a rider's
  shift-click, a loose ±1, a card's Level wherever it is (or feed/unfeed for a resource-made card), shift-click at Min deleting it as the kill box does (R268, R269), a new card, the
  used pile, a tap from a glyph, a feed. New oids come from a minter: the GM counts up below the
  players' range; a player's page takes random oids in the players' range, so two players can't
  collide.
- mat (R227): a white frame round seven tall slots in order, rounded, each named in its middle in
  PT Mono, sentence case; Stagger wider, with "opposition only" under its name.
- openSlots(holding, opened) (R228): pure. The mat keeps its drawer's width (MAT_W). Slots open from
  the left while they fit, every slot holding anything (or opened by a click) stays open, and the
  rest are 1em strips with their first letter (full name on hover); open slots stretch to fill
  what's left, so the slots always fill the mat.
- reachFor(holding, at, from) (R244): pure. The slots open while a carry is over strip `at`: the
  strip opens and one slot closes to pay for it, the one the chip came from (`from`) if it is now
  empty, else the first empty open slot left of `from` (or of `at`); none, and the mat grows by
  that slot. reach(pool, at, from) holds it for this pool while Drag carries (not the Seat's) and
  re-lays the slots; a redraw keeps it. A click on a strip opens that slot (the Seat's openings)
  until it's closed.
- drawer (R229, R230, R231, R244): a tray inside the mat under the slots, MAT_W wide even when the
  mat grows (so its tools don't move while you aim for them); its cards on the left, each a
  small white card with a band in its sign's colour, name and Level in handwriting, a glyph before
  a resource-made one's name; its tools on the right as tiles: dashed + and − in their sign's
  colour, the used pile with its count, the hatched kill box.
- new card (R232, R239): written as "Influence" last in the drawer, its name focused and selected.
- gap(owner, at) (R240): while a card is carried over this drawer, an empty card-sized gap stands at
  index `at` among its cards; the cards slide to their new places (each starts where it was and
  eases there), and the gap moves as `at` changes. Cleared at the drop.
- used pile (R233): opens as a paper list under its tile; a used card in a pool is greyed with a
  "used" tag.
- face-down (R238): a drawer its viewer can't read shows striped red backs, one per card.
- chips (R234, R235): flat discs with one dark rim and the number bold in PT Mono in the middle; a
  card in a slot adds a white inner ring, a resource-made one a tiny glyph at its corner; each tucks
  under the stronger one before it (stronger drawn on top).
- piles (R236): a stack of discs in their colour; open, the members listed beside the disc, each
  with its name.
- pops(before, after) (R237): pure. What pops in a redraw: a chip or card whose points changed, a
  pile that formed, a new chip in a slot that lost two or more (a Roll Up); popping is a brief grow
  from 1.5× with a white ring.
- chips: ordered by Pool.order; red chips show their sign; Influence cards in a slot as chips with
  their name on hover; piles (from Pool.rollUp) as one disc, opened and closed by click.
- empty slot space: click adds a +1, shift-click (or long press) a −1.
- drawer: its cards, the + and − writers, the used pile count (click opens it), the kill box.
- header: name, die (owner shown), gather, and the docked roll row's action and opponent.
- drag the pool: brings its card if gathered; Gather snaps the card under the drawer.
- held (R220): a chip or card in hand isn't among the items TableView gives it, so redrawing the
  pool while it's carried doesn't draw it again (and its slot settles without it).

## Collaborators
- Pool, Influence, Game, Drag, RollRow, Gesture

## Sequences
- seq-drag.md
