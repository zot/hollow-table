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

## Test: the seat on its own
**Purpose:** the seat is per game and viewer, survives broken storage, and prunes what vanished
**Input:** a memory Storage; a seat for (game a, GM) with a view, a docked roller on Devreux aiming
at Sam, an open used pile and an opened column; another for (a, Player 2); a Storage that throws;
prune after Sam and Devreux vanish
**Expected:** each seat reads back as saved under `hollow.seat.<game>.<viewer>`, the two apart; the
throwing Storage gives a default seat and saving does not throw; after the prune the roller is gone
and so are Sam's and Devreux's opened things, the view kept
**Refs:** crc-Seat.md
**Code:** `src/store/seat.test.ts`
**Alarm:** 1
**Fire alarm:** Keep a docked roller whose pool vanished (drop the pool test in prune): the roller survives the restore
**Inject:** src/store/seat.ts:prune
**Pulled:** 2026-11-12 — rang: the roller survived a prune after its pool vanished

## Test: a first visit has no view
**Purpose:** R271: a fresh seat, and a seat never saved, have no view, so the table fits itself; a
kept view comes back, and a partial one is filled in
**Input:** fresh(); load with nothing saved; a saved view; a stored seat whose view has only a zoom
**Expected:** null, null, the saved view, `{x 0, y 0, zoom 2}`
**Refs:** crc-Seat.md
**Code:** `src/store/seat.test.ts`
**Alarm:** 2
**Fire alarm:** In fresh, start with a view at 0, 0, zoom 1 (as before): a first visit is never fitted
**Inject:** src/store/seat.ts:fresh
**Pulled:** 2026-11-12 — rang: fresh() had a view at 0, 0, zoom 1, so a first visit was never fitted
