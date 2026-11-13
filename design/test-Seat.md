# Test Design: Seat
**Source:** crc-Seat.md

## Test: the seat is not the game
**Purpose:** R126–R128: seat changes never touch the game; a reload restores the seat; each viewer
has their own (R153); a restore keeps it (R136)
**Input and Expected**, in Chromium and Firefox:
1. as GM: dock the roll row on Devreux, roll the tape up, open Devreux's used pile, pan and zoom
   over an empty stretch of table, open Boot Hill
2. the game's records, held and saved: as before; the seat is the one key `hollow.seat.<game>.GM`,
   holding the view, the roller on Devreux, the tape up, Boot Hill open and the used pile
3. reload: the seat exactly as set, and drawn so
4. "You are" another viewer: nothing docked, Boot Hill closed
5. "You are" back to the GM: the GM's seat again, the roller docked
6. restore a checkpoint from the Ledger: the seat as it was just before
**Refs:** crc-Seat.md, crc-Game.md
**Code:** `tests/seat.spec.ts`
**Alarm:** 3
**Fire alarm:** Keep the tape's up or down in the game too: the records change when the tape rolls up
**Inject:** src/main.ts:views
**Pulled:** 2026-11-13 — rang: the game's records changed when the tape rolled up (Chromium)

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
