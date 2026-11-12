# Requirements

## Feature: the table
**Source:** specs/table.md

- **R1:** Cards, stickies, pools and chips are drawn as the printed components, in the print's colours: card white with a grey border, sticky `#FFF200` with a folded corner, chips `#93C47D` and `#E06666`, pool slots `#CFE2F3`, Stagger `#F4CCCC`, Bias red, Affliction dark violet, Injury a bandage tan.
- **R2:** The table surface is oiled walnut with a faint grain.
- **R3:** Caveat sets everything handwritten; PT Mono sets reference cards and chrome; Sancreek sets the wordmark only.
- **R4:** Motion happens only in answer to a person's action (lift shadow while dragging, a flip, dice); there is no ambient animation.
- **R5:** Paper is tilted slightly at random and squares up while it holds the text cursor.
- **R219:** Paper being written on comes to the top while it holds the cursor, so nothing covers it or its pens.
- **R6:** Pool slot labels use the print's mat lettering or PT Mono, in sentence case; no system sans serif and no all-caps labels.
- **R7:** Every control is a thing at the table (key, tag, tab, glyph, book page); there are no web buttons, pills, dropdowns or floating panels.
- **R8:** A panel opens as the object it belongs to.
- **R9:** Instructions live on a "How to play the table" reference card in the supplies, not in permanent chrome.
- **R10:** Controls that do different things have different shapes.
- **R11:** Where colour carries meaning, a sign or a word carries it too.
- **R12:** Every control shows visible keyboard focus.
- **R13:** Animation respects the reduced-motion preference.
- **R14:** Every shift-click action has a long-press equivalent.
- **R15:** The table fills the window; dragging empty table pans and the wheel zooms.
- **R270:** The wheel zooms about the pointer by `exp(-deltaY × 0.0012)` a step, from 0.25 to 2.5 times.
- **R271:** A first visit (no view kept in the Seat) fits everything on the table into the window, centred, at most full size; after that the view is the Seat's, and a resize keeps it.
- **R16:** A click on a pool's empty space beside its name passes through to the table.
- **R17:** Labels, slot rows, drawer tools, the roll row, the register and the bar don't select as text.
- **R215:** Dragging, panning and zooming follow the pointer at most once a frame: a move sets where the thing in hand is headed, and the next frame (or 100 ms in a hidden tab) puts it there.
- **R216:** A piece in hand stays glued to the pointer where it was taken hold of, at any zoom, with no lag or easing.
- **R217:** A piece let go is exactly where it was shown; it doesn't slide there from where it started.
- **R220:** What is carried is the piece itself, never a copy: lifted, it squares up, grows slightly and rides above everything, bringing what follows it.
- **R221:** Things that aim (Resource glyphs, checked boxes, chips, Influence cards, slots) take the pointing hand, its fingertip the hotspot, for the whole drag of a chip, card or tap and while aiming; paper, pools and the table take the open hand, closed while panning.
- **R222:** While something is carried, the place it would land lights up (a slot, the chip a +1 would ride, the card a sticky would pin to, a drawer); over the bar it says whether letting go puts it away or buries it.
- **R223:** Picking something up leaves any writing and clears the text selection.
- **R18:** The bar runs along the top and holds supplies: character, sticky, loose text, image, the "How to play the table" card, and chips 2, 4, 6 and +1 in each colour.
- **R19:** Dragging a supply onto the table makes one; dropping it back on the bar makes nothing.
- **R20:** The bar shows the people at the table, and the register, the Ledger and Boot Hill at its right end.
- **R286:** The bar is a walnut-dark strip 92 px high; left to right: the wordmark with its build stamp (the bar's one selectable text), the paper supplies (a stacked white card, a yellow note, "Aa", an image), the chips 2, 4, 6 and +1 of each colour in two rows (+1 smaller), the people, "You are", then the register, the Ledger and Boot Hill.
- **R287:** A supply is made and in hand the moment it's pressed, its middle under the pointer; loose text starts "Write here"; the image supply opens a file picker and the image lands in the middle of the view, several a step apart.
- **R288:** Anything carried over the bar turns it red; if letting go would bury it, "→" and the current graveyard's name show by the gravestone; plain chips, +1s and the reference card vanish there, and an Influence card goes home.
- **R21:** Dropping a piece on the bar puts it away: characters, stickies, loose text, images and torn rolls are buried on Boot Hill, plain chips vanish, and Influence cards go home to their drawer.
- **R22:** A character card has two faces, is edited in place, and flips at the corner.
- **R252:** A card lies flat, showing one face at a time, so its text stays sharp at rest and while written on; it turns over by narrowing to its edge and widening on its other face, instantly under reduced motion.
- **R23:** A character card's front holds name and Rank, `Cha Int Wis`, Fields and Skills, and a right column of actions, Defend, Sparked/Grains and Resources; its back holds three Damage columns, Biases, Afflictions and Injuries, each with a Mild, Min, Sig and Maj slot and a box per extra Slot of that Level, and ruled Notes lines.
- **R24:** Slot boxes on a card toggle.
- **R25:** Stickies and loose text are handwritten and edited in place.
- **R26:** An image is added from the image supply through a file picker, belongs to the game, and survives a reload.
- **R272:** Image files dropped from the desktop onto the table become images where they were dropped, each a step of 24 apart.
- **R27:** Stickies, text and images can pin to a card and travel with it.
- **R273:** Pinned paper is always drawn on its card, and rises with it while the card is carried or written on.
- **R28:** Each party in a Contest, NPCs included, has a pool with Bonus, Main, Edge, Stagger (opposition only), Bias, Affliction and Injury slots in that order, the character's name, a die button, and a drawer of Influence cards below.
- **R227:** The pool mat is a white frame round tall rounded slots with a dark hairline edge, each named in its middle in PT Mono, sentence case; Stagger is wider, with "opposition only" under its name.
- **R229:** The drawer is a tray inside the mat under the slots, its cards on the left and its tools on the right.
- **~~R242:~~** (Retired T4 — see R244) While a pool's slots widen for a carried chip or card, its drawer keeps its width, so the drawer's tools don't move while you aim for them.
- **R241:** When a drawer grows, any piece the mat would now cover slides down just clear of it (a card with what's pinned to it, a pool with its gathered card) and stays there when it shrinks; the GM's page makes the move.
- **~~R29:~~** (Retired T1 — see R228) An empty slot narrows to a 1em strip showing the first letter of its name, with the full name on hover; a slot holding anything is full width.
- **R228:** A pool keeps its drawer's width: slots open at full width from the left as many as fit, a slot holding anything always open, and the rest stand as 1em strips showing their first letter (full name on hover), packed against the right edge, so the slots fill the mat with no gap.
- **~~R30:~~** (Retired T3 — see R244) When a chip or Influence card is carried near a pool, that pool's slots widen before the pointer reaches them, anchored at the pool's left edge; only that pool widens, and it narrows again if the drop goes elsewhere.
- **R244:** A chip or card carried over a pool's slots opens the strip under it, and a slot closes to pay for it so the mat keeps its width: the slot it came from if that is now empty, otherwise the first empty open slot left of where it came from (or of the strip, from elsewhere); slots holding anything never close, and with none to close the mat grows by that one slot, its drawer keeping its width. The strip stays open until another strip is reached or the carry leaves the slots; nothing changes before it reaches them.
- **R31:** Clicking or tapping a narrowed slot widens it until the next click elsewhere.
- **R32:** Dragging a pool brings its character card; dragging the card moves it alone and ungathers it.
- **R251:** A pool is carried by a drag from its name, its frame and slots, or its drawer; a chip or card there carries itself instead, and only the empty space beside the name passes through to the table. The pool and its card (with what is pinned to it) move by the same offset, gathered or not.
- **R33:** A gathered card stays snapped under its drawer as the drawer grows or shrinks; Gather snaps it back; the starting scene is gathered.
- **R34:** Dropping the character supply makes a card with its pool popped out above it, linked and gathered, owned by its maker (GM-owned when the GM makes it).
- **R35:** A new pool never pops out under the bar; with no room above, the card slides down under it.
- **R202:** Something waiting to be filled in shrinks to its name and opens when reached for.
- **~~R203:~~** (Retired T5 — see R253) An empty column on a card's back (nothing written, no box checked) collapses to its name; clicking anywhere in it opens it, and left empty it closes at the next click elsewhere.
- **R253:** An empty column on a card's back (nothing written, no box checked) collapses to its name. Clicking a column's name brings it to the front: it opens, the columns rotate so it is leftmost with the others following in turn, and the other empty columns collapse; it stays open until another is brought forward, and a column with something in it is always open. The order is each viewer's own (kept in their Seat), never sent to other pages.
- **R254:** An open column's name sits over its blanks, past its boxes and Level words, on one line.
- **R255:** Ruled lines (the back's notes) are one screen pixel wide at any zoom and stay smooth on tilted paper. Writing that scrolls past the bottom keeps its lines under it.
- **R256:** A Damage column's blanks are the same length whichever column is open: each collapsed column takes the room of the longest name, and open columns share the rest evenly.
- **~~R204:~~** (Retired T6 — see R257) Text on cards, stickies and loose writing carries only the marks `<act>`, `<res>`, `<inf>`, `<def>` and `<head>`, with no attributes and no presentational formatting.
- **~~R257:~~** (Retired T8 — see R266) Text on cards, stickies and loose writing carries only the marks `<act>`, `<res>`, `<mot>`, `<inf>`, `<def>` and `<head>`, with no attributes and no presentational formatting.
- **R266:** Text on cards, stickies and loose writing carries only the marks `<act>`, `<res>`, `<mot>`, `<att>`, `<inf>`, `<def>` and `<head>`, with no attributes and no presentational formatting.
- **R267:** An `<att>` mark holds a character's attributes as `Name N` pairs (`Cha 2  Int 2  Wis 4`); its pen is offered for a plain line of two or more such pairs.
- **R209:** A Damage slot's entry is stored as a plain name; its column makes it a Bias, Affliction or Injury, and the table draws it as a `<bias>`, `<aff>` or `<inj>` mark. Those tags written in text are plain text.
- **R213:** A slot's boxes sit in front of its Level word.
- **~~R214:~~** (Retired T7 — see R264) Each Damage column's heading carries its absorb, the Result absorbed from each Attack before any Slot fills; it is edited on the back and shown only when it isn't 0.
- **R264:** Each Damage column's heading carries its absorb, worked out from the card's attributes (Wis for Biases and Afflictions, Con for Injuries; 1 from 5, 2 from 10, 3 from 15) and shown only when it isn't 0; it is never typed.
- **R265:** A Damage column's extra Slot boxes follow the same attribute (Min +1 from 1, +2 from 3; Sig +1 from 7, +2 from 15; Mild +1 from 9, +2 from 11); a box checked beyond the count stays until unchecked; a card with no attribute marked for the column keeps the boxes it has.
- **R205:** Game meaning is read only from marks, never inferred from plain text.
- **R206:** Text is marked with highlighter pens, one per mark; a pen on marked text unmarks it.
- **R207:** A plain line matching a mark's grammar is offered that mark's pen.
- **R208:** Anything in text other than a known mark is shown as plain text and kept exactly as written, including text from another page.
- **R245:** A mark's highlight shows only while its paper is being written on (pens out); at rest a marked card reads as printed, its glyphs and dice the cues.
- **R246:** An `act` or `def` mark's label, up to its first colon, is drawn bold; a heading is 18 px bold, and a heading on a card's first line, its name, 21 px.
- **R247:** The Resource pen at a bare caret on a plain line whose comma-separated entries each read `Name +Level` marks each entry as its own Resource, the commas left plain.
- **R258:** A `<mot>` mark is a Motivation, `Name ±Level`, with a tap glyph; its pen is offered for a plain `Name ±Level` line under a Motivations heading, and at a bare caret marks each comma-separated `Name ±Level` entry as its own Motivation.
- **R248:** A sticky is the supply's note or a big sticky, 330 by 300, for the GM's long notes; the record keeps which.

## Feature: Influence
**Source:** specs/influence.md

- **R36:** Chips are green (positive) or red (negative) and show their Influence points (Min 2, Sig 4, Maj 6, Ext 8, Exq 10) with no ceiling.
- **R37:** A red chip shows its sign.
- **R38:** A +1 riding a chip belongs to that chip.
- **R285:** A +1 chip reads "+1" (a red one "−1") wherever it is, loose or in hand, since it modifies another chip; other chips show their points, a red one with its sign.
- **R39:** Chips snap into slots as stacks, positive from the top and negative from the bottom, each sorted strongest nearest the edge and drawn on top.
- **R234:** A chip is a flat disc with one dark rim, its number bold in PT Mono in the middle and a little shade along the bottom; a card in a slot adds a thin white inner ring, a resource-made one a tiny card glyph at its corner.
- **R235:** In a slot's stack each chip tucks under the stronger one before it.
- **R40:** Clicking a chip raises it by 2; shift-clicking lowers it by 2.
- **R41:** Clicking a pool's empty slot space adds a loose +1; shift-click adds −1.
- **R42:** Clicking a +1 makes a 2; shift-clicking a 2 makes a +1; shift-clicking a +1 removes it.
- **R43:** Clicking a +1 rider does nothing; shift-clicking it removes it.
- **R44:** Three chips of one value and colour in a slot Roll Up into the next Level, chaining.
- **R45:** A chip carrying a +1 counts at face value in a Roll Up, and its +1 is spent.
- **R46:** Lowering a chip can complete a Roll Up.
- **R47:** An Influence card lives in its pool's drawer and shrinks to a chip showing its value (name on hover) in a pool slot.
- **R230:** A card in a drawer is a small white card with a band down its left edge in its sign's colour, its name and Level in handwriting, a resource-made card's glyph before its name; cards wrap in the tray.
- **~~R224:~~** (Retired T2 — see R243) An Influence card picked up from a drawer or the table becomes a chip in hand, centred on the pointer, its value in the middle and its name on hover (Bill, 11-12).
- **R243:** An Influence card picked up stays a card in hand, held where it was taken; over a pool's slots it becomes a chip centred on the pointer, and a card again when it leaves them.
- **R48:** An Influence card dropped anywhere but a pool slot goes home to its drawer; dropped on another pool's drawer, it moves to that character.
- **~~R49:~~** (Retired T9 — see R268) A drawer's kill box is the only way to delete an Influence card.
- **R268:** An Influence card is deleted only in a drawer's kill box or by shift-clicking it at Min; either way an unused tap gives its sources their Levels back.
- **R50:** A drawer has buttons to write a new + or − card.
- **R231:** The drawer's tools are tiles: a dashed + and − in their sign's colour, the used pile as a tile with its count, the kill box as a hatched tile.
- **R232:** A new card is written as "Influence" with its name selected, so typing names it.
- **R239:** A new card goes last in its drawer; a card that comes home without a place chosen goes last too.
- **R240:** Carrying a card over a drawer opens a gap where it would go, the other cards sliding aside and the drawer growing to fit; the gap follows the card, and letting go puts it there.
- **~~R51:~~** (Retired T10 — see R269) Clicking a drawer card's Level raises it; cards stop at Min when lowered.
- **R269:** A card's Level answers clicks wherever the card is (its drawer, a pool slot as a chip, loose on the table): click raises it, shift-click lowers it, and at Min shift-click deletes it.
- **R52:** Three equal Influence cards in a slot form a pile showing the value they act as, without merging.
- **R53:** Clicking a pile opens or closes it; an open pile lists its members by name; dragging a member out breaks the pile.
- **R236:** A pile is drawn as a stack of discs in its colour; open, it lists its members beside it, each chip with its name.
- **R237:** A chip or pile made by a Roll Up, and a card whose Level changes, pops: it grows in from half again its size with a white ring.
- **R54:** A tap glyph sits before each `<res>` mark, each named Damage slot, and each checked Slot box; only `Name +Level` inside a `<res>` mark is read, and a Damage slot's Level is its row's.
- **R249:** A tap glyph is a tiny card: white, an ink border and a hard offset shadow, yellow under the pointer; a resource-made card carries the same mark.
- **R250:** A source with no Levels left to tap shows its glyph faded, with the not-allowed pointer.
- **R55:** Dragging a glyph onto the table makes an Influence card named after the Resource, born at Min with the glyph under the pointer, marked resource-made, and drops the Resource's written Level by one.
- **R225:** A tap's card is made the moment the drag starts, its Level already spent, and carried with its glyph under the pointer.
- **R56:** On a resource-made card, click moves a Level from the current source; shift-click moves one back, never below what that source put in (a per-source ledger).
- **R57:** Dropping another Resource's glyph on a resource-made card anywhere (table, pool, drawer) moves a Level from it and makes it the current source; this works across characters.
- **R58:** A Resource can't feed a plain Influence card.
- **R59:** Killing an unused tap refunds it.
- **R60:** A tap may wait loose on the table without going home.
- **R61:** Bias, Affliction and Injury slots are worth Mild and Min 1 Level, Sig 2, Maj 3; a slot shows the Levels spent.
- **R62:** A Slot box can't be checked until its slot has a name.
- **R210:** A checked Slot box is a Resource of its own, named after its slot and worth the slot's Level.
- **R211:** A card tapped from a Damage Resource is an Influence of its kind: it goes only into its kind's pool slot (dropped in another slot, it goes home to its drawer) and only Resources of its kind feed it; a `<res>` Resource can't feed a Damage card, nor a Damage Resource a card made from a `<res>`.
- **R212:** Anyone may tap any character's Damage Resources; Biases, Afflictions and Injuries may all apply to one action.
- **R259:** Only a character's owner or the GM may tap its `<res>` Resources; the table refuses anyone else's drag from the glyph. Anyone may tap any character's Motivations.
- **R260:** A card tapped from a Motivation is a Main Pool Influence of the Motivation's sign: it goes only into a Main slot (dropped in another slot, it goes home), only Motivations feed it, and dropped into a Main slot it joins that character's drawer.
- **R261:** Spending a Motivation is temporary: its written Level stays and the Levels left follow it in parentheses (`Keep the Peace +Sig (+Min)`, `(0)` when spent out); a refund back to full removes them.
- **R262:** Motivations recharge at the end of every scene, their parentheses removed.
- **R263:** While a card is written on, a Damage entry shows its colour only once it has a name; an empty slot stays a blank line.
- **R63:** A roll marks the Influence cards in the rolling character's pool used (dimmed, tagged); Resources can't feed used cards, and click and shift-click still change them.
- **R64:** At a character's next roll, still-used cards are swept into the drawer's used pile first; clicking one there puts it back.
- **R233:** The used pile opens as a paper list under its tile; a used card in a pool is greyed, with a small "used" tag under it.
- **R238:** A drawer its viewer may not read shows its cards face-down as striped red backs that keep their number and size.
- **R65:** Plain chips are never marked used.
- **R66:** A Resource dropped on a used card starts a new card beside it.

## Feature: rolls
**Source:** specs/rolls.md

- **R67:** The roll row is the dice with no labels: White, Blue, Yellows, bonus, and Roll; Roll is a key and the GM's private switch a tag.
- **R68:** Clicking the die of a pool you own docks the roll row there, in your view only.
- **R69:** Clicking the die of the pool the row is on starts fresh: no action, no opponent, White, one Yellow, +0.
- **R70:** The roll row leaves a pool its viewer stops owning.
- **R71:** The GM can dock and work any character's roll row without taking the character.
- **R72:** The White die opens the Difference menu, each row with its words first and its dice at the right; picking one sets the row.
- **R73:** Yellows: click adds, shift-click removes; bonus: click raises, shift-click lowers, showing −n below zero.
- **R274:** The roll row docks between the pool's header and its slots, a dark walnut strip the drawer's width: blank 24 px dice in their colours (White `#f6f6f2`, Green `#6aa84f`, Red `#cc4125`, Blue `#3d85c6`, Yellow `#f1c232`), Roll a blue key at the right, a dashed yellow ghost die for no Yellows, a faint "+0" for no bonus, the clickable parts lit faintly under the pointer; in the header the action in the hand font with its number bold, `vs` in peach.
- **R275:** The GM's private switch reads "to table" or "private", its title saying who will see the roll.
- **R74:** Text marked `<act>` reads `LABEL: N [stuff], [Nd][±N] [stuff]`, giving Base N, Yellows `Nd` and bonus `±N` as written, split at the first comma outside parentheses.
- **R75:** Each `<act>` mark, including ones marked later, gets a small die-shaped button at its start, and its text stays editable.
- **R76:** Clicking an action's die brings the roll row to that character (owner or GM) and fills Base, Yellows and bonus.
- **R276:** A new action starts the row at White unless the row is aiming at someone.
- **R77:** The action in use gets a highlighter swish that follows the choice, survives edits, and clears with the action.
- **R78:** The action and opponent show in the pool's header after Gather and travel with the roll row; clicking the Base clears the action.
- **R79:** Total Influence is Base + Main + Edge + Bias + Affliction + Injury; the row shows it live with the breakdown on hover, and the receipt records it.
- **R80:** The Bonus pool feeds the Success Bonus, not Total Influence; with an empty Bonus pool the action is taken as written.
- **R81:** Once the Bonus pool adds points, the bonus total regroups to a Yellow per 3 full points with the rest added; a negative adds no dice.
- **R82:** Hand edits to Yellows and bonus are kept as an adjustment until the next action.
- **R83:** Dragging from the Base onto another character's pool or card aims at them; a chooser offers Mental or Psych Defend from their `<def>` mark, and a single number needs no choice.
- **R84:** The opponent's total is Defend + Main + Edge + Bias + Affliction + Injury + Stagger.
- **R85:** The Difference picks the White row live as either side's pools change, until the roller picks a row by hand, which holds until they aim again.
- **R86:** The current opponent is marked with an amber ring and ⌖; clicking `vs` stops aiming.
- **R87:** A player can't aim at a character hidden from them and is told "Only the GM can aim at" that character.
- **R88:** The roll row's numbers follow the rolling character's owner: if the owner can't see the opponent, the row shows `vs` name and the White setting as dice only, and the White menu is locked ("set by the GM"); the GM's hover still shows the Difference.
- **R277:** While dragging from the Base, the pool under the pointer has a dashed amber outline and the pointing hand holds; the Defend chooser opens at the pointer with its first choice focused and closes on Escape or a click elsewhere; "Only the GM can aim at …" goes after about 2 s.
- **R89:** Dice are White, Green, Red, Blue and Yellow d6; the basic roll is White, Blue and the Yellows.
- **R90:** The Difference table maps +10 or more to Outclass, +7..+9 Green + 1, +5..+6 Green, +3..+4 +1, −2..+2 White, −3..−4 −1, −5..−6 Red, −7..−9 Red − 1, −10 or less Outclassed.
- **R91:** Resolution takes the higher of White and Green, or the lower of White and Red, then adds the row's ±1; 1–2 is Failure, 3 Success at a cost, 4+ Success; Outclass and Outclassed are automatic.
- **R92:** On a Failure the Yellows are removed; every 6 on the Blue or a remaining Yellow adds a Yellow, chaining.
- **R93:** The result is Blue + Yellows, plus the bonus on a Success; the bonus is ignored on a Failure; a negative bonus can't take it below zero.
- **R94:** The result's Level is Minor from 1, Significant from 5, Major from 10, Extreme from 15, Exquisite from 20.
- **R95:** White 6 with Blue 5 or 6 is a CRIT, always a Success, even against Outclassed.
- **R96:** A CRIT takes whichever of maximize (Result and Bonus dice at their maximum) and double gives the larger result.
- **R97:** A CRIT receipt prints both results with the larger chosen; the owner or the GM may switch and lock in, shown as a punch through the chosen line, after which the other line goes; every tape shows the result as it stands.
- **R98:** A CRIT gives the character a CRIT! +Min Influence card in its drawer, or strengthens the one it has by a Level.
- **R99:** End clears CRIT! Influences wherever they are.
- **R100:** A player's roll goes to the GM's page as a request naming the character, action, opponent, hand adjustments and any hand-picked row, never numbers.
- **R101:** The GM's page looks up the numbers itself, picks the White row unless the player chose one, rolls, and refuses a character the player doesn't own, saying why.
- **R102:** While waiting, Roll shows "GM…" for at most 10 s, then "The GM's page didn't answer that roll".
- **R103:** With no GM at the table, nobody can roll; a page with no table rolls for itself.
- **R104:** The GM's private switch makes a roll print "Private: not shown to the table" on the GM's tape and send nothing.
- **R105:** A receipt shows the character and roll number, the time at the upper right (24-hour with seconds), the dice, the resolution, the Level and the outcome.
- **R278:** Each character's rolls are numbered on their own ("Sam, roll 3" is Sam's third).
- **R279:** A receipt reads, in order: the title ("Sam, roll 3") and time; "rolled by …"; the dice; "<action>: Total Influence T (base B)"; "vs <name> (<kind> <total>), Difference ±D"; the row in its words; "Resolution: …" naming the dice ("higher of White 4 and Green 6 + 1"); "Level: …" adding them ("3 + 6 + 2 + 1 bonus"); and the outcome ("Success 12, Major", "Success at cost 5, Significant", "Failure 3, Minor Stagger"); each page leaving out what it may not know. Its title can be edited.
- **R280:** Receipt dice are drawn as dice, 28 px with their numbers in their colours: an exploded Yellow dashed, a die removed on a Failure faded and struck through; they tumble in one after another; each titled with its colour and fate. The receipt is cream paper about 300 px wide in PT Mono with a torn zigzag bottom.
- **R281:** An error or a lost roll prints on your tape as a short red note with the time.
- **R106:** The roller's page shows their Total Influence, base and `vs` as they may see it; other pages get the table view (character, action, `vs` name, dice, resolution, Level, outcome, "rolled by"); the GM's tape gets everything.
- **R107:** Your own receipt gets a ✓ when the roll has reached the table.
- **R108:** A skipped roll number prints "N rolls from Dana didn't arrive", "Many" over 20.
- **R109:** A receipt is built from text, never from a sender's markup; a die outside 1–6 drops the roll.
- **R110:** Receipts print on a paper tape from the register, newest first, about three visible and the rest scrolling.
- **R282:** The tape hangs under the register, 250 px wide and at most 380 tall; a new receipt slides in; rolled up, it leaves a sliver.
- **R111:** The tape is each page's own and never goes over the wire.
- **R112:** The tape lies under the pieces; a new roll or a press raises it, pressing anything else lowers it; the register's paper roll rolls it up and down.
- **R113:** Dragging the tape tears off the whole roll as one table piece that scrolls inside; the next roll starts a fresh tape.
- **R283:** A tear starts once the drag has gone a few pixels, and the torn roll lands slightly tilted; a torn roll's wheel scrolls it and zooms the table only at its ends; pressing a receipt's title to edit it doesn't tear.
- **R114:** A torn roll buries as "Tape: N rolls".
- **R115:** The register shows the Round as a pop-up tab with ▲ ▼ keys and End.
- **R284:** The Round runs from 0 to 99; when it changes, its tab drops and comes back up with the new number.
- **R116:** End needs a second press within 3 s of the first, which raises an orange "End conflict?" tab.
- **R117:** End checkpoints the game, then resets the Round to 0, recharges Biases, Afflictions and Injuries, empties the used piles (plain cards home, tapped cards gone), and clears used marks.

## Feature: Boot Hill
**Source:** specs/boothill.md

- **R118:** Boot Hill is a gravestone at the bar's right end whose badge counts the buried; clicking it opens the list.
- **R289:** The gravestone is grey with "Boot Hill" in Sancreek; its badge counts the buried in every graveyard and it fades when nothing is; the list is oldest first, "Nothing is buried here." when empty, and closes on a press anywhere else.
- **R290:** A burial is named after its pool (or "Nameless"); a sticky "Note: " and a loose writing "Writing: " followed by its first line, 28 characters at most; a receipt by its title; a torn roll "Tape: N rolls, last" and its newest receipt's title. It comes up the moment it's pressed, under the pointer, and the list closes.
- **R119:** Putting away a pool or its card buries both, with everything on them.
- **R120:** Dragging a name out of the list brings it back under the pointer, a character by its pool with its card following; dropping it on the bar buries it again.
- **R121:** Boot Hill holds named graveyards; the header (‹, editable name, ›) stays fixed while the list scrolls.
- **R122:** Burials go into the current graveyard, and holding something over the bar shows "→ name".
- **R123:** › on the last graveyard makes a new one only if this one has contents or a name of its own, numbered one past the highest "Graveyard N" in use.
- **R124:** An empty, nameless graveyard disappears when its last item leaves, its name is erased, or it is left; the only graveyard is always kept.
- **R125:** Shift-clicking an item, or a graveyard's name, twice deletes it (or all of that graveyard) forever; the first arms it red and says so, reverting after 3 s.

## Feature: games and your seat
**Source:** specs/games.md

- **R126:** State is in one of two tiers: the game (saved, checkpointed, exported, sent) or your seat (kept, never checkpointed, exported or sent).
- **R127:** The seat holds the view, the docked roll row, "You are", the tape's state, the graveyard browsed and the list's state, open used piles and expanded piles, kept per game and per viewer.
- **R128:** Nothing done only for looking changes the game or anyone else's table.
- **R129:** Every change to the game is saved after a 400 ms pause, writing only what differs; a reload shows the same table.
- **R130:** Saved state, images included by content hash, lives in the browser's database.
- **R131:** The browser holds a list of games, each with its own table and name; the last open opens on load, and the first visit makes one from the playtest scene.
- **R132:** The Ledger holds the game's name, the save status, Checkpoint, Export, Import, New game, the checkpoint list and the game list, and opens as a ruled ledger page with its actions written on it.
- **R291:** The Ledger is a green cloth-bound book with "Ledger" up its spine, between the register and Boot Hill, closed by a press anywhere else; its status reads "Saved hh:mm:ss", "Not saved: …" or "Not a game file: …"; Checkpoint asks a name offering "Round N, hh:mm:ss" (blank is "Checkpoint"); automatic checkpoints are in grey; New game asks nothing and is "New game <date and time>"; the current game is greyed; a player's Ledger says the GM's page holds the game.
- **R292:** Restoring asks nothing; its checkpoint is "Before restoring “X”", or "Before undoing “X”" when X was one. Export names its file after the game, punctuation as dashes, `.glimmer.json`.
- **R133:** New game starts an empty table beside the others.
- **R134:** A checkpoint is a named copy of the whole game; clicking one restores it.
- **R135:** Restoring first checkpoints the current table, so a restore can be undone.
- **R136:** A restore keeps your seat, skipping whatever has vanished.
- **R137:** End makes a checkpoint automatically; automatic checkpoints keep the newest 20 and named ones are kept.
- **R138:** Export writes one readable `.glimmer.json` holding the game, its checkpoints and each image once.
- **R139:** Import always makes a new game, adding "(imported)" to a name already taken.
- **R140:** A player's page keeps its copy of the table per room, so a reload shows it at once.
- **R141:** A player's Ledger hides Checkpoint, Import, New game and the game list, and the copy never becomes the browser's own game.

## Feature: ownership
**Source:** specs/ownership.md

- **R142:** A character is owned by the GM, open, or a player; the die by its name shows which.
- **R143:** A GM-owned character is seen only by the GM and can't be taken by players.
- **R144:** An open character is seen by everyone and claimed by clicking its die.
- **R145:** A player's character is seen by that player and the GM.
- **R146:** Shift-clicking your own character's die opens it; the GM can open any.
- **R147:** The GM takes back an open character by clicking it; taking one from a player is shift-click (open), then click.
- **R148:** A player can't take another player's character; clicking it does nothing.
- **R149:** A player may own several characters.
- **R150:** A character's sheet and its Influence cards, wherever they are, are readable only by its owner and the GM.
- **R151:** A character's name and place, its drawer's card count, chip values in pools, and its sheet's shape are public.
- **R152:** To others, a hidden character's card and drawer cards are face-down, and its pool chips lose their names on hover.
- **R153:** Only a real GM has the "You are" chooser, as a thing at the table; it lists the GM, the players present and the defaults, and stays while the GM views as a player.
- **R154:** A player's page has no chooser and is fixed to that player.
- **R155:** The plain page is the GM's; an invite makes a player, named once per browser.

## Feature: the network
**Source:** specs/network.md

- **R156:** Browsers connect directly over WebRTC (Trystero), introduced through public Nostr relays.
- **R157:** Open the table makes a room with a random name of about 128 bits; only holders of the invite can join or hear anything.
- **R158:** Copy invite copies a link carrying the room and the GM's browser id; shift-clicking it closes the table.
- **R159:** The GM's URL is never rewritten, and the GM's room is remembered per game.
- **R160:** Every page uses the same pinned list of relays.
- **R161:** Name tags in the bar show who is at the table; the GM's tag is clickable to rename.
- **R293:** Name tags read in the hand font beside a dot, green and glowing when live; the GM's reddish, your own outlined; the GM first, then you, then the rest alphabetically; a tag dims after 25 s unheard and goes after 60 s; the GM renames by a prompt (32 characters, blank is "GM"); red tags with no dot mark someone holding another browser's name (the GM can hand it over), "not yours", and "offline" with why.
- **R294:** Copy invite says "Copied" for about a second, or shows the link if the clipboard refuses; arriving by an invite asks for a name until one that isn't "GM" is given (cancel gives "Player").
- **R162:** A page that connects is greeted and answers; a connection that closes counts as leaving.
- **R163:** A page is live while a relay or a peer is reachable, offline (with why) after 15 s with neither, and keeps trying.
- **R164:** Each browser makes a non-extractable signing key pair once and keeps it; its id derives from the public key and survives reloads.
- **R165:** Before a page is let in, both sides prove their browsers' keys and vouch for their sealing keys; a bad signature is refused.
- **R166:** The first browser to claim a name holds it.
- **R167:** A page claiming a held name from another browser sees only what anyone sees, has its changes, moves and roll requests refused, and is shown a "not yours" chip that says why.
- **R168:** The GM's strip marks such a page, and clicking it hands the name over.
- **R169:** "GM" can't be claimed.
- **R170:** The GM's page holds the game; each save sends the pieces that changed to the table.
- **R171:** Players take the round from the GM's page and keep their own tape.
- **R172:** A joining player's page asks for the whole table until it arrives, sending none of its own changes before then.
- **R173:** A gap in the GM's batches makes a player's page ask for the whole table again.
- **R174:** A player's changes go to the GM's page, which checks ownership (a character and its card belong to their owner, or anyone while open; no handing a character to someone else) before taking them and sending them on.
- **R175:** A refused change is answered with the GM's version.
- **R176:** When the GM's page deletes a piece, every page at the table removes it, however recently the piece was moved.
- **R177:** A piece from another page is cleaned on arrival and can carry nothing runnable.
- **R178:** Every page sends its drags straight to the table at most every 100 ms; receivers slide the piece there.
- **R179:** A drop counts as a move; what the drop changed beyond places goes out right after it.
- **R180:** Each page numbers its moves and changes on one counter that continues across a reload.
- **R181:** Each piece keeps the highest number applied from each page and discards anything lower.
- **R182:** Among moves arriving together, the newest arrival places a piece; an older one changes it only if it is from the same page with a higher number.
- **R183:** A piece in your hand, or one you are writing in, takes no change until you let go.
- **R218:** A piece moved from another page slides only to the most recent position this page has for it, never through the ones in between, including moves that arrived while it was held.
- **R226:** Only what another page moved slides; a piece this page let go never does.
- **R184:** The GM's page and each player's page share a sealing key; a sealed box names what it is and who it is from and to.
- **R185:** Every batch carries each piece as someone who owns nothing sees it, and seals, for each player, the pieces that player sees differently.
- **R186:** When a character changes hands, its sheet and cards go sealed to the new owner, and the old owner gets the redacted ones.
- **R187:** Players' changes are sealed to the GM's page.
- **R188:** The GM's page refuses a change carrying a piece its sender can only see redacted.
- **R189:** A player's change stays pending until the GM's page answers it, survives a reload, and goes again every 3 s; after 5 tries the GM's version wins.
- **R190:** When the GM's page comes back (a new key, or a message after 25 s of silence), the player's page asks for the whole table and sends its pending changes again, which win where the GM's page allows them.
- **R191:** The GM's page numbers its batches with the table's version, which continues across reloads and restores.
- **R192:** A change that puts back a piece deleted after the copy it was made on is answered with the deletion.
- **R193:** A Boot Hill change from a copy that missed a later one is refused whole.
- **R194:** Image bytes stay in each page's store named by hash; a page missing one asks the table, keeps the first answer that hashes right, and can then answer others.
- **R195:** A missing image shows striped and marked missing with why, and is asked for again every 10 s.

## Feature: delivery
**Source:** specs/delivery.md

- **R196:** The program is TypeScript, bundled with esbuild into static files and type-checked with `tsc --noEmit`.
- **R197:** Dependencies come from npm at pinned versions and are bundled; the page fetches no code from a third party at run time.
- **R198:** It runs in current Chrome, Edge and Firefox.
- **R199:** Players are served from GitHub Pages.
- **R200:** `publish.sh` publishes the build under a dedicated IPNS key, served at the key's subdomain, stamps the build time on the page ("dev" when served locally), publishes with a 15 s TTL, and waits until the test machine serves the build.
- **R201:** Behaviour is tested by driving the page in a real browser, with two or more pages for networked behaviour, through a test hook; the bundle exposes no other globals.
