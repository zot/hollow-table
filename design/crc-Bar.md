# Bar
**Requirements:** R9, R19, R20, R34, R35, R288, R305, R347, R510, R577, R518, R529, R530, R532

The bar along the top: the wordmark, the desk with the paper supplies (crc-Desk.md), the chips, the
people at the table, and the furniture at the right end.

## Does
- refused(why): passed to the desk's image pigeonhole (Desk.refused, R517).
- BarView (`src/ui/bar.ts`) draws the wordmark with the version and date, the desk (DeskView, R529),
  the chip grid, the slot for the Opposition button and its tray (`oppo`, filled
  by TrayView, crc-Tray.md), and the slots for the people and "You are"; the register,
  Ledger and Boot Hill append themselves after.
- Supplies (`src/rules/supplies.ts`, pure): newCharacter (its maker's, its pool above its card,
  gathered, a blank card template), newSticky, newText ("Write here"), newHowTo, newChip, each with
  its middle at the pointer (R512); a sticky, a text and an image record their maker as `by` (R577). The page makes the record, marks it fresh with Drag (dropped back
  on the bar it is never made, R19), and carries it: a character by its pool (moved clear of the bar
  after the drop, its card sliding with it, R35), a chip as an item, the rest as pieces.
- look (R510): a walnut-dark strip 92 px high: the wordmark and its version and date (selectable), the
  desk, the chips in a 4 × 2 grid (+1 smaller), the Opposition button, the people, "You are", then the register,
  the Ledger and Boot Hill at the right end.
- take(what, down, mode) (R512-R514): a supply from the desk, made with its middle at the pointer
  (`press`: carried on the press; `loose`: carried with no button held, Drag) or just below the strip
  (`below`); a chip from the bar, made and lifted at the press. images(files, at, carry) (R515): the
  picked images land at `at` (the pointer), 24 px apart, one alone carried loose when `carry`.
- over (R288): while anything is carried over the bar it turns red (`toss`); if it would be buried,
  "→ <current graveyard>" shows by the gravestone (`bury`). Plain chips, +1s and the reference card
  vanish; an Influence card goes home.
- chips 2, 4, 6 and +1 in each sign, on the bar itself; each starts a Drag.
- the Connection Table's supply (R518), in the GM's desk alone: taken while none is out, it makes the
  table (or brings back the put-away one) with a row kept for every named GM card; taken while it is
  out, it lifts that same table to the pointer.
- the people, the GM's invite and "You are" go in the slots BarView leaves for them: see
  crc-Folks.md.
- version and date (R305): under the wordmark, the version (`stamp version`), and under it the date
  (`stamp date`), left out when there is none; both from the build (HOLLOW_VERSION, HOLLOW_DATE).
- newDocket(oid, at, by) (R532): a docket named "Docket" with its middle at `at`, recording its maker.

## Collaborators
- Folks, Drag, Gesture

## Sequences
- seq-join.md
