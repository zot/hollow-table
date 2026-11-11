# Influence

Hollow Folks *Tracking Influence*, *Tapping Resources* and *Influence Roll Up*, on the table.

## Chips

- Chips are green (positive) and red (negative), marked with their Influence points: **Min 2, Sig 4,
  Maj 6, Ext 8, Exq 10**, with no ceiling. **A red chip shows its sign** (−2, −4), so a chip reads
  correctly without telling red from green.
- A **+1** is the odd point. It rides on another chip ("put a small token on top of its stack");
  a +1 riding a chip belongs to that chip.
- Chips snap into pool slots as stacks. Positive chips stack from the top of a slot and negative
  from the bottom. Each stack sorts **strongest nearest the edge, drawn on top**, because only the
  strongest of each sign applies.
- **Click raises, shift-click lowers.** Clicking a chip raises it by 2; shift-click lowers it by 2.
- Clicking a pool's empty space adds a loose +1 (shift-click: −1). Clicking a +1 makes it a 2, then
  4, 6 and so on; shift-clicking a 2 makes it a +1; shift-clicking a +1 removes it. Clicking a +1
  rider does nothing; shift-clicking it removes it.
- **Roll Up:** three chips of one value and colour in a slot become the next Level, chaining
  (4, 4, then three 2s make 6). A chip carrying a +1 counts at its face value, and its +1 is spent
  on the Roll Up. Lowering can complete a Roll Up too.

## Influence cards

- **One object, two forms.** An Influence card lives in its pool's **drawer**. Dragged into a pool
  slot it shrinks to chip size with its value in the middle, its name on hover.
- **Never lost:** dropped anywhere that isn't a pool slot, it goes home to its drawer. Dropped on
  another pool's drawer, it moves to that character. The drawer's **kill box** is the only way to
  delete one.
- The drawer has buttons to write a new + or − card. A card in a drawer is raised by clicking its
  Level; cards stop at Min.
- **Roll Up groups cards and doesn't merge them.** Three equal cards form a **pile** showing the
  value they act as. Click the pile to open or close it; an open pile lists its members by name,
  and a member dragged out breaks the pile.

## Tapping Resources

- A small card **glyph** sits before each `<res>` Resource, each named `<bias>`, `<aff>` or `<inj>`
  line, and each checked Slot box (see *Card text* in `table.md`). The text stays handwriting; the
  table reads only the `Name +Level` inside the mark.
- **Dragging a glyph onto the table** makes an Influence card named after the Resource, born at Min
  (the drag spends the first Level), positioned with its glyph under the pointer. The card shows the
  same glyph before its name (resource-made). The Resource's text drops a Level in place (*Money
  +Maj* becomes *+Sig*).
- On a resource-made card, click moves a Level from the **current source** into the card;
  shift-click moves it back, only down to what that source put in (a per-card **ledger** per
  Resource).
- Dropping another Resource's glyph onto a resource-made card (on the table, in a pool, or in a
  drawer) moves a Level from it and makes it the current source. Merging across characters is
  allowed. **A Resource can't feed a plain Influence card.**
- Killing an unused tap refunds it. A tap may wait loose on the table, the one exception to "never
  lost".
- **Biases and Afflictions** recharge each Conflict. Mild and Min are 1 Level, Sig 2, Maj 3. A line
  shows the Levels spent (−2). **A box can't be checked until its line has a name.**

## After a roll

- A roll marks the Influence cards in the rolling character's pool **used** (dimmed, tagged).
  Resources can't feed used cards; click and shift-click still strengthen or weaken them.
- At the character's **next** roll, still-used cards are swept into the drawer's **used pile** first.
  Clicking one there puts it back for the next roll. Plain chips are untouched.
- A Resource dropped on a used card starts a **new** card beside it; the pool's strongest-applies
  display enforces non-stacking.

## Open

- What a card tapped from a **Mild** row is worth. Proposal: Min (2), vanishing at End.
