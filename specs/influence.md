# Influence

Hollow Folks *Tracking Influence*, *Tapping Resources* and *Influence Roll Up*, on the table.

## Chips

- Chips are green (positive) and red (negative), marked with their Influence points: **Min 2, Sig 4,
  Maj 6, Ext 8, Exq 10**, with no ceiling. **A red chip shows its sign** (−2, −4), so a chip reads
  correctly without telling red from green.
- A **+1** is the odd point. It rides on another chip ("put a small token on top of its stack");
  a +1 riding a chip belongs to that chip. **It reads +1** wherever it is, loose too (Bill, 11-12:
  it modifies another chip), and a red one −1.
- **A chip is a flat disc** (Bill, 11-12): one dark rim, its number bold in PT Mono in the middle,
  a little shade along the bottom. A card in a slot adds a thin white inner ring, and a
  resource-made one a tiny card glyph at its corner.
- Chips snap into pool slots as stacks. Positive chips stack from the top of a slot and negative
  from the bottom. Each stack sorts **strongest nearest the edge, drawn on top**, because only the
  strongest of each sign applies; each chip **tucks under** the stronger one before it, so a slot
  shows a stack of chips rather than a column.
- **Click raises, shift-click lowers.** Clicking a chip raises it by 2; shift-click lowers it by 2.
- Clicking a pool's empty space adds a loose +1 (shift-click: −1). Clicking a +1 makes it a 2, then
  4, 6 and so on; shift-clicking a 2 makes it a +1; shift-clicking a +1 removes it. Clicking a +1
  rider does nothing; shift-clicking it removes it.
- **Roll Up:** three chips of one value and colour in a slot become the next Level, chaining
  (4, 4, then three 2s make 6). A chip carrying a +1 counts at its face value, and its +1 is spent
  on the Roll Up. Lowering can complete a Roll Up too.

## Influence cards

- **One object, two forms.** An Influence card lives in its pool's **drawer**. Picked up, it stays
  a card in your hand, held where you took it; carried over a pool's slots it becomes a chip
  centred on the pointer, with its value in the middle and its name on hover, and a card again
  when it leaves them; dropped in a pool slot it stays a chip (Bill, 11-12).
- **Never lost:** dropped anywhere that isn't a pool slot, it goes home to its drawer. Dropped on
  another pool's drawer, it moves to that character. A card is deleted only on purpose: in the
  drawer's **kill box**, or by shift-clicking it at Min (Bill, 11-12).
- **A card in a drawer is a small white card** (Bill, 11-12) with a band down its left edge in its
  sign's colour, its name and Level in handwriting, and a resource-made card's glyph before its
  name. Cards wrap in the tray, so long names stack one to a row.
- The drawer's tools are **tiles**: a dashed + and − in their sign's colour to write a new card, the
  **used pile** as a tile with its count, and the **kill box** as a hatched tile.
- **A new card is written as "Influence" with its name selected**, so typing names it. It goes
  last in its drawer (Bill, 11-12).
- **Carrying a card over a drawer opens a gap where it would go** (Bill, 11-12): the other cards
  slide aside and the drawer grows to fit, the gap follows the card as it moves, and letting go
  puts the card there. A card that comes home any other way goes last.
- **A card's Level answers clicks wherever the card is** (Bill, 11-12): in its drawer, as a chip in a
  pool, or loose on the table. Click raises it; shift-click lowers it, and **shift-click at Min makes
  it disappear**, as the kill box would (an unused tap gives its Levels back).
- The used pile opens as a paper list under its tile; a used card in a pool is greyed, with a
  small "used" tag under it.
- A drawer its viewer may not read shows its cards face-down, as striped red backs that keep their
  number and size.
- **Roll Up groups cards and doesn't merge them.** Three equal cards form a **pile** showing the
  value they act as, drawn as a stack of discs in its colour. Click the pile to open or close it;
  an open pile lists its members beside it, each chip with its name, and a member dragged out
  breaks the pile.
- **A Roll Up pops:** a chip or pile it makes grows in from half again its size with a white ring,
  and a card's Level changing pops the same way.

## Tapping Resources

- A small card **glyph** sits before each `<res>` Resource, each `<mot>` Motivation, each named Damage slot, and each checked
  Slot box (see *Character card* and *Card text* in `table.md`). The text stays handwriting; the
  table reads only the `Name +Level` inside a `<res>` mark. A Damage slot's Level is its row's.
- **The glyph is a tiny card** (Bill, 11-12): white, an ink border and a hard offset shadow, yellow
  under the pointer; the same mark sits on a resource-made card. **A dry source's glyph fades**, with
  the not-allowed pointer, once it has no Levels left to tap.
- **A checked Slot box is a Resource of its own**, named after its slot and worth the slot's Level
  (Bill, 11-12).
- **Dragging a glyph onto the table** makes an Influence card named after the Resource, born at Min
  (the drag spends the first Level), made the moment the drag starts and carried with its glyph
  under the pointer. The card shows the same glyph before its name (resource-made). The
  Resource's text drops a Level in place (*Money +Maj* becomes *+Sig*).
- On a resource-made card, click moves a Level from the **current source** into the card;
  shift-click moves it back, only down to what that source put in (a per-card **ledger** per
  Resource); at Min, shift-click makes it disappear and every source gets its Levels back.
- Dropping another Resource's glyph onto a resource-made card (on the table, in a pool, or in a
  drawer) moves a Level from it and makes it the current source. Merging across characters is
  allowed. **A Resource can't feed a plain Influence card.**
- **A Damage Resource makes an Influence of its kind** (Hollow Folks *Damage Resources*): a card
  tapped from a Bias is a Bias Influence. It goes only into a Bias slot (dropped in any other slot,
  it goes home to its drawer), and only Biases feed it. Likewise Afflictions and Injuries. A `<res>`
  Resource can't feed a Damage card, nor a Damage Resource a card made from a `<res>`.
- **Anyone may tap any character's Damage Resources** into Influences for the current action; the
  GM decides what applies. Biases, Afflictions and Injuries may all apply to one action (Bill, 11-12).
- **Only your own Resources** (Bill, 11-12: "you definitely cannot use other people's Resources"):
  the table refuses a drag from a `<res>` glyph on a character its viewer doesn't own. The GM may,
  running the NPCs and working players' rolls. Resources pass between characters only by a
  successful Request (not yet).
- **A Motivation is a special Resource held only by NPCs** (Bunkum, *Mental Resources*), written as
  a `<mot>` mark: `Name +Level` or `Name −Level`. **Anyone may tap anyone's Motivations** (Bill,
  11-12), as the story allows. Tapping one makes a **Main Pool Influence** of its sign: the card
  goes only into a Main slot (dropped in any other slot, it goes home), and only Motivations feed
  it. Dropped into a Main slot, it joins that character's drawer, so a card made from an NPC's
  Motivation becomes the tapper's.
- **What a Motivation spends is temporary.** Its written Level stays, and the Levels left follow it
  in parentheses, as Bunkum writes an adjusted value: *Keep the Peace +Sig (+Min)*, or *(0)* when
  spent out. Motivations **recharge at the end of every scene** (Bill, 11-12), and the parentheses
  go.
- Killing an unused tap refunds it. A tap may wait loose on the table, the one exception to "never
  lost".
- **Biases, Afflictions and Injuries** recharge each Conflict. Mild and Min are 1 Level, Sig 2, Maj
  3. A slot shows the Levels spent (−2). **A box can't be checked until its slot has a name.**

## After a roll

- A roll marks the Influence cards in the rolling character's pool **used** (dimmed, tagged).
  Resources can't feed used cards; click and shift-click still strengthen or weaken them.
- At the character's **next** roll, still-used cards are swept into the drawer's **used pile** first.
  Clicking one there puts it back for the next roll. Plain chips are untouched.
- A Resource dropped on a used card starts a **new** card beside it; the pool's strongest-applies
  display enforces non-stacking.

## Open

- What a card tapped from a **Mild** slot is worth. Proposal: Min (2), vanishing at End.
