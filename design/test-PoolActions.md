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

## Test: a tap merges into a resource-made card
**Purpose:** R225: a tap is a card from the start of its drag, so dropping it on a resource-made card
merges it: its Level goes back to its source and is fed into that card, spent once
**Input:** two taps from Sam's Money (+Maj); the second merged into the first; the first into itself;
a third tap from Ammo (+Sig) fed a second Level from Ammo, then merged into the first
**Expected:** Money +Min after the taps and still after the merge; the second card gone; the first
at 4 points; merging into itself refused; after the two-Level merge the first at 8 and Ammo +0, each Level spent once
**Refs:** crc-Drag.md, crc-Tap.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 5
**Fire alarm:** Skip the refund (don't apply Tap.kill's characters): Money is spent a third time and reads +0 or is refused
**Inject:** src/ui/actions.ts:mergeTap
**Pulled:** 2026-11-12 — rang: Money read +0, spent a third time, not +Min

## Test: drawer order
**Purpose:** R239, R240: a new card goes last; a card dropped into a gap goes there; one coming home
without a place goes last; the drawer is renumbered in order
**Input:** cards A, B and C written to Sam's drawer; A dropped before C; A sent home without a place
**Expected:** A B C last; then B A C; then B C A; numbers 0, 1, 2 … in drawer order
**Refs:** crc-PoolView.md, crc-Drag.md
**Code:** `src/ui/actions.test.ts`
**Alarm:** 6
**Fire alarm:** Write every new card with n 0 (the old writeCard): A, B and C don't come last in order
**Inject:** src/ui/actions.ts:writeCard
**Pulled:** 2026-11-12 — rang: the new cards tied on n 0 with the drawer’s first card

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
