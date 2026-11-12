# Test Design: PoolActions
**Source:** crc-PoolView.md

What a click or a drop on a pool, a drawer or a glyph does to the game (`src/ui/actions.ts`).

## Test: chips in slots
**Purpose:** chips join slots and roll up; clicks raise and lower; riders; loose ±1
**Input:** three 4s dropped in Sam's Main; a +1 in Edge clicked, shift-clicked, shift-clicked; 4, 4
and a 6 in Beauford's Main, the 6 lowered; a shift-click in Sam's Bonus; a 2 with a rider clicked
and shift-clicked
**Expected:** Main is one 6; the +1 becomes 2, then +1, then nothing; Beauford's Main is one 6 (the
lowering completed the Roll Up); Bonus holds a −1; the rider click does nothing, the shift-click
removes it
**Refs:** crc-PoolView.md, crc-Pool.md, crc-Influence.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 1
**Fire alarm:** Drop a chip into a slot without settling it (put it, skip Roll Up): three 4s stay three 4s
**Inject:** src/ui/actions.ts:toSlot
**Pulled:** 2026-11-12 — rang: three 4s stayed three 4s

## Test: cards, drawers and the kill box
**Purpose:** cards go into slots by kind, home to drawers, between characters, and die in the kill box
**Input:** a Bias card offered to Main; Keep the Peace into Bias, then Main, then dropped on the
table, then on Sam's drawer, lowered twice; a − card written; it killed; a used card restored; a
loose chip vanishing
**Expected:** the Bias card refused, the plain one taken anywhere; dropped on the table it goes home;
Sam's drawer makes it his; it stops at Min; the new card is −Min in the drawer; killed it's gone;
the used card is back in the drawer, not used; the chip is gone
**Refs:** crc-PoolView.md, crc-Drag.md, crc-Tap.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 2
**Fire alarm:** Let a plain card dropped on the table stay there (treat it like a tap): it isn't home in the drawer
**Inject:** src/ui/actions.ts:toTable
**Pulled:** 2026-11-12 — rang: the plain card dropped on the table wasn't home in the drawer

## Test: taps from glyphs
**Purpose:** a glyph makes a card at Min; another feeds it; a tap may wait loose; killing refunds
**Input:** Sam's Money glyph onto the table; his Ammo glyph onto that card; it dropped on the table;
shift-clicked; killed
**Expected:** a Money card at Min; then 4 points; it stays loose; Sam's Resources back to Money
+Maj and Ammo +Sig after the kill
**Refs:** crc-Tap.md, crc-Drag.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 3
**Fire alarm:** Give no refunds when a card is killed (drop Tap.kill's changes): Sam's Resources stay spent
**Inject:** src/ui/actions.ts:killCard
**Pulled:** 2026-11-12 — rang: Sam's Resources stayed spent after the kill

## Test: new oids
**Purpose:** the GM counts up below the players' range; a player's are random above it
**Input:** two GM oids; one player oid
**Expected:** consecutive, under PLAYER_OIDS; the player's at or over it
**Refs:** crc-PoolView.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 4
**Fire alarm:** Mint players' oids by counting up like the GM's: the player's oid is under PLAYER_OIDS
**Inject:** src/ui/actions.ts:minter
**Pulled:** 2026-11-12 — rang: the player's oid was under PLAYER_OIDS
