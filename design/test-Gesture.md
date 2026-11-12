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
**Pulled:** 2026-11-12 — rang: the long press read shift, then click as well
