# RollRow
**Requirements:** R67, R68, R69, R70, R71, R72, R73, R76, R77, R78, R86, R87, R88, R274-277

The dice you're about to roll, docked on the pool you roll for, in your view only (Seat).

## Knows
- pool, action `{label, base, yellows, bonus}`, opponent `{oid, kind}`, row and whether picked by
  hand, hand adjustments, private (the GM's switch).

## Does
- Pure (`src/ui/rollrow.ts`): fresh(pool) is no action, no opponent, White, one Yellow, +0, the
  hand being the dice when there is no action; dock(r, pool) starts fresh there (the same pool's die
  again too), keeping the GM's private switch; withAction(r, label) resets the hand, and the row to
  White unless aiming (R276); cleared(r) starts fresh; handStep adds or removes a Yellow, raises or
  lowers the bonus; picked(r, key) holds a hand-picked row; rollsFor(viewer, c) is its owner or the
  GM, never an open character; shown(game, r) gives the label, Base, Total Influence and its parts,
  the Yellows and bonus (Odds.bonus over the Bonus pool, the hand on top) and the row; against an
  opponent (aimed, R83–R85) their Defend (defendOf) and pools (Odds.opposition), the Difference
  picking the row unless picked by hand, and whether the rolling character's owner sees them
  (ownerAsViewer, R88). unaimed(r) stops aiming, keeping a picked row.
- The view (RollRowView): the row inserted after the pool's header, the action and its numbers in
  the header (`rollinfo`), the Difference menu in the pool; redrawn on every Game change, and the
  cards whose swish changes redrawn with it. The `vs` line (numbers only as the owner may see them;
  a click stops aiming), the opponent's pool ringed (`targeted`) with ⌖, and the White locked for a
  player when the opponent is hidden from the owner. Aiming is a drag from the Base (`#aim`); the
  Defend chooser and the note share a small box at the pointer (`#defchoice`).
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
- roll(): intentOf(r) names the character, action, opponent, Defend kind, hand, and the row only when
  picked (by hand, or set with nobody aimed at), never numbers (R100). On the GM's page Rolls.roll,
  private when switched; on a player's, Rolls.request, Roll reading "GM…" while waiting (R102); why
  not goes to Rolls.note (R281).

## Collaborators
- Odds, Pool, MarkReader, Visibility, Rolls, Seat, PoolView, Gesture

## Sequences
- seq-roll.md
