# Tray
**Requirements:** R347, R348, R349, R350

The Opposition button in the bar and the brass tray it slides out: the world's Total Influence, the
opposition of a roll aimed at no character.

## Knows
- open: whether the tray is out, this page only (not the game, not the seat).

## Does
- TrayView (`src/ui/tray.ts`) fills the bar's `oppo` slot: the button, a small brass plate reading
  "Opposition", and the tray under the bar. A click on the button slides the tray out or back.
- The GM's tray (R347): "The world" and a number field. Typing a whole number and leaving the field
  (or Enter) writes the `world` record through Game.change, `{set: true, total}`; a blank field
  writes `{set: false, total: 0}`; anything else goes back to what was there.
- A player's tray (R348): "The world" and "set by the GM" when `set`, else blank; never a number,
  since its page never holds one (Visibility).
- mark() (R349, R350): the element that stands for the world while aiming and aimed: the tray when
  out, else the button. RollRow puts the dashed box round it while the pointer is over the world,
  and the `targeted` ring on it while a row is aimed at the world.
- Redrawn on every Game change.

## Collaborators
- Game, Visibility, Bar, RollRow

## Sequences
- none
