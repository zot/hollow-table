# Rolls
**Requirements:** R69, R97, R100-104, R106-108, R278, R279, R281, R307, R308, R313, R314, R317, R326, R330, R336, R337, R340, R345, R346, R351, R353

Rolling at a table: every roll resolves on the GM's page, and each page prints what its person may
know.

## Knows
- WAIT_MS: 10 s for the GM's page to answer.
- The receipt's words (R279), from the book: rowWords (range nearer zero first below zero, name,
  dice: "+7 to +9 Strong Advantage: Green + 1"), resolutionWords ("higher of White 4 and Green 6 +
  1"), and the outcome line (R317): the outcome, its Level as a signed short name, and the sum of the
  Blue and remaining Yellows ("+ 2 bonus" unless a Failure): "Success +Maj: 6 + 4", "Success at cost
  +Sig: 3 + 2", "Failure −Sig: 2 + 5"; a successful Attack gives its amount instead, "Success 10: 6
  + 4". A receipt
  carries the action's label, its title "Sam, roll 3" from `meta.counts` (R278).
- rollNo: this page's roll counter (sessionStorage), so receivers can notice skipped rolls.
- lastRoll: sender tab → the last roll number heard.

## Does
- left(tab): Presence's word that a tab has gone; if it was the GM's page, the next request says
  nobody can roll at once (R103).
- request(intent): a player's Roll: an `intent` naming the character, the action, the opponent and
  Defend kind, hand adjustments, and a hand-picked row if any; never numbers. Resolves with null
  when answered, or why not (refused, no GM heard, or nothing within WAIT_MS); Roll shows "GM…"
  meanwhile.
- resolve(game, intent, rng, at): pure: with no action (R69), the row as set, its hand the dice, no
  Total Influence; otherwise looks up the action on the GM's own records, totals both
  sides (Odds, Pool), picks the White row from the Difference unless the player picked one, rolls
  (Dice), and gives three receipts in R317's words and the roll's effects (the character's own roll
  count, R278, kept in meta by character; used cards; a CRIT!
  card: an Influence with `crit`, minted in the drawer, or the one there strengthened by a Level).
  The receipts: the GM's has everything; the roller's has their Total Influence and base, and `vs`
  and the row as the character's owner may see them (dice only, "White + 1", when they can't see
  the opponent); the table's has neither.
- On the GM's page, an intent: refuses a character the sender doesn't own (saying why), else
  resolves, applies, prints the full receipt, and sends `roll {n, receipt: the table's, sealed:
  {tab: the roller's, with which request it answers}}`.
- roll(intent, private): the GM's own roll; private (or with no table) it prints on the GM's tape
  only, "Private: not shown to the table", and sends nothing.
- crit(id, choice, lock): the owner or the GM switches or locks a CRIT; the GM's page applies it
  and every tape updates that receipt (by id). A locked CRIT stays.
- Each page prints on its own tape (the `tape` record, never sent), newest first; its own answered
  roll gets ✓ (`ok`).
- An Attack (R307, R308): an action labelled Attack, aimed, that succeeds (at cost or not) gives
  all three receipts `attack: {target, name, from, kind, result}`; a CRIT's choice moves `result` with it.
- take(id, page) (R314, seq-take.md#1.4): the target's owner or the GM; on the GM's page, refused
  unless the kept receipt has an untaken Attack, the sender owns the target (or is the GM), and the
  page is one of Absorb.pages on the GM's own records; then Absorb.fill, the receipts marked taken
  with the named Slots now waiting (`waiting: [{damage, row}]`, `row: lasting` for a new Conviction
  or Burden, R340), and every tape updated as for a CRIT.
- name(id, damage, row, text) (R313, R314, seq-take.md#2): the attacking character's owner or the
  GM; on the GM's page, refused unless that Slot (or Conviction or Burden, R340) waits for this
  receipt's name; then it is named,
  no longer waiting, and every tape updated.
- kept (R308, R313): every roll the GM's page makes or answers is kept in its own book (`book.kept`,
  never sent; the newest 200), copied on read and written back whole, so a CRIT, a take or a name
  still works after the GM's page reloads.
- note(text) (R281): a refusal or an unanswered roll printed on this page's tape as a red note.
- gaps: a skipped roll number prints "N rolls from the GM didn't arrive" ("Many" over 20), as a
  receipt with outcome `missing`; an error (refused, unanswered) prints the same way, a red note
  with the time (R281).

- apply (R353): a `once` card in the rolling character's pool is deleted, not marked used.
- resolve against the world (R345, R346, R351): refused when the intent has an action but no `vs`
  ("Aim it first."), when its type is `?` and it has an action ("Say what this roll is first."), and
  when `vs` is `world` and the GM's own World record is blank ("The world has no number yet.");
  else the opposition total is the World's number, nothing added. The `vs` line: `the world (4),
  Difference +2` for the GM, and for the roller when their character is the GM's; `the world`
  otherwise and on the table's. No `attack`: an Attack at the world has nothing to take its Damage.
- resolve with `intent.against` (R326, R336, R330): the base looked up by name in the target's own front (MarkReader.points), a Field or Skill adding the target's attribute the action uses (R337); a name it can't find falls back to Defend.

## Collaborators
- Wire, Seal, Odds, Pool, Dice, Visibility, Ownership, Game, Absorb

## Sequences
- seq-roll.md
- seq-take.md
