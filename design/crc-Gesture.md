# Gesture
**Requirements:** R10, R14

One reading of the pointer for every control: a click, a "shift" click (shift, ctrl or alt held, or
a long press on touch), or the start of a drag.

## Knows
- LONG_MS: about 500 ms held without moving counts as a long press.
- DRAG_PX: 5 px of movement starts a drag.

## Does
- on(el, {click, shift, drag}): one listener per control. A long press fires `shift` and never
  also `click`; movement past DRAG_PX hands the pointer to Drag.
- Every control that reacts to shift-click is registered here, so none can lack its long press.

## Collaborators
- Drag

## Sequences
- seq-drag.md
