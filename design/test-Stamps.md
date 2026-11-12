# Test Design: Stamps and Moves
**Source:** crc-Stamps.md

## Test: the move actor's rules
**Purpose:** newest arrival places a piece; an older arrival only from the same page with a higher
number; lower numbers are discarded
**Input and Expected** (one piece, x after each pass):
1. from page A, numbers 107, 103, 109, 101, 105 (x = 1000 + the last digit) in that arrival order:
   1009 (highest wins, whatever the order)
2. A 120 to x 600, then B 1 to x 700, in one pass: 700 (B arrived last)
3. A 115 to x 650: 700 (lower than A's 120: discarded)
4. A 121 to x 610: 610
5. pages A and B are numbered with small local integers, 3 and 4
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
