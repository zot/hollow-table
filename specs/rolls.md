# Rolls

The program does the arithmetic of a Hollow roll; the table sees the dice land.

## The roll row

- The roll row is the dice, with no labels: `[White ±] [Blue] [Yellow]… +bonus [type] [Roll]`. Roll
  is a key at the table, not a web button; the roll's type and the GM's private switch are tags to
  flip, not pills.
- **The type tag says what the roll is** (Bill, 11-13): *?*, *Skill*, *Create Influence*, *Phys
  Attack*, *Mental Attack*, *Psych Attack*, *Infer*, *Impress* or *Request*, the actions on the
  reference card plus plain Skill use, and *?* for not saying. Clicking it opens the list. The tag
  itself reads short, as the cards spell them (*Influence*, *Mental Atk*), so the dice keep their room. **The
  action's label preselects it** when it says (*Mental Atk* → Mental Attack, *Phys* or *Physical*
  with *Atk* or *Attack* → Phys Attack, *Infer*, *Impress*, *Req* or *Request*, *Influence*); a label
  that doesn't say (*Shoot*, a plain *Attack*) starts at *?*, unless you chose a type for that action
  on that card before, which your seat remembers. A preselected type is only a start: clicking the
  tag changes it.
- **The die button** by a pool's name: clicking the die of a pool you own **docks the roll row**
  there (in your view only). Clicking the die of the pool the row is already on **starts fresh**: no
  action, no opponent, White, one Yellow, +0. The row leaves a pool you stop owning. The GM can
  work any character's roll row without taking it.
- **White opens the Difference menu**: each row of the Difference table, words first and its dice
  at the right (Green or Red, ±1, or auto ✓ / ✗). Picking one sets the White die.
- Yellows: click adds, shift-click removes. Bonus: click raises, shift-click lowers (it shows −n
  below zero).
- **The roll row's look** (Bill, 11-12, as the mockup): it docks between the pool's header and its
  slots, a dark walnut strip as wide as the drawer. The dice are blank, 24 px, in their colors
  (White `#f6f6f2`, Green `#6aa84f`, Red `#cc4125`, Blue `#3d85c6`, Yellow `#f1c232`); Roll is a blue
  key at the right. With no Yellows a dashed yellow ghost die holds their place; a bonus of 0 shows
  a faint "+0". The parts you click light faintly under the pointer. In the pool's header the
  action reads in the hand font with its number bold (`Infer 4 → 8`), and `vs` in peach.
- **The private switch** reads "to table" or "private"; its title says who will see the roll.

## Actions

- An **action** is text marked `<act>` (see *Card text* in `table.md`). Inside the mark it reads
  `LABEL: N [stuff], [Nd][±N] [stuff]`: N is the **Base** Influence, `Nd` the Yellows, `±N` the
  bonus, exactly as written (`5, 2d+3` is Base 5, two Yellows, +3). The split is at the first comma
  **outside parentheses** (`Attack: 4 (Suasion, Charm), +1`). A typed line that fits this grammar
  is offered the Action pen.
- Each action gets a small **die** at its start, **drawn like the roll row's Blue die**: blank,
  blue, rounded and shaded (Bill, 11-13: the old one-pip face read as a "box with a dot"), so it
  can't be taken for a Slot box or a Resource glyph on the same card; the text stays editable, and actions marked later get
  dice too. **A label with alternatives split by `/` gets a die before each one** (Bill, 11-13):
  `Mental Atk / Req: 2, +2` has a die before *Mental Atk* and one before *Req*, and the die clicked
  names the action (*Mental Atk* or *Req*), with the same numbers, and preselects its type. Clicking it brings the roll row to that character (its owner, or the GM)
  and fills the Base, Yellows and bonus. **A new action starts the row at White** unless the row is
  aiming at someone (Bill, 11-12). The action in use gets a **highlighter swish** on its line;
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
- **An Attack is a roll whose type is an Attack**, and **its kind decides which Damage column
  takes it**. Aiming one goes straight at that Defend, with no chooser: a Mental Attack against
  Mental Defend, a Psych Attack against Psych Defend, and a Phys Attack against 0. **A roll typed *?*
  can't be aimed** (Bill, 11-13): aiming it is refused with a note, "Say what this roll is first",
  gone after about two seconds; it can still be rolled at nobody (for now: #13 gives every roll an opposition, the world included). A physical
  Attack rolls against 0 (Bill: "Physical is generally zero, unless there happens to be a relevant
  Skill"; fists can oppose fists, but a gun is "generally against nothing"). When a relevant Skill
  opposes, the GM adjusts the roll by hand. The type travels with the roll; an Attack's
  kind shows in the receipt's `vs` line (*vs Sam (physical 0)*).
- **Pointing at the opposing number** (Bill, 11-13: "the GM could point at the 6 or the 5 to remove
  all doubt"): the drag can end on a number on the target's card, and that number is the
  opposition's base. It can be a **Defend number** (the 2 or the 4 in `Defend: mental 2 / psych 4`,
  the 6 or the 5 in `6 / 5`, a single Defend's one number) or an **action's Base** (the 4 in `Shoot:
  4, +2`, for Skill against Skill). A number pointed at wins over the chooser and over an Attack's own
  Defend; an Attack's type still picks the Damage column. The `vs` line names it: *vs Sam (Shoot
  4)*, *vs Sam (psych 4)*. It holds until the next aim.
- **Pointing at a Field or a Skill** (Bill, 11-14): the drag can end on a `<fld>` line, or on one
  Skill of a `<skl>` line (one Skill of several in a `Skills N:` line), and the opposition's base is
  its Level (*Card text* in `table.md`) plus the target's attribute **the acting action uses** (Bill,
  11-14: "the opposition uses the same attribute as the acting character"). Only marked Fields and
  Skills can be pointed at. The `vs` line reads *vs Sam (Investigation 2 + Cha 2)*, or *vs Sam
  (Fighting 2)* for an action that uses none. An attribute the target's card doesn't list counts 0.
- **An action says its attribute in its parentheses** (Bill, 11-15), as words among its other notes,
  so it types from any keyboard: `(no att)` for none, as Shoot (`Shoot: 4, +2 (unfr, x2, no att)`),
  and `(Int)` for Int, as a knowledge Skill. An action that says neither uses Cha (Bill, 11-13:
  "generally Cha but in some cases Int or nothing is used").
- **A drop anywhere else on the target** (Bill, 11-14) — its pool, its card away from a number, or a
  card turned to its back — keeps the rule above: an Attack at its own Defend, other rolls through
  the chooser when the Defend has two numbers.
- **While dragging, a line runs from the action to the pointer** (Bill, 11-13), and the dashed amber
  box goes round the number, Field or Skill the drop would pick (Bill, 11-13: "show it around the attribute, skill,
  or number"), or round the pool when there's no number under the pointer.
- Their total is Defend (or what was pointed at) + Main + Edge + Bias + Affliction + Injury + **Stagger**. **The Difference picks the White row**,
  live on either side's pool changes, until the roller picks a row by hand (held until they point
  again).
- The current opponent is marked (an amber ring round their pool, ⌖ by their name). Clicking `vs`
  stops aiming.
- **Aiming feels like aiming** (Bill, 11-12, as the mockup): while dragging from the Base, the pool
  under the pointer gets a dashed amber outline (the solid ring only once aimed) and the pointing
  hand holds. The Defend chooser opens at the pointer with its first choice ready, and closes on
  Escape or a click elsewhere. "Only the GM can aim at …" goes after about two seconds.
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
  and the outcome. **Each character's rolls are numbered on their own** (Bill, 11-12): *Sam, roll 3*
  is Sam's third.
- **A receipt reads** (Bill, 11-12, as the mockup), in this order: the title (*Sam, roll 3*) and the
  time; "rolled by Dana"; the dice; the action's numbers (*Infer: Total Influence 8 (base 4)*); the
  opponent (*vs Sam (mental −2), Difference +10*); the row in the book's words (*+7 to +9 Strong Advantage: Green + 1*);
  *Resolution: higher of White 4 and Green 6 + 1*; and **the outcome with its Level and how it adds
  up** (Bill, 11-13): *Success +Maj: 6 + 4*, *Success at cost +Sig: 3 + 2*, or *Failure −Sig: 2 + 5*
  (the Stagger it causes), with the bonus in the sum as before (*6 + 4 + 1 bonus*). **Only an
  Attack reports its amount**, since only an Attack's Result is absorbed as Damage: *Success 10: 6 +
  4*; a failed Attack reads like any Failure. Each page
  leaves out what it may not know. The title can be edited. An error or a lost roll prints on your
  tape as a short red note with the time.
- **Receipt dice are dice**: 28 px, with their numbers, in their colors. An exploded Yellow has a
  dashed edge; a die removed on a Failure is faded with a stroke through it. They tumble in one after
  another. Each die's title names it (*Yellow, exploded*). The receipt is cream paper, about 300 px,
  in PT Mono, with a torn zigzag bottom.
- **Each page prints what its owner may know.** The roller's page shows their Total Influence and
  base, and `vs` as they're allowed to see it. Everyone else gets the **table view**: the character,
  the action, `vs` name, the dice, the resolution, the Level and the outcome, "rolled by Dana"; no
  Total Influence, base or Difference. The GM's tape gets everything.
- Your own receipt gets a ✓ when the roll has reached the table. A skipped roll number prints "N
  rolls from Dana didn't arrive" ("Many" over 20). A receipt is built from text, never from a
  sender's markup; a die outside 1–6 drops the roll.
- Receipts print on a **paper tape** from the register's slot, newest first, about three visible and
  the rest scrolling. The tape hangs under the register, 250 px wide and at most 380 tall; a new
  receipt slides in; rolled up, it leaves a sliver to pull it down by. **The tape is each page's own**: it never goes over the wire.
- The tape lies under the table's pieces. A new roll or a press raises it; pressing anything else
  lowers it. The register's paper roll rolls it up to a sliver and back.
- **Dragging the tape tears off the whole roll** as one strip onto the table, once the drag has gone
  a few pixels, landing slightly tilted (it scrolls inside; the wheel scrolls it, and zooms the table
  only at its ends). Pressing a receipt's title to edit it doesn't tear. The next roll starts a fresh tape. A torn roll is a table
  piece; dropped on the bar it buries as "Tape: N rolls".

## Taking an Attack

The rules are Hollow Folks, *Absorbing Damage*, with Bill's rulings of 11-13 (`carves/damage.md`,
Item 4). As at the table with pencil and paper, the target's owner chooses the Slots and the
attacker names them.

- **A successful Attack offers itself to its target.** On the tapes of the target's owner and the
  GM, the receipt of an Attack that succeeded (at cost or not) against a character carries **Take
  N**, where N is its Result. Nobody else's receipt has it, and once it is taken, it is gone.
- **Taking it turns the target's card to its back** at the Attack's column (Injuries for physical,
  Biases for mental, Afflictions for psychological) and lays out **every way the column can absorb
  it, as pages** to flip through: *‹ 2 of 5 ›*. The column's absorb comes off first. A page is a
  set of free Slots that covers what is left, with none to spare: drop any one and the rest fall
  short (Bill: "the player can choose any slots, as long as they account for the damage"). So a
  last point can take a Maj Slot when only a Maj is free, and two Mins or one Sig can both cover 3,
  which is the target's call ("smaller slots heal faster, so it's not a simple choice"). Each page
  shows its Slots as they would fill, and pages that fill the same Slots appear only once.
- **When no set of free Slots covers it, there is one page:** every free Slot fills, and the rest is
  **overflow**. The page says what it makes: a **Condition** for a physical Attack, a **Conviction**
  for a mental one, a **Burden** for a psychological one (Bill, 11-13; Conditions come from the
  unpublished Hollow physical injury rules). Until the card has a place for those
  (`carves/damage.md`, Item 6), the overflow is written in the card's Notes: *Conviction: 3 from
  Beauford's Attack*.
- **Accepting a page fills it:** a box is checked for each boxed Slot it uses, and each named Slot it
  uses waits for a name, drawn as an empty mark in its column with *Beauford names it*. The page
  can be turned back with Escape or a click elsewhere, and nothing has changed.
- **The attacker names each new named Slot** (Bill: "the attacker gets to name them (unless they're
  boxes)"), from their own receipt, which now reads *Name Devreux's Minor Bias*. The name goes into
  the slot through the GM's page, even when the attacker can't see the card. The GM can rename it,
  as with any card text; that is the GM's approval.

## The register

- A cash register in the bar keeps the **Round**: a pop-up tab with a bold number in a glass case,
  ▲ ▼ keys, and **End**. The Round runs from 0 to 99; when it changes, the tab drops and comes back
  up with the new number.
- **End** ends the Conflict. Pressing it raises an orange "End conflict?" tab; press again within 3 s
  to end it. End resets the Round to 0, recharges Biases, Afflictions and Injuries, empties the used piles
  (plain cards go home, tapped cards are spent and gone), clears "used", clears CRIT! Influences,
  and checkpoints the game first.
