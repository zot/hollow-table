# Rolls
**Requirements:** R97, R100, R101, R102, R103, R104, R106, R107, R108

Rolling at a table: every roll resolves on the GM's page, and each page prints what its person may
know.

## Knows
- WAIT_MS: 10 s for the GM's page to answer.
- rollNo: this page's roll counter (sessionStorage), so receivers can notice skipped rolls.
- lastRoll: sender tab → the last roll number heard.

## Does
- request(row): a player's Roll: an `intent` naming the character, the action, the opponent and
  Defend kind, hand adjustments, and a hand-picked row if any; never numbers. Roll shows "GM…"
  until the answer, at most WAIT_MS.
- resolve(intent, from): the GM's page: refuses a character the sender doesn't own (saying why);
  otherwise looks up the action on its own records, totals both sides (Odds, Pool), picks the White
  row unless the player picked one, rolls (Dice), applies its effects (used cards, a CRIT! card),
  prints its full receipt, and sends the result.
- receipt(result, viewer): the receipt this page may print: the roller's owner gets their Total
  Influence and base and `vs` as they may see it; everyone else the table view; the GM's tape
  everything.
- here(): with no GM at the table nobody can roll; a page with no table rolls for itself.
- private: the GM's own roll prints "Private: not shown to the table" and sends nothing.
- crit(id, choice, lock): the owner or the GM switches or locks a CRIT; the GM's page applies it
  and every tape updates that receipt.
- gaps: a skipped roll number prints "N rolls from … didn't arrive" ("Many" over 20).

## Collaborators
- Wire, Seal, Odds, Pool, Dice, Visibility, Ownership, Game

## Sequences
- seq-roll.md
