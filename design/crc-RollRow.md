# RollRow
**Requirements:** R67, R68, R69, R70, R71, R72, R73, R76, R77, R78, R86, R87, R88, R274-277

The dice you're about to roll, docked on the pool you roll for, in your view only (Seat).

## Knows
- pool, action `{label, base, yellows, bonus}`, opponent `{oid, kind}`, row and whether picked by
  hand, hand adjustments, private (the GM's switch).

## Does
- dock(character): from its die (own, or any for the GM); the same die again starts fresh; leaves
  when its viewer stops owning the character.
- action(mark): from an action's die: fills Base, Yellows and bonus (Odds.bonus), highlights that
  line; clicking the Base clears it. A new action starts the row at White unless it is aiming (R276).
- aim(character, kind): from dragging the Base; refused for a character hidden from the rolling
  character's owner ("Only the GM can aim at …", gone after about 2 s); a Defend chooser when the
  `<def>` has two numbers, at the pointer with its first choice focused, closed by Escape or a click
  elsewhere. While dragging, the pool under the pointer has a dashed amber outline (`aimed`) and the
  pointing hand holds (R277).
- row(): the White row from the Difference (Odds), live as pools change, unless picked by hand in
  the Difference menu (held until the next aim).
- show() (R274, R275): docked between the pool's header and its slots, a dark walnut strip the
  drawer's width; blank 24 px dice in their colours, a dashed ghost for no Yellows, a faint "+0"; Roll
  a blue key at the right; (GM) the private tag, "to table" / "private", titled with who will see it; numbers follow the rolling
  character's owner: if they can't see the opponent, `vs` name and the White setting as dice only,
  and the menu locked ("set by the GM"); the GM's hover still shows the Difference.
- roll(): Rolls.request on a player's page; on the GM's page, Rolls resolves directly.

## Collaborators
- Odds, Pool, MarkReader, Visibility, Rolls, Seat, PoolView, Gesture

## Sequences
- seq-roll.md
