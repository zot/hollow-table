# RollRow
**Requirements:** R67-73, R76-78, R86-88, R274-277, R306, R307, R316, R319-321, R326-330, R336, R337, R345, R346, R376, R350, R362, R353, R355, R362-365, R372-376, R381-383

The dice about to be rolled for a character: one row per character, a piece of the table kept in
the game's `rows` record (R381), shown on its pool on every page, changed only by its owner and the GM.

## Knows
- pool, action `{label, base, yellows, bonus}`, opponent `{oid, kind}`, row and whether picked by
  hand, hand adjustments, private (the GM's switch).

## Does
- The shared row (R381–R375): RollRowView draws a row on every pool that has one in `rows`; its
  controls answer only its owner and the GM (rollsFor); the drag from the action in the header aims
  only on the GM's page (R372). The GM's page keeps each aimed row's White as the Difference picks
  it (setWhite: from shown() over the GM's own records, unless picked by hand), writing the row back
  only when it changed (R373); every other page shows the White the row holds, locked for a player
  (R374). The rest of a row is per page: whether its own Roll is waiting.
- Pure (`src/ui/rollrow.ts`): fresh(pool) is no action, no opponent, White, one Yellow, +0, the
  hand being the dice when there is no action; dock(r, pool) starts fresh there (the same pool's die
  again too), keeping the GM's private switch; withAction(r, label) resets the hand, and the row to
  White unless aiming (R276); cleared(r) starts fresh; handStep adds or removes a Yellow, raises or
  lowers the bonus; picked(r, key) holds a hand-picked row; rollsFor(viewer, c) is its owner or the
  GM, never an open character; shown(game, r) gives the label, Base, Total Influence and its parts,
  the Yellows and bonus (Odds.bonus over the Bonus pool, the hand on top) and the row; against an
  opponent (aimed, R83, R84, R373) their Defend (defendOf) and pools (Odds.opposition), the Difference
  picking the row unless picked by hand, and whether the rolling character's owner sees them
  (ownerAsViewer, R374). unaimed(r) stops aiming, keeping a picked row.
- The view (RollRowView): the row inserted after the pool's header, the action and its numbers in
  the header (`rollinfo`), the Difference menu in the pool; redrawn on every Game change, and the
  cards whose swish changes redrawn with it. The `vs` line (numbers only as the owner may see them;
  a click stops aiming), the opponent's pool ringed (`targeted`) with ⌖, and the White locked for a
  player when the opponent is hidden from the owner. Aiming is a drag from the Base (`#aim`); the
  Defend chooser and the note share a small box at the pointer (`#defchoice`).
- dock(character) (R381): from its die (own, or any for the GM), a toggle: the row comes up fresh, or
  goes away (with the card its action suffered, R353); clearing the Base starts it fresh (R382).
- action(mark, label): from an action's die, the alternative it stands before naming the action (R316): fills Base, Yellows and bonus (Odds.bonus), highlights that
  line; clicking the Base clears it. A new action starts the row at White unless it is aiming (R276).
- aim(character, kind): from dragging the Base; refused for a character hidden from the rolling
  character's owner ("Only the GM can aim at …", gone after about 2 s); a Defend chooser when the
  `<def>` has two numbers, at the pointer with its first choice focused, closed by Escape or a click
  elsewhere. While dragging, the pool under the pointer has a dashed amber outline (`aimed`) and the
  pointing hand holds (R277).
- type (R319, R364): the roll's type, `?`, `skill`, `influence`, `phys`, `mental`, `psych`
  (the three Attacks), `infer`, `impress` or `request`; typeOf(label) preselects it from the label's
  words, else the seat's remembered type for that action on that card, else `skill` when the label
  names a Field or Skill on the card (MarkReader.skillNamed, R364), else `?`. The tag on the row
  opens the list; a choice is remembered in the seat.
- A Skill roll aimed at a Defend (R365): a Defend number pointed at, or a drop that falls back to
  Defend (the pool, the card away from a number, through the chooser too), aims as asked and puts the
  note "A Skill or Attribute normally opposes a Skill" at the pointer.
- An Attack aims straight at its Defend (R346): Mental at Mental, Psych at Psych, Phys at 0, with no
  chooser; a `?` roll's aim at a character or at the world is refused ("Say what this roll is first", gone after
  about 2 s). The type goes in the intent, and an Attack's kind in the receipt's `vs` (R307).
- row(): the White row from the Difference (Odds), live as pools change, unless picked by hand in
  the Difference menu (held until the next aim).
- show() (R274, R275, R321): the type tag before Roll, as a tag like the private switch; docked between the pool's header and its slots, a dark walnut strip the
  drawer's width; blank 24 px dice in their colors, a dashed ghost for no Yellows, a faint "+0"; Roll
  a blue key at the right; (GM) the private tag, "to table" / "private", titled with who will see it; numbers follow the rolling
  character's owner: if they can't see the opponent, `vs` name and the White setting as dice only,
  and the menu locked ("set by the GM"); the GM's hover still shows the Difference.
- roll(): intentOf(r) names the character, action, opponent, Defend kind, hand, and the row only when
  picked (by hand, or set with no action and so nobody aimed at), never numbers (R100). On the GM's page Rolls.roll,
  private when switched; on a player's, Rolls.request, Roll reading "GM…" while waiting (R102); why
  not goes to Rolls.note (R281).

- Pointing (R326–R330): the Roller keeps `against`, what was pointed at by name (MarkReader.points),
  set by a drop on it and cleared by the next aim; shown() and the GM's page take the base from it
  (a Field or Skill adding the target's attribute the row's action names, R337),
  else from Defend as before (R328). While dragging from the Base (#aim): what is under the pointer
  is found by its line (each card line is a `div`) and its offset in that line's text
  (caretRangeFromPoint), matched against points(); an overlay box (`#aimbox`) goes round that run of
  text by its Range's rectangles, or round the pool; an overlay line (`#aimline`, SVG) runs from the
  action in the header to the pointer. Neither touches the card's text.

- The world (R345, R376, R350): `opponent` may be `WORLD`. waits(r) is whether Roll waits: an action
  and no opponent, or an action typed `?`; Roll is then disabled, its title saying to aim first (or
  to say what the roll is). shown() against the world: its total the tray's number (Records' World,
  no pools), named "the world", seen only when the rolling character's owner is the GM, so a
  player's character gets dice only, locked, as against a hidden character (R374). A drag from the
  Base over open table (the topmost element under the pointer is `#table` or its layer `#world`
  itself) or over the tray is over the world: the dashed box goes round Tray.mark() (the tray, or
  its button while the tray is in); a drop there aims at WORLD, refused for `?` ("Say what this roll
  is first") and while the tray is blank (the GM: "Put the world's number in the tray first"; a
  player: "The GM hasn't given the world a number yet"). Aimed at the world, Tray.mark() wears the
  `targeted` ring in place of a pool.

- An action that suffers an Influence (R362, R353): onceCard(game, was, now, mint) is the change that
  keeps the actor's Main pool holding the one `once` card the row's action suffers
  (MarkReader.suffers; points 2 a Level): put when the row comes to it (reused when there), taken
  away, wherever it lies, when the row leaves it; #set applies it.
  rolled(r): after a roll that went through, a row whose action suffers an Influence starts fresh
  (cleared), its card used up on the GM's page. The header names the action by Rolls.alternative,
  so a variant typed by its action's alternative reads as itself (R355).

## Collaborators
- Odds, Pool, MarkReader, Visibility, Rolls, Seat, PoolView, Gesture, Tray

## Sequences
- seq-roll.md
