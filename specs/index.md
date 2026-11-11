# Hollow Table — spec index

A play manager for Hollow stories (Glimmer, Bunkum): a shared table in the browser, peer to peer.
The GM's browser holds the game; players join with an invite link.

## Systems

### The table
- [table.md](table.md) — the surface, the bar, pieces, characters and their pools
- [influence.md](influence.md) — chips, Influence cards, Roll Up, tapping Resources, used cards
- [rolls.md](rolls.md) — the roll row, actions, pointing at an opponent, resolving, receipts and the tape, the register
- [boothill.md](boothill.md) — putting away, graveyards, deleting forever

### The game
- [games.md](games.md) — the game and your seat, saving, the game list, checkpoints, export and import
- [ownership.md](ownership.md) — GM, open and player ownership; secrecy; identity and viewing as

### The network
- [network.md](network.md) — rooms, presence, identity, the GM's page holding the game, moves, secrets, the GM's page away, images

### Delivery
- [delivery.md](delivery.md) — TypeScript and esbuild, GitHub Pages and the IPNS test rig, browser tests

## Themes

- **Who may know what.** Each page shows only what its person may know. Touches `ownership.md`
  (what's secret), `network.md` (sealing, redaction), and `rolls.md` (the roll row follows the
  rolling character's owner; the table view of a receipt). The invariant: no page ever holds, in the
  clear, a secret its person may not read.
- **The GM's page has the final say.** `network.md` (the game lives there; deletions and versions),
  `rolls.md` (rolls resolve there), `games.md` (a player's page holds a copy).
- **Every control is a thing at the table.** `table.md` (*Feel*) states it; `rolls.md` (Roll, the
  CRIT punch, action dice), `games.md` (the Ledger page), `ownership.md` ("You are") and
  `influence.md` (signed red chips) apply it. The invariant: no web chrome, nothing told by colour
  alone, and every shift-click reachable by touch.
- **The game versus your seat.** `games.md` defines the two tiers; every spec that adds state says
  which tier it's in.
