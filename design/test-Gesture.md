# Test Design: Gesture
**Source:** crc-Gesture.md

## Test: one reading of the pointer
**Purpose:** a click, a shift-click and a drag are told apart the same way for every control
**Input:** on one control with all three handlers: a press and release; with shift; with alt; a
press held 500 ms; a press moved 4 px; one moved 5 px; Enter; shift+Space; another key
**Expected:** click, shift, shift, shift (the long press, and no click after it), click, drag;
Enter clicks and shift+Space shift-clicks, other keys nothing; the control is registered for the
quality floor until it stops listening
**Refs:** crc-Gesture.md, seq-drag.md
**Code:** `src/ui/gesture.test.ts`
**Alarm:** 1
**Fire alarm:** Let the release after a long press click too (drop the `fired` test): the long press reads shift then click
**Inject:** src/ui/gesture.ts:gesture
**Pulled:** 2026-11-23 — re-pulled after R481 (gesture changed): rang, the long press read shift, then click as well; restored clean *Earlier —* 2026-11-12 — rang: the long press read shift, then click as well
## Test: moves are paced to frames
**Purpose:** R215: however many moves arrive between frames, the thing in hand moves once, to the
latest target; the next move after a frame asks for another frame
**Input:** a fake schedule holding passes; `to` three targets, run the pass; `to` again, run; `to`
then `cancel`, run; `to` then `flush`, then run the stale pass
**Expected:** one pass scheduled and one apply, at the third target; a second pass and apply after
the next move; nothing applied after cancel; flush applies at once and the stale pass applies
nothing
**Refs:** crc-Gesture.md
**Code:** `src/ui/gesture.test.ts`
**Alarm:** 2
**Fire alarm:** Apply every move as it comes (call `apply` in `to`, as before pacing): three applies before the frame, not one
**Inject:** src/ui/gesture.ts:paced
**Pulled:** 2026-11-12 — rang: three moves before the pass applied three times, not once

## Test: a second finger takes a press that is not yet a drag
**Purpose:** R481: claim gives up a press that hasn't become a drag (no click, long press or drag after it) and says so; a drag already begun, or a pointer with no press, is not claimed
**Input:** a press claimed then released; one claimed then held past a long press; one claimed then moved far and released; a press moved 5 px then claimed; a claim of an unpressed pointer
**Expected:** nothing from the claimed presses; true for each claim of a press, false after the drag and for the unpressed pointer; the drag alone fires
**Refs:** crc-Gesture.md
**Code:** `src/ui/gesture.test.ts`
**Alarm:** 3
**Fire alarm:** Make claim say yes without giving the press up (skip the calls): the claimed press clicks
**Inject:** src/ui/gesture.ts:claim
**Pulled:** 2026-11-23 — rang: the claimed presses clicked, long-pressed and dragged; restored clean
