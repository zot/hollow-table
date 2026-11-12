# Test Design: Seat
**Source:** crc-Seat.md

## Test: the seat is not the game
**Purpose:** seat changes never touch the game; a reload restores the seat; each viewer has their own
**Input and Expected**, in the browser:
1. as GM: pan and zoom, dock the roll row on Devreux, pick Attack, aim at Sam, pick a row by hand,
   two Yellows, roll the tape up, open Boot Hill, open a used pile
2. the game's records: byte-identical to before; the seat is one localStorage key per game and
   viewer, nothing in the database
3. reload: the seat exactly as set
4. as Player 2 on the same browser: its own seat (default view, nothing docked)
5. back as GM: the GM's seat again
6. restore a checkpoint: the seat kept
**Refs:** crc-Seat.md, crc-Game.md
**Code:** `tests/seat.spec.ts`
