# Test Design: Yards
**Source:** crc-Yards.md

## Test: graveyards
**Purpose:** numbering, vanishing and keeping
**Input and Expected**, in order (graveyards as name[items], current marked):
1. bury Sam: `*Graveyard 1[Sam]`
2. setup: only Graveyard 2 in use (Graveyard 1 emptied away): `*Graveyard 2[x]`
3. ›: `Graveyard 2[x], *Graveyard 3[]` (one past the highest in use, not the lowest free)
4. ‹ then ›: still Graveyard 3
5. fresh: bury Sam; ›: `Graveyard 1[Sam], *Graveyard 2[]`; › again on the empty one: nothing
6. bury Beauford: `Graveyard 1[Sam], *Graveyard 2[Beauford]`; rename it "Old timers"
7. ‹, drag Sam out: Graveyard 1 is empty and nameless, so it goes: `*Old timers[Beauford]`
8. ›: `Old timers[Beauford], *Graveyard 1[]`; ‹ leaves the new empty one, which goes
9. › ‹ three times, then ›: still Graveyard 1
10. drag Beauford out: `*Old timers[]` kept (it has a name)
11. erase its name when it is the only one: kept, shown as "Unnamed graveyard"
**Refs:** crc-Yards.md
**Code:** `src/rules/yards.test.ts`
**Alarm:** 1
**Fire alarm:** Number a new graveyard by the lowest free number: step 3 makes `Graveyard 1` instead of `Graveyard 3`
**Inject:** src/rules/yards.ts:nextName
**Pulled:** 2026-11-12 — rang: step 3 made `Graveyard 1` instead of `Graveyard 3`
## Test: deleting forever
**Purpose:** two shift-clicks, arming that reverts
**Input and Expected:**
1. bury Sam, Beauford and a note: `Graveyard 1[Sam, Beauford, Note: …]`
2. one shift-click on Sam: armed ("Delete forever? Shift-click again"), nothing gone (BootHillView)
3. 3 s later: disarmed, nothing gone (BootHillView)
4. two shift-clicks: Sam gone forever, not on the table either
5. shift-click the name: armed ("Delete everything here? Shift-click again"); again: `Graveyard 1[]`
**Refs:** crc-Yards.md, crc-BootHillView.md
**Code:** `src/rules/yards.test.ts`
**Alarm:** 2
**Fire alarm:** Let forgetAll keep the graveyard's items: step 5 still lists Beauford and the note
**Inject:** src/rules/yards.ts:forgetAll
**Pulled:** 2026-11-12 — rang: step 5 still listed Beauford and the note
## Test: a character is buried with its cards and what is pinned to it
**Purpose:** putting away a character takes everything that belongs to it
**Input:** Devreux, with its three Influence cards and a sticky pinned to its card
**Expected:** the burial holds Devreux, the three cards and the sticky
**Refs:** crc-Yards.md
**Code:** `src/rules/yards.test.ts`
**Alarm:** 3
**Fire alarm:** Leave pinned pieces out of a character's burial: the sticky pinned to Devreux stays behind
**Inject:** src/rules/yards.ts:burialOf
**Pulled:** 2026-11-12 — rang: the sticky pinned to Devreux was left out of the burial

## Test: a burial comes up under the pointer
**Purpose:** R120: a character by its pool, grabbed 30, 14 in, its card and pinned paper moved by the
same offset; anything else by its place, grabbed 20, 14 in; all on top
**Input:** Sam's burial raised to 1000, 800 at height 77; a sticky raised to 100, 50 at height 3;
nothing raised
**Expected:** Sam's pool at 970, 786, z 77, the card where it was against the pool, every placed
record moved alike at z 77; the sticky at 80, 36, z 3; nothing
**Refs:** crc-Yards.md
**Code:** `src/rules/yards.test.ts`
**Alarm:** 4
**Fire alarm:** Move only the lead: Sam's card stays where it was buried
**Inject:** src/rules/yards.ts:raised
**Pulled:** 2026-11-13 — rang: Sam's card stayed where it was buried
