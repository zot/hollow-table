# The table

A shared table for Hollow stories (Glimmer, Bunkum): move paper and roll dice without anyone
noticing the software. v1 supports play at the table: draggable images, dice rolling, and fancy
draggable sheets of paper and cards. No deep game integration yet (no XP calculation and the like).

## What it enforces

- **Guard secrets; flag judgment** (Bill, 11-19, answering his 11-12 "more and more game rules are
  integrating in, solidifying the behavior"). The table enforces who may see and touch what, with the
  GM's page arbitrating; it works out the arithmetic (Roll Ups, the White row, absorb, transfers) and
  shows it; and it never refuses a judgment call: a move the book leaves to the GM is allowed and
  flagged for the GM to rule on. Rules it refuses today are reviewed against this (prototype Item 14).

## Look

- The one bold thing is **the paper**. Cards, stickies, pools and chips look like the printed
  components, in the print's colors: card white with a grey border; sticky yellow (`#FFF200`) with
  a folded corner; chip green (`#93C47D`) and red (`#E06666`); pool slots blue (`#CFE2F3`), Stagger
  pink (`#F4CCCC`), Bias red, Affliction dark violet, Injury a bandage tan.
- The table surface is **oiled walnut** with a faint grain.
- **Caveat** for everything handwritten (card fields, stickies, notes); **PT Mono** for reference
  cards and the little chrome there is; **Sancreek** once, for the wordmark.
- Motion only in answer to a hand: a lift shadow while dragging, a flip, dice. No ambient
  animation.
- Paper is tilted slightly at random, and squares up while you are writing on it (editing tilted
  text in Chrome smears the lines).
- **A card lies flat** (Bill, 11-12: clicking a card to write on it blurred its text). Chrome draws a
  card held in 3D (for its flip) softly, and more so while it is raised to write on, so a card is
  never held in 3D: it shows one face at a time and turns over by narrowing to its edge and opening
  on its other face.
- Paper you are writing on comes to the top while you write, so nothing covers it or its pens.
- Pool slot labels use the print's mat lettering (or PT Mono), in sentence case: "Stagger", then
  "opposition only". No system sans serif, no all-caps labels.

## Feel

- **Every control is a thing at the table.** Buttons are register keys, tags, tabs, glyphs and pages
  of a book, never web buttons, pills, dropdowns or floating panels. A panel opens as the object it
  belongs to (the Ledger as a ledger page, Boot Hill as its graveyard list).
- **Say it once, on paper.** Instructions are not permanent chrome. They live on the reference sheet's
  "How to play the table" page, which every page is given once and puts away when known (see
  *Pieces*).
- **One shape, one job.** Controls that do different things look different, even when they are
  small and sit side by side on one card.
- **Nothing depends on color alone.** Where color carries meaning (green and red chips, Bias, Affliction and Injury),
  a sign or a word carries it too.
- **Empty takes no room.** Something waiting to be filled in shrinks to its name and opens when
  you reach for it: a pool's empty slots, a card back's empty columns.
- **The quality floor:** visible keyboard focus, reduced motion respected, and **every shift-click has
  a long-press equivalent** for touch. Shift-click lowers, releases, opens and deletes; a tablet has
  no shift key.

## The surface

- The table fills the window. Drag empty table to pan; the wheel zooms about the pointer, from a
  quarter size to two and a half times (Bill, 11-12, as the mockup).
- **Two fingers pinch the table** (Bill, 11-21: a "rubber sheet, stuck to the user's fingers"): the spot
  of table under the fingers' midpoint stays under it and their spacing sets the zoom, so one pinch pans
  and zooms at once. The table never turns (11-23: "No rotation"). At the wheel's limits the zoom stops
  and the midpoint still pans, the fingers sliding over the table ("Stop, keep panning").
- **One finger and two hand off without a jump** ("Seamless handoff"): lifting a finger from a pinch
  leaves the other panning from where it is, and a second finger during a pan makes it a pinch, even
  one that lands on a piece. A third finger does nothing.
- **A pinch can begin on a piece** ("Pinch if not yet moving"): before the piece has started moving, a
  second finger makes the press a pinch, and nothing is picked up or clicked.
- **A piece in hand can be pinched under** (11-23: "The user drags with a finger and then adjusts zoom by
  temporarily using a second finger"; "Sheet follows both"): a second finger pinches the same sheet,
  the piece glued to its finger, so it holds its place on the table while the view moves; lifting the
  second finger carries on the drag, and lifting the carrying finger drops the piece.
- **A first visit fits the table into the window**: everything on it, centred, at most full size
  (Bill, 11-12). After that the view is your own and stays as you left it, a resized window included.
- Dragging, panning and zooming follow the pointer at most once a frame: each move only sets
  where the thing in hand is headed, and the next frame puts it there.
- A piece in your hand stays glued to the pointer at the spot where you took hold of it, at any
  zoom, with no lag or easing.
- Let go, it is exactly where it was shown: it doesn't slide there from where it started.
- What you carry is the piece itself, never a copy: picked up, it squares up, grows slightly and
  rides above everything, bringing what follows it.
- Things you aim take the pointing hand, whose fingertip is where it points: Resource glyphs,
  checked boxes, chips, Influence cards and slots. It stays the pointing hand for the whole drag of
  a chip, a card or a tap, and while aiming from the roll row. Large things (paper, pools, the
  table) take the open hand, closed while panning.
- **Writing shows the text cursor** (Bill, 11-16): while a card, sticky or any other written place
  holds the caret, the pointer over its words, marks included, is the I-beam, so it reads as
  writing rather than as a piece to carry. Glyphs, action dice, Slot boxes and pens keep the
  pointing hand; the paper's margins, and text not being written in, keep the open hand. An
  Influence card's name, written in place, always shows the I-beam.
- While you carry something, the place it would land lights up: the slot, the chip a +1 would
  ride, the card a loose sticky would pin to, the drawer a card would go home to. Over the bar it says
  whether letting go puts it away or buries it.
- Picking something up leaves any writing and clears the text selection.
- **Select-all takes the whole of what you're writing** (Bill, 11-19: "Both, as one item"): Ctrl+A,
  or ⌘A, while writing selects all of that written place, its dice and glyphs too, in every browser.
  Safari's own select-all stops at them and selects nothing.
- **A press on a piece's text carries it like any other press** (Bill, 11-19): the browser never starts
  a drag of its own from the table, and can't put you back to writing while you carry, so a press and
  move on a sticky's writing carries the sticky, in Safari too, where the browser had dragged the text
  instead, or left you writing in it after a carry.
- Mats pass clicks through their empty space (beside the name) to the table.
- Labels, slot rows, drawer tools, the roll row, the register and the bar don't select as text.

## The bar

The bar runs along the top. It holds:

- **The desk** (`carves/done/organizing.md`, Item 2), right after the wordmark: its pigeonholes hold the
  paper supplies, a character, a sticky note, loose text, an image, the reference sheet and a
  docket (see `dockets.md`), and on the GM's desk the Connection Table (see
  `connections.md`). Taken from a
  pigeonhole, one is made; dropped back on the bar, nothing is.
- **Chips** (2, 4, 6 and +1 in each color) stay on the bar, outside the desk (Bill, 2026-11-23: "Chips
  stay out"). Drag one onto the table to take one; dropped back on the bar, nothing is made.
- The **Opposition** button and the brass tray it slides out, the world's number (see `rolls.md`,
  *The world as opposition*).
- The people at the table (see `network.md`).
- The cash register, the Ledger and Boot Hill, at the right end.

**How it looks** (Bill, 11-12, as the mockup): a walnut-dark strip 92 px high. Left to right: the
wordmark, with the version under it and the date under that (Bill, 11-13: a release shows its tag,
`v0.1.0`, and its day, `Nov 13, 2026`; the test rig shows "dev" and when it was published; a page
built locally just "dev"). They are the one thing in the bar you can select, to copy into a bug
report; the desk, a little roll-top; the chips, 2, 4, 6 and +1 in each color, in a grid of two rows
(the +1 smaller); the Opposition button, a small brass plate; the people; "You are" (the GM's); then
the register, the Ledger and Boot Hill.
- **Pressing the desk shows its pigeonholes** (Bill, 2026-11-23): a strip opens below it, one pigeonhole
  for each paper supply, each holding its supply drawn small: a character as a little stack of white
  card, a note as a yellow square, "Aa" for loose text, an image, the reference sheet, a docket's label
  on its red tape, and on the GM's the Connection Table.
- **Dragging across the pigeonholes** puts each one's piece in your hand, small; **dragging out of the
  strip** makes it, its full size, its middle under the pointer, carried as any piece is. Loose text
  starts as "Write here".
- **Letting go in a pigeonhole makes it too** (Bill, 2026-11-23: "releasing inside the strip makes the
  item and starts moving it around on the tabletop, releasing it with a mousedown"): it follows the
  pointer with no button held, and the next press puts it down where it is. A press on the bar instead,
  or Esc, takes it back unmade. The wheel and a pinch still zoom with it under the pointer, and a press
  on another piece puts yours down there rather than picking that one up.
- **On touch** a piece let go in its pigeonhole lands just below the strip, ready to drag (Bill: "Just
  below the strip"), since a lifted finger leaves nothing to follow.
- **The image pigeonhole opens a file picker**: let go in it, the picker opens, and a chosen image
  comes carried as above, several a step apart; dragged out, the small image follows the pointer and
  letting go on the table opens the picker, the image landing there (Bill, 2026-11-24: "Picker on
  drop"). A cancelled picker makes nothing.
- **Clicking the desk** (pressing it and letting go without moving) opens the whole desk, the
  pigeonholes staying open until a press elsewhere; its drawers come with `carves/done/organizing.md`,
  Item 3.
- **An image the browser won't keep is said on the image pigeonhole** (Bill, 11-19: "On the image
  supply"): when the browser's storage is full, it turns red and reads "storage full" (or "not added",
  for another reason), its tooltip saying why, until an image is added; while it does, the desk on the
  bar is edged red too.
- **Over the bar**, anything you carry turns the bar red; if letting go would bury it, "→" and the
  current graveyard's name show by the gravestone. Plain chips, +1s and the reference sheet vanish
  there; an Influence card goes home to its drawer.
- **Putting away:** dropping something on the bar puts it away. Characters, stickies, loose writing,
  images and roll receipts are buried on Boot Hill (see `boothill.md`); plain chips just vanish;
  Influence cards go home to their drawer; the Connection Table is put away, kept for its supply.

## Pieces

Everything on the table is a piece: a character's pool and card, a sticky, loose text, an image, a
chip, a torn-off roll of receipts (this page's alone, see `rolls.md`).

- **Character card**: a rounded index card with two faces, edited in place and flipped at the
  corner. The front holds name and Rank, `Cha Int Wis`, Fields and Skills, and a right column
  (actions, Defend, Sparked/Grains, Resources). The back holds three **Damage columns**, Biases,
  Afflictions and Injuries, and ruled Notes lines (Bill, 11-12). Each column has a Mild, Min, Sig
  and Maj **slot**: a line for one name, with a checkbox per extra Slot of that Level. Slot boxes
  toggle. As on the printed cards, a slot's boxes sit in front of its Level word (Bill, 11-12).
- **Wis and Con size the Damage columns** (Bill, 11-12: "It should be based on Wis"), by Hollow
  Folks' table (*Absorbing Damage*): Biases and Afflictions follow Wis, Injuries follow Con when the
  card has it (the Bunkum cards don't print Con; without it, the baseline). The extra boxes: Min +1
  from 1, +2 from 3; Sig +1 from 7, +2 from 15; Mild +1 from 9, +2 from 11. A box checked beyond
  the count stays until it is unchecked. A card whose attributes aren't marked keeps the boxes it has.
- **A column's heading carries its absorb**, *Biases (absorb 1)*: how much of each Attack's Result
  the character absorbs before any Slot fills, 1 from 5, 2 from 10, 3 from 15, by the same table.
  It is worked out, never typed, and shown only when it isn't 0.
- **Below 0 a slot is worth only 1** (Hollow Folks' table, "Worth only 1"; Bill, 2026-11-23: "Mild, then
  Mild and Min"): at −1 the column's Mild Slot, at −2 or below its Mild and Min Slots, absorb 1 point of an
  Attack instead of 2 and hold a 1-point Damage Resource. Such a slot says so beside its Level word,
  *Mild (1)* ("Yes, on the slot").
- **A slot's column says what its entry is.** The entry is stored as a plain name (*The mayor can
  pardon criminals*); the table draws it as a `<bias>`, `<aff>` or `<inj>` mark, for its look and
  its tap glyph, so a Damage mark can't appear anywhere but its own column (Bill, 11-12).
- **A Conviction sits under Biases and a Burden under Afflictions** (Bill, 11-15), on a line below
  the Maj slot: its name, its Level, and its points toward the next Level, *Conviction  Cheats
  always win  Sig (5/6)*. A character has at most one of each, and overflow grows it (Bill, 11-15):
  Hollow Folks (*Convictions and Burdens*) has it start at Min and rise a Level as it fills, Min to
  2 points, Sig to 6, Maj to 12, Ext to 20, Exq to 30; past 30 it stays Exq. The line shows only
  while the card has one.
- **Recovery is by hand.** The books lower a Conviction or Burden by Levels at the end of an Event
  (Bunkum's Recovery chips, Glimmer's weeks of rest), and the table knows no Event: its points are
  edited in place, like its name, and one with no name and no points is gone.
- **An empty column on a card's back collapses** to its name at the top (Bill, 11-11). Empty means
  nothing written, no box checked, and no Conviction or Burden.
- **Clicking a column's name brings it to the front** (Bill, 11-12): it opens, the columns rotate so
  it is the far left one (the others following in turn), and the other empty columns collapse. So
  clicking the second name again and again cycles through all three. A column stays open until
  another is brought forward; one with something written in it is always open. The order is each
  person's own view of the card, like which slots they have opened; nobody else's card turns.
- **Ruled lines are one screen pixel at any zoom** (Bill, 11-12), as an SVG line draws, and stay
  smooth on tilted paper: the back's notes lines, for one. Writing that runs past the bottom
  scrolls, and its lines scroll with it.
- **An open column's name sits over its blanks** (Bill, 11-12), past its boxes and Level words, on
  one line.
- **Damage blanks are the same length** whichever column is open (Bill, 11-12): a collapsed name
  takes the same room whichever it is, and open columns share what is left evenly.
- **Sticky note**: yellow, handwritten, edited in place. It comes in two sizes: the note from the
  supply, and a **big sticky** (330 by 300) for the GM's long notes (Bill, 11-12).
- **Loose text**: handwriting straight on the table.
- **The reference sheet** (`carves/fixes.md`, Item 13): a printed page of the rules, in PT Mono, with
  pages turned at its foot, "‹ 1 of 3 ›": **How to play the table**, then Bunkum's **Quick Reference**
  and **Quick Character Creation** (its Appendices B and A), under their own titles and in their words.
  The Quick Reference reads the Resolution Die as Hollow Folks and the table's dice do, 4-6 a clean
  Success and only a 3 a Success with cost (Bill, 2026-11-25: "4-6 is a clean success and only a 3 is
  succeed at cost", Bunkum's page 18 updated to match).
- **The reference sheet is each page's own** (Bill, 2026-11-25: "reference cards seem special to me --
  I think they shouldn't be shared, just local to each peer"), as a player aid is at a real table:
  never sent, kept through reloads, its moves and its turned page this page's alone; put away, it
  vanishes. A desktop set out leaves it on the table.
- **Every page is given one** ("new peers should get a how to play card on their table
  automatically"), the GM's too: once per game, open at How to play the table, on open table in view.
  Put away, it doesn't come back on a reload; the desk's pigeonhole gives another.
- **The shared reference cards of older games go**: the GM's page deletes them from the game, since
  every page has its own sheet.
- **Image**: taken from the desk's image pigeonhole (a file picker), or **image files dropped from the
  desktop onto the table**, each where it was dropped, several stepped a little apart (Bill, 11-12).
  Images belong to the game and survive a reload.
- Stickies, text and images can pin to a card and travel with it. **Pinned paper lies on its card**
  (Bill, 11-12): it is always drawn on it, and rises with it while the card is carried or written on.
  It goes with its card on every page that holds it, even when whoever moved the card can't read it.
  Paper can also be bundled on a docket (`dockets.md`).
- **A thumbtack holds pinned paper** (`carves/fixes.md`, Item 8; Bill, 2026-11-24: "there's no
  indication of whether a card it pinned -- let's add a thumbtack", since "they had thumbtacks but not
  pushpins back then"). Paper pinned to a card shows a tack at its top middle, a brass head with its
  shadow; paper in a docket shows none, its red tape says so.
- **Dragging pinned paper only moves it** ("we should make dragging the paper simply reposition it
  instead of unfastening it"): wherever it's let go, it stays pinned to its card, even over another card
  or a docket's tape. While it's carried, the **pin line** runs from the middle of its tack to its
  card's center ("Dragging a pinned card should show the pin line"), drawn like the line a roll row
  aims with, in its amber ("Pin lines should be the same amber"), under the paper and over the card
  (Bill, 2026-11-24: "under the paper is better, so it's between the paper and the card in z-order").
  While the line shows, its card and the paper with its tack are raised above everything else, the
  line between them ("let's temporarily raise the card, paper, and tack during the drag, otherwise the
  line can appear to be attached to an obscuring card"); during a tack's drag the card it points at
  is raised too. They go back down when the line goes.
- **The tack** pins, unpins and moves the pin. A click takes it out, and the paper lies loose where it
  is. A press shows the pin line; dragged, the line follows the pointer and the card under it lights;
  let go on another card, the paper is pinned to that one where it lies; let go on the table, or Esc,
  nothing changes. Loose paper let go on a card still pins to it and gets a tack.

## Card text

Text on cards, stickies and loose writing is handwriting with **marks**: a very small markup that
says what a run of text *is* in the game, instead of how it looks (Bill, 11-11). There is no bold,
italic or underline.

| Mark | Marks | The table reads |
|---|---|---|
| `<act>` | an action line | Base, Yellows and bonus; gets a die |
| `<res>` | a Resource | `Name +Level`; gets a tap glyph; its Level is rewritten when spent |
| `<att>` | a character's attributes | each `Name N` (`Cha 2  Int 2  Wis 4`); Wis and Con size the back's Damage columns |
| `<mot>` | an NPC's Motivation | `Name ±Level`; gets a tap glyph; what is spent shows in parentheses until the scene ends |
| `<inf>` | a named Influence | `Name ±Level` |
| `<def>` | the Defend line | mental and psych Defend |
| `<fld>` | a Field | `Name N (nXP)`: its Level N (Bill, 11-14) |
| `<skl>` | a Skill line | a Field's Skill, at the `<fld>` above's Level, one higher with a ✓; or `Skills N: a, b, …`, each Skill Level N (Bill, 11-14) |
| `<head>` | a section heading | nothing; drawn like the printed headings |

- `<bias>`, `<aff>` and `<inj>` are never written in text: they are how a Damage slot's entry is
  drawn (see *Character card*). Written in text, they are plain text like any other tag.
- The table reads game meaning **only from marks** and Damage slots, never by guessing from plain
  text.
- **Marking is done with highlighter pens**, one per mark, in place of a formatting toolbar: select
  text, pick a pen. A pen on marked text unmarks it.
- **The table offers.** When a line typed in plain text matches a mark's grammar (an action line,
  `Name +Level` after "Resources", `Name ±Level` after "Motivations", an attribute line like
  `Cha 2  Int 2  Wis 4`, a Field like `Private Investigator 2 (5XP)`, a `Skills N:` line or a plain
  line under a Field), the table offers that pen for it; nobody needs to know the tags.
- **Fields and Skills share a pen family** (Bill, 11-14: "let's give them a highlighter color"):
  chartreuse for a Field, a paler chartreuse for its Skills, so a Field's Skills read as its own.
  The book's Levels (Hollow Folks, *Skills*): a Skill in a Field has the Field's Level, one higher
  with a checkmark; Skills outside a Field are listed by Level in `Skills N:` lines.
- **An older game's Fields and Skills get marked** (Bill, 11-16): a game made before the Field and
  Skill marks has its Fields and Skills as plain text, so a Field isn't bold and its Skills don't
  indent. The first time the GM's page opens such a game it marks, top to bottom and without asking,
  every line the table would offer the Field or Skill pen for, and records in the game that it has,
  so it never runs again and a line unmarked on purpose stays plain. Only Fields and Skills: the
  other marks were there when such a game was made. A character buried in Boot Hill is left as it is.
- **A Field's Skills are indented under it, their names aligned** (Bill, 11-14: "I think we should
  always indent Field Skills, instead of based on whether they have a check mark -- that seems more
  intuitive and simpler too"): a ✓ hangs in the margin before its Skill's name, so a checked Skill's
  name lines up with the rest. A `Skills N:` line is not under a Field and stays flush.
- **Ghost checks while writing** (Bill, 11-14: "That way the user doesn't have to look up the check
  mark on the web in order to type it"): while a card is written on, pens out, a faint ✓ sits in the
  margin before each unchecked Field Skill, never on a `Skills N:` line. Clicking a ghost writes the ✓
  into that Skill's text; clicking a real ✓ while writing takes it out, so the Levels read from it
  change at once. At rest the ghosts are gone and the card reads as printed.
- **A marked card looks printed** (Bill, 11-12). A mark's highlight shows only while its paper is
  being written on, pens out, so you can see what is marked; at rest a card reads as the printed one
  does, with its glyphs and dice as the cues, and the one highlighter swish on it is the action in
  use. A Damage entry shows its color then only once it has a name; an empty slot stays a blank line
  (Bill, 11-12).
- **Labels take the print's weight from the marks**, with no markup of their own (Bill, 11-12): an
  action or Defend line's label, up to its colon, is bold; **a Field is bold**, to tell it from its
  Skills (Bill, 11-14); a heading is 18 px bold, and a heading on
  the card's first line, its name, 21 px. **Headings are drawn in capitals** (`HOLLOW MEMORIES`), as
  the printed cards have them, while the text keeps what was typed; the name on the first line keeps
  its case (Bill, 11-14: "I think I like the capitals better").
- **Several Resources may share a line**, separated by commas (`Money +Min, Liquid Courage +Maj`):
  the Resource pen at a bare caret marks each entry as its own Resource (Bill, 11-12). The Motivation
  pen does the same for Motivations, which NPC write-ups list that way (*Be Left Alone +Sig, Starved
  for Company +Sig*).
- **Marks are a closed set.** Tags carry no attributes. Anything else in the text is shown as plain
  text and kept exactly as written. Text from another page is read the same way, so it can carry
  nothing runnable.

## Characters and pools

- Each party in a Contest has a **pool** (an Influence Pool mat), NPCs included: Bonus, Main, Edge,
  Stagger (opposition only), Bias, Affliction and Injury slots, Injury last as the least used
  (Bill, 11-11), with the character's name, a die button, and a drawer of Influence cards below.
- **The mat is a white frame round tall slots** (Bill, 11-12): each slot rounded, with a dark
  hairline edge and its name in its middle in PT Mono, sentence case; Stagger is wider, with
  "opposition only" under its name. **The drawer is a tray inside the mat**, under the slots: its
  cards on the left, its tools on the right.
- **The mat keeps its width**, its drawer's (Bill, 11-12). Slots open at full width from the left,
  as many as fit, and a slot holding anything is always open; the rest stand as strips **1em
  wide** showing their first letter (B M E S B A I), packed against the right edge, so the slots
  always fill the mat with no gap. Bonus and Bias share a letter and are told apart by place (Bonus
  is always first, Bias fifth) and by color; the full name shows on hover.
- **Carrying a chip or card over a pool's slots trades space** (Bill, 11-12): the strip under it
  opens, and a slot closes to pay for it, so the mat keeps its width. The slot that closes is the
  one the chip came from, if taking it left that slot empty (so dragging back and forth just swaps
  the two); otherwise the first empty open slot to the left of where the chip came from (or of the
  strip, for a chip from elsewhere). A slot holding anything never closes; with none empty to the
  left, the mat grows by that one slot, its drawer keeping its width. The opened strip stays open until the
  chip reaches another strip or leaves the slots, and nothing changes before it reaches them.
  Clicking or tapping a strip opens that slot too (so a +1 can be added by click), until the next
  click elsewhere.
- **A growing drawer pushes what it would cover** (Bill, 11-12): any piece the mat would now cover
  slides down just clear of it (a card brings what's pinned to it, a pool its gathered card), and
  stays there when the drawer shrinks. The GM's page makes the move, so everyone sees it slide.
- **The name above a pool** (`carves/fixes.md`, Item 7; Bill, 2026-11-24: "Full name on the pool;
  the name is public"). Writing the name on the card's first line, its words before a group in
  parentheses and before the Rank, resets the name above the pool to it in full: "Mistress Devreux
  (Unton folk), Rank 3" is "Mistress Devreux". The name above the pool can also be written on its own,
  a nickname ("That way players can type in a nickname if they want to"), and the card keeps its first
  line; the next change to the name on the card replaces the nickname. Who may write it is in
  `ownership.md`.
- **A character is a card tied to its pool.** Dragging a pool brings its card; a card dragged on its
  own moves alone and is no longer gathered. A **gathered** card stays snapped under its drawer as
  the drawer grows or shrinks. **Gather** snaps it back. The scene starts gathered.
- **Paper pinned to a gathered card goes with its pool** (`carves/fixes.md`, Items 1 and 9; Bill,
  2026-11-24: "dragging the paper and then dragging the pool mat makes the paper jump up"): a pool's
  drop moves its gathered card to where it is drawn, and the paper pinned to it with it, by the same
  offset; and a pin is measured from where its card is drawn. So nothing jumps while the pool is
  carried, and nothing is left behind when it is let go. **Gather, and a drawer that grows or shrinks**,
  move a gathered card's paper with it too (Item 10; Bill, 2026-11-24: "make gather move attached notes
  with the same delta as their card", and the drawer: "Yes, include it"). A gathered card's place is
  under its pool, a page's own open roll row left out, and the GM's page keeps its record there.
- **A pool is carried from anywhere on it** (Bill, 11-12): its name, its frame and slots, or its
  drawer; what has a drag of its own (a chip, a card) is carried instead, and only the empty space
  beside the name passes through to the table. **The pool and its card move as a group**, by the
  same offset, whether the card is gathered or not.
- Taking the desk's **character** supply pops its pool out above the new card, linked and
  gathered, owned by whoever made it (the GM's are GM-owned). A pool never pops out under the bar:
  with no room above, the card slides down under it.
