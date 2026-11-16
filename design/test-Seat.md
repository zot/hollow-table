# Test Design: Seat
**Source:** crc-Seat.md

## Test: the seat is not the game
**Purpose:** R126–R128: seat changes never touch the game; a reload restores the seat; each viewer
has their own (R153); a restore keeps it (R136)
**Input and Expected**, in Chromium and Firefox:
1. as GM: bring up Devreux's roll row, roll the tape up, open Devreux's used pile, pan and zoom
   over an empty stretch of table, open Boot Hill
2. the game's records, held and saved: as before but for `rows`, which now holds Devreux's row (the
   game's, R371); the seat is the one key `hollow.seat.<game>.GM`, holding the view, the tape up,
   Boot Hill open and the used pile, and no roll row
3. reload: the seat exactly as set, and drawn so
4. "You are" another viewer: Devreux's row shows, the table's, with no Roll key for them; Boot Hill
   closed
5. "You are" back to the GM: the GM's seat again
6. restore a checkpoint from the Ledger: the seat as it was just before
**Refs:** crc-Seat.md, crc-Game.md
**Code:** `tests/seat.spec.ts`
**Alarm:** 3
**Fire alarm:** Keep the tape's up or down in the game too: the records change when the tape rolls up
**Inject:** src/main.ts:views
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the game's records changed with the seat (Chromium) *Earlier —* 2026-11-13 — rang: the game's records changed when the tape rolled up (Chromium)
## Test: the seat on its own
**Purpose:** the seat is per game and viewer, survives broken storage, and prunes what vanished; R371: a seat saved by an older page sheds the roll row it carried, the row being the game's
**Input:** a memory Storage; a seat for (game a, GM) with a view, an open used pile and an opened column; another for (a, Player 2); a Storage that throws; prune after Sam and Devreux vanish; prune of a seat carrying an old `roller`
**Expected:** each seat reads back as saved under `hollow.seat.<game>.<viewer>`, the two apart; the
throwing Storage gives a default seat and saving does not throw; after the prune Sam's and Devreux's
opened things are gone, the view kept; the old seat comes back with no `roller`
**Refs:** crc-Seat.md
**Code:** `src/store/seat.test.ts`
**Alarm:** 1
**Fire alarm:** keep the roll row an older seat carries (drop its removal in prune); red: `roller` survives the restore
**Inject:** src/store/seat.ts:prune
**Pulled:** 2026-11-16 — re-pointed at shedding an older seat's roll row (#22; the pruning it guarded is gone) and rang: "the seat on its own" failed, `roller` survived; restored clean *Earlier —* 2026-11-12 — rang: the roller survived a prune after its pool vanished
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

## Test: a player sees the GM's roll row but can't roll it
**Purpose:** R371: a roll row is the table's, shown on every page; only its owner and the GM have its controls (this entry replaces #16's "a seat aimed at the world survives a restore", whose seat code is gone: the row is the game's)
**Input:** the GM brings up Devreux's row; "You are" a player
**Expected:** Devreux's row shows; no Roll key in it
**Refs:** crc-RollRow.md
**Code:** `tests/seat.spec.ts`
**Alarm:** 4
**Fire alarm:** give every viewer a row's controls (`mine` always true in the draw); red: the player has a Roll key
**Inject:** src/ui/rollrow.ts:#draw
**Pulled:** 2026-11-16 — re-pointed at the shared row (#22) and rang (Chromium): the player had a Roll key in Devreux's row; restored clean *Earlier —* 2026-11-15 — rang after the test was tightened (it first passed silent: its `exists` said yes to `o:world` too): "the seat on its own" failed, the opponent null; restored clean
