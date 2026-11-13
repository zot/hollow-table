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
6. the piece held, A 122 to x 620: 610; let go: 620
7. sending: two drags within 100 ms go as one, the last place; a drag then a drop sends the drop at
   once, with a higher number
**Refs:** crc-Stamps.md, crc-Moves.md, seq-move.md
**Code:** `src/net/moves.test.ts`
**Alarm:** 1
**Fire alarm:** Run the drained buffer oldest arrival first: step 2 reads 600 (A placed it, though B arrived last)
**Inject:** src/net/moves.ts:pass
**Pulled:** 2026-11-12 — rang: step 2 read 600, not 700 (re-pulled after pass began counting passes)
## Test: a held piece slides to the most recent move
**Purpose:** R218: while a piece is held, only the most recent move for it waits, by the pass's rule,
never the moves in between; let go, it slides there
**Input:** held: A 123 to x 630 in one pass, B 2 to x 720 in a later one, then let go; held again:
A 125 to x 650 then A 124 to x 640 arriving in one pass, then let go
**Expected:** nothing placed while held; 720 (B arrived last); 650 (the same page's higher number)
**Refs:** crc-Moves.md
**Code:** `src/net/moves.test.ts`
**Alarm:** 4
**Fire alarm:** Keep the first move that waits for a held piece (`newer` only when nothing waits): the later B arrival is ignored and the piece goes to 630
**Inject:** src/net/moves.ts:#hold
**Pulled:** 2026-11-12 — rang: the later B arrival was ignored and the piece went to 630, not 720

## Test: a move carries its aim, and a drop says it let go
**Purpose:** R299, R300: the aim travels with a move and reaches the receiver's hands as sent; a drop
goes out at once, `drop: true`, with no aim
**Input:** a drag aimed at Sam's Main as a chip, then its drop, both received from A in one pass
**Expected:** sent: the drag with its aim, the drop with none and `drop: true`; shown: the drop
alone (the newest arrival), x 9, `drop: true`
**Refs:** crc-Moves.md
**Code:** `src/net/moves.test.ts`

## Test: a deletion after a drag is not stale
**Purpose:** the 11-11 bug: the GM drags a piece to the bar (moves numbered s+1..s+n), which
deletes it; a player's page must remove it
**Input:** a player's Stamps that has applied the drag's moves for the piece; the deletion as the GM
sends it
**Expected:** fresh; the piece is removed
**Refs:** crc-Stamps.md, crc-Authority.md, seq-sync.md
**Code:** `src/net/stamps.test.ts`
**Alarm:** 2
**Fire alarm:** Call nothing stale (fresh always true): the piece's last number reads fresh after the drag
**Inject:** src/net/stamps.ts:fresh
**Pulled:** 2026-11-12 — rang: the piece's last number read fresh after the drag

## Test: the counter continues across a reload
**Purpose:** a reload keeps numbering where it stopped, so its sends aren't stale
**Input:** two numbers taken, then a new Stamps on the same storage
**Expected:** the storage holds 2; the new Stamps' next is 3
**Refs:** crc-Stamps.md
**Code:** `src/net/stamps.test.ts`
**Alarm:** 3
**Fire alarm:** Start every Stamps at 0, ignoring the storage: the new Stamps' next is 1
**Inject:** src/net/stamps.ts:constructor
**Pulled:** 2026-11-12 — rang: the new Stamps' next was 1, not 3
