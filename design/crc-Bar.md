# Bar
**Requirements:** R9, R18-20, R34, R35, R287, R288, R304, R305, R347, R408, R453, R498

The bar along the top: the wordmark, supplies, the people at the table, and the furniture at the
right end.

## Does
- refused(why) (R453): the image supply red, reading "storage full" for a QuotaExceededError or "not
  added", its tooltip why; refused(null) clears it, when an image is added.
- BarView (`src/ui/bar.ts`) draws the wordmark with the version and date, the paper supplies, the image supply (a
  hidden file input), the chip grid, the slot for the Opposition button and its tray (`oppo`, filled
  by TrayView, crc-Tray.md), and the slots for the people and "You are"; the register,
  Ledger and Boot Hill append themselves after.
- Supplies (`src/rules/supplies.ts`, pure): newCharacter (its maker's, its pool above its card,
  gathered, a blank card template), newSticky, newText ("Write here"), newHowTo, newChip, each with
  its middle at the pointer (R287); a sticky, a text and an image record their maker as `by` (R498). The page makes the record, marks it fresh with Drag (dropped back
  on the bar it is never made, R19), and carries it: a character by its pool (moved clear of the bar
  after the drop, its card sliding with it, R35), a chip as an item, the rest as pieces.
- look (R304): a walnut-dark strip 92 px high: the wordmark and its version and date (selectable), the
  paper supplies, the chips in a 4 × 2 grid (+1 smaller), the Opposition button, the people, "You are", then the register,
  the Ledger and Boot Hill at the right end.
- take (R287): a supply is made and lifted at the press, its middle under the pointer (Drag); loose
  text starts "Write here"; the image supply opens a file picker, the image landing in the middle of
  the view, several 24 px apart.
- over (R288): while anything is carried over the bar it turns red (`toss`); if it would be buried,
  "→ <current graveyard>" shows by the gravestone (`bury`). Plain chips, +1s and the reference card
  vanish; an Influence card goes home.
- supplies: character, sticky, loose text, image (a file picker), the "How to play the table"
  card, and chips 2, 4, 6 and +1 in each sign; each starts a Drag.
- the Connection Table's supply (R408), on the GM's bar alone, stacked under the "How to play" card
  (`refs`) so the bar keeps its width: taken while none is out, it makes the
  table (or brings back the put-away one) with a row kept for every named GM card; taken while it is
  out, it lifts that same table to the pointer.
- the people, the GM's invite and "You are" go in the slots BarView leaves for them: see
  crc-Folks.md.
- version and date (R305): under the wordmark, the version (`stamp version`), and under it the date
  (`stamp date`), left out when there is none; both from the build (HOLLOW_VERSION, HOLLOW_DATE).

## Collaborators
- Folks, Drag, Gesture

## Sequences
- seq-join.md
