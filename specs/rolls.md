# Rolls

The program does the arithmetic of a Hollow roll; the table sees the dice land.

## The roll row

- The roll row is the dice, with no labels: `[White ±] [Blue] [Yellow]… +bonus [Roll]`. Roll is a
  key at the table, not a web button, and the GM's private switch is a tag to flip, not a pill.
- **The die button** by a pool's name: clicking the die of a pool you own **docks the roll row**
  there (in your view only). Clicking the die of the pool the row is already on **starts fresh**: no
  action, no opponent, White, one Yellow, +0. The row leaves a pool you stop owning. The GM can
  work any character's roll row without taking it.
- **White opens the Difference menu**: each row of the Difference table, words first and its dice
  at the right (Green or Red, ±1, or auto ✓ / ✗). Picking one sets the White die.
- Yellows: click adds, shift-click removes. Bonus: click raises, shift-click lowers (it shows −n
  below zero).

## Actions

- An **action** is text marked `<act>` (see *Card text* in `table.md`). Inside the mark it reads
  `LABEL: N [stuff], [Nd][±N] [stuff]`: N is the **Base** Influence, `Nd` the Yellows, `±N` the
  bonus, exactly as written (`5, 2d+3` is Base 5, two Yellows, +3). The split is at the first comma
  **outside parentheses** (`Attack: 4 (Suasion, Charm), +1`). A typed line that fits this grammar
  is offered the Action pen.
- Each action gets a small **die** at its start, shaped like a die so it can't be taken for a Slot
  box or a Resource glyph on the same card; the text stays editable, and actions marked later get
  dice too. Clicking it brings the roll row to that character (its owner, or the GM)
  and fills the Base, Yellows and bonus. The action in use gets a **highlighter swish** on its line;
  it moves with the choice, survives edits, and clears when the action does.
- The action and opponent show in the **pool's header**, after gather (`Attack 4 → 8`, `vs Sam 4
  (+0)`), and travel with the roll row. Clicking the Base clears the action.

## The numbers

- **Total Influence = Base + Main + Edge + Bias + Affliction + Injury**; Stagger counts only for
  the opposition. A character with both Biases and Afflictions suffers from both. The row
  shows it live (`Infer 4 → 8`, the breakdown on hover) and the receipt records it.
- **The Bonus pool feeds the Success Bonus**, not Total Influence. With an empty Bonus pool the card
  is taken as written (`2d+3` stays 2d+3). Once the pool adds points, the bonus total regroups: a
  Yellow per 3 full points, the rest added; a negative adds no dice. **Hand edits** to Yellows and
  bonus are kept as an adjustment on top until the next action.

## Pointing at an opponent

- Drag from the Base onto another character's pool or card. A chooser offers their Mental or Psych
  Defend, read from their card's `<def>` mark (`2`, `mental 2 / psych 4`, `6 / 5` meaning
  mental / psych); a single number needs no choice. Infer, Impress and Request roll against Defend.
- Their total is Defend + Main + Edge + Bias + Affliction + Injury + **Stagger**. **The Difference picks the White row**,
  live on either side's pool changes, until the roller picks a row by hand (held until they point
  again).
- The current opponent is marked (an amber ring round their pool, ⌖ by their name). Clicking `vs`
  stops aiming.
- **No probing:** players can't aim at characters hidden from them ("Only the GM can aim at
  Devreux."). The player picks the action, the GM points it.
- **The roll row is the rolling character's**, so its numbers follow that character's owner, not the
  viewer. If the owner can't see the opponent, the row shows `vs Devreux` and the White setting as
  dice only ("Red", "White − 1"), never the range, and the White menu is locked ("set by the GM").
  The GM's hover still shows the Difference. The GM's own NPC against a PC shows the numbers.

## Rolling

The rules are Hollow Folks, *IV. Dice & Resolution* (`HollowRpg/published/Hollow Folks.md`). Where
this section and the book disagree, the book wins and this section is wrong.

- Dice are White (Resolution), Green (Advantage), Red (Disadvantage), Blue (Result) and Yellow
  (Bonus) d6. The basic roll is White, Blue, and any Yellows.
- **The Difference table**: +10 or more, Outclass (automatic Success; the White is still rolled for a
  CRIT); +7 to +9, Green + 1; +5 to +6, Green; +3 to +4, +1; −2 to +2, White; −3 to −4, −1; −5 to −6,
  Red; −7 to −9, Red − 1; −10 or less, Outclassed (automatic Failure unless there is a CRIT).
- **Resolution:** with Green take the higher of White and Green, with Red the lower of White and Red;
  then add the row's ±1. 1–2 is a Failure, 3 a Success at a cost, 4 or more a Success, unless the row
  is automatic.
- **Level:** on a Failure the Yellows are removed. Every 6 on the Blue or a remaining Yellow adds
  another Yellow, chaining. The result is the Blue and Yellows added together, plus the bonus on a
  Success (even at cost); **the bonus is ignored on a Failure**, whose result is the Stagger it
  causes. A negative bonus reduces the result, but not below zero; a zero result succeeds with no
  noticeable effect. The result's Level: Minor from 1, Significant from 5, Major from 10, Extreme from
  15, Exquisite from 20.
- **CRIT!** White showing 6 and Blue showing 5 or 6 is a CRIT: always a Success, even against an
  automatic Failure. After exploding, the player chooses to **maximize** the Result and Bonus dice or
  **double** the current result. Both include the bonus (Bill, 11-11): maximize sets every Result and
  Bonus die to 6 and adds the bonus; double doubles the total, bonus and all. The character gains a **CRIT! +Min** Influence (the book says until
  the end of the Scene; at this table, until End), or strengthens the one they have by a Level.
- **Choosing on a CRIT (Bill, 11-11).** The roll takes whichever of maximize and double gives the
  **larger result**, so nobody waits on a choice. The receipt prints both results, with the larger
  chosen. The rolling character's owner or the GM may switch to the other and **lock in** the
  result, shown as a **punch** through the chosen line, like a conductor's ticket punch; the other
  line goes. Every tape shows the result as it stands. Until it is locked, the larger result holds.
- **The CRIT! Influence** appears as an Influence card in the character's **drawer** (Bill, 11-11);
  the player puts it in Main or Bonus as they choose. A second CRIT strengthens that card by a Level.
  **End clears CRIT! Influences** (Bill, 11-11), wherever they are.
- **Rolls go through the GM's page.** The GM's page holds everything, controls the algorithm and the
  results, and its build is the rulebook. A player's Roll sends a request that names things, never
  numbers (the character, the action, the opponent, hand adjustments, a hand-picked row). The GM's
  page looks the numbers up itself, picks the White row unless the player chose it, and rolls. It
  refuses a character the player doesn't own, saying why.
- While waiting, Roll shows "GM…", for 10 s at most ("The GM's page didn't answer that roll"). With
  no GM at the table, nobody can roll. A page with no table rolls for itself.
- **Private** is the GM's own switch (to table / private). A private roll prints "Private: not shown
  to the table" on the GM's tape and sends nothing.

## Receipts and the tape

- Every roll prints a **receipt**: the character and roll number, the date and time at the upper
  right (24-hour with seconds, "Nov 9, 17:57:16"), the dice, how the result was resolved, the Level,
  and the outcome.
- **Each page prints what its owner may know.** The roller's page shows their Total Influence and
  base, and `vs` as they're allowed to see it. Everyone else gets the **table view**: the character,
  the action, `vs` name, the dice, the resolution, the Level and the outcome, "rolled by Dana"; no
  Total Influence, base or Difference. The GM's tape gets everything.
- Your own receipt gets a ✓ when the roll has reached the table. A skipped roll number prints "N
  rolls from Dana didn't arrive" ("Many" over 20). A receipt is built from text, never from a
  sender's markup; a die outside 1–6 drops the roll.
- Receipts print on a **paper tape** from the register's slot, newest first, about three visible and
  the rest scrolling. **The tape is each page's own**: it never goes over the wire.
- The tape lies under the table's pieces. A new roll or a press raises it; pressing anything else
  lowers it. The register's paper roll rolls it up to a sliver and back.
- **Dragging the tape tears off the whole roll** as one strip onto the table (it scrolls inside; the
  wheel scrolls it instead of zooming). The next roll starts a fresh tape. A torn roll is a table
  piece; dropped on the bar it buries as "Tape: N rolls".

## The register

- A cash register in the bar keeps the **Round**: a pop-up tab with a bold number in a glass case,
  ▲ ▼ keys, and **End**.
- **End** ends the Conflict. Pressing it raises an orange "End conflict?" tab; press again within 3 s
  to end it. End resets the Round to 0, recharges Biases and Afflictions, empties the used piles
  (plain cards go home, tapped cards are spent and gone), clears "used", clears CRIT! Influences,
  and checkpoints the game first.
