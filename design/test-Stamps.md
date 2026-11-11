# Test Design: Stamps and Moves
**Source:** crc-Stamps.md

## Test: the move actor's rules
**Purpose:** newest arrival places a piece; an older arrival only from the same page with a higher
number; lower numbers are discarded
**Input:** the mockup's `sync.cjs` "move actor" case: A's 107, 103, 109, 101, 105 out of order; then
A 120 and B 1; A 115; A 121
**Expected:** 1009, 700, 700, 610 as in `sync.cjs`
**Refs:** crc-Stamps.md, crc-Moves.md, seq-move.md
**Code:** `src/net/moves.test.ts`

## Test: a deletion after a drag is not stale
**Purpose:** the 11-11 bug: the GM drags a piece to the bar (moves numbered s+1..s+n), which
deletes it; a player's page must remove it
**Input:** a player's Stamps that has applied the drag's moves for the piece; the deletion as the GM
sends it
**Expected:** fresh; the piece is removed
**Refs:** crc-Stamps.md, crc-Authority.md, seq-sync.md
**Code:** `src/net/stamps.test.ts`
