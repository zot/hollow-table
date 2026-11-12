# Rolls
**Requirements:** R97, R100, R101, R102, R103, R104, R106, R107, R108, R278, R279, R281

Rolling at a table: every roll resolves on the GM's page, and each page prints what its person may
know.

## Knows
- WAIT_MS: 10 s for the GM's page to answer.
- rollNo: this page's roll counter (sessionStorage), so receivers can notice skipped rolls.
- lastRoll: sender tab → the last roll number heard.

## Does
- request(intent): a player's Roll: an `intent` naming the character, the action, the opponent and
  Defend kind, hand adjustments, and a hand-picked row if any; never numbers. Resolves with null
  when answered, or why not (refused, no GM heard, or nothing within WAIT_MS); Roll shows "GM…"
  meanwhile.
- resolve(game, intent, rng, at): pure: looks up the action on the GM's own records, totals both
  sides (Odds, Pool), picks the White row from the Difference unless the player picked one, rolls
  (Dice), and gives three receipts in R279's words and the roll's effects (the character's own roll
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
- gaps: a skipped roll number prints "N rolls from the GM didn't arrive" ("Many" over 20), as a
  receipt with outcome `missing`; an error (refused, unanswered) prints the same way, a red note
  with the time (R281).

## Collaborators
- Wire, Seal, Odds, Pool, Dice, Visibility, Ownership, Game

## Sequences
- seq-roll.md
