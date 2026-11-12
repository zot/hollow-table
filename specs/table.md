# The table

A shared table for Hollow stories (Glimmer, Bunkum): move paper and roll dice without anyone
noticing the software. v1 supports play at the table: draggable images, dice rolling, and fancy
draggable sheets of paper and cards. No deep game integration yet (no XP calculation and the like).

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
- **Say it once, on paper.** Instructions are not permanent chrome. They live on a "How to play the
  table" reference card, taken from the supplies like any other paper and put away when known.
- **One shape, one job.** Controls that do different things look different, even when they are
  small and sit side by side on one card.
- **Nothing depends on colour alone.** Where colour carries meaning (green and red chips, Bias, Affliction and Injury),
  a sign or a word carries it too.
- **Empty takes no room.** Something waiting to be filled in shrinks to its name and opens when
  you reach for it: a pool's empty slots, a card back's empty columns.
- **The quality floor:** visible keyboard focus, reduced motion respected, and **every shift-click has
  a long-press equivalent** for touch. Shift-click lowers, releases, opens and deletes; a tablet has
  no shift key.

## The surface

- The table fills the window. Drag empty table to pan; the wheel zooms about the pointer, from a
  quarter size to two and a half times (Bill, 11-12, as the mockup).
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
- While you carry something, the place it would land lights up: the slot, the chip a +1 would
  ride, the card a sticky would pin to, the drawer a card would go home to. Over the bar it says
  whether letting go puts it away or buries it.
- Picking something up leaves any writing and clears the text selection.
- Mats pass clicks through their empty space (beside the name) to the table.
- Labels, slot rows, drawer tools, the roll row, the register and the bar don't select as text.

## The bar

The bar runs along the top. It holds:

- **Supplies**: a character, a sticky note, loose text, an image, the "How to play the table"
  reference card, and chips (2, 4, 6 and +1 in each colour). Drag one onto the table to take one;
  dropped back on the bar, nothing is made.
- The people at the table (see `network.md`).
- The cash register, the Ledger and Boot Hill, at the right end.

**How it looks** (Bill, 11-12, as the mockup): a walnut-dark strip 92 px high. Left to right: the
wordmark, with the build stamp under it (the one thing in the bar you can select, to copy into a bug
report); the paper supplies, a character as a little stack of white card, a note as a yellow square,
"Aa" for loose text, and an image; the chips, 2, 4, 6 and +1 in each colour, in a grid of two rows
(the +1 smaller); the people; "You are" (the GM's); then the register, the Ledger and Boot Hill.
- **Taking a supply**: the piece is made and in your hand the moment you press, its middle under the
  pointer. Loose text starts as "Write here". The image supply opens a file picker; the image lands
  in the middle of the view, several a step apart.
- **Over the bar**, anything you carry turns the bar red; if letting go would bury it, "→" and the
  current graveyard's name show by the gravestone. Plain chips, +1s and the reference card vanish
  there; an Influence card goes home to its drawer.
- **Putting away:** dropping something on the bar puts it away. Characters, stickies, loose writing,
  images and roll receipts are buried on Boot Hill (see `boothill.md`); plain chips just vanish;
  Influence cards go home to their drawer.

## Pieces

Everything on the table is a piece: a character's pool and card, a sticky, loose text, an image, a
chip, a torn-off roll of receipts.

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
  It is worked out, never typed, and shown only when it isn't 0. (What the book's negative rows,
  "worth only 1", do is open.)
- **A slot's column says what its entry is.** The entry is stored as a plain name (*The mayor can
  pardon criminals*); the table draws it as a `<bias>`, `<aff>` or `<inj>` mark, for its look and
  its tap glyph, so a Damage mark can't appear anywhere but its own column (Bill, 11-12).
- **An empty column on a card's back collapses** to its name at the top (Bill, 11-11). Empty means
  nothing written and no box checked.
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
- **Image**: dropped from the bar's image supply (a file picker), or **image files dropped from the
  desktop onto the table**, each where it was dropped, several stepped a little apart (Bill, 11-12).
  Images belong to the game and survive a reload.
- Stickies, text and images can pin to a card and travel with it. **Pinned paper lies on its card**
  (Bill, 11-12): it is always drawn on it, and rises with it while the card is carried or written on.

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
| `<head>` | a section heading | nothing; drawn like the printed headings |

- `<bias>`, `<aff>` and `<inj>` are never written in text: they are how a Damage slot's entry is
  drawn (see *Character card*). Written in text, they are plain text like any other tag.
- The table reads game meaning **only from marks** and Damage slots, never by guessing from plain
  text.
- **Marking is done with highlighter pens**, one per mark, in place of a formatting toolbar: select
  text, pick a pen. A pen on marked text unmarks it.
- **The table offers.** When a line typed in plain text matches a mark's grammar (an action line,
  `Name +Level` after "Resources", `Name ±Level` after "Motivations", an attribute line like
  `Cha 2  Int 2  Wis 4`), the table offers that pen for it; nobody needs to know the tags.
- **A marked card looks printed** (Bill, 11-12). A mark's highlight shows only while its paper is
  being written on, pens out, so you can see what is marked; at rest a card reads as the printed one
  does, with its glyphs and dice as the cues, and the one highlighter swish on it is the action in
  use. A Damage entry shows its colour then only once it has a name; an empty slot stays a blank line
  (Bill, 11-12).
- **Labels take the print's weight from the marks**, with no markup of their own (Bill, 11-12): an
  action or Defend line's label, up to its colon, is bold; a heading is 18 px bold, and a heading on
  the card's first line, its name, 21 px.
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
  is always first, Bias fifth) and by colour; the full name shows on hover.
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
- **A character is a card tied to its pool.** Dragging a pool brings its card; a card dragged on its
  own moves alone and is no longer gathered. A **gathered** card stays snapped under its drawer as
  the drawer grows or shrinks. **Gather** snaps it back. The scene starts gathered.
- **A pool is carried from anywhere on it** (Bill, 11-12): its name, its frame and slots, or its
  drawer; what has a drag of its own (a chip, a card) is carried instead, and only the empty space
  beside the name passes through to the table. **The pool and its card move as a group**, by the
  same offset, whether the card is gathered or not.
- Dropping the bar's **character** supply pops its pool out above the new card, linked and
  gathered, owned by whoever made it (the GM's are GM-owned). A pool never pops out under the bar:
  with no room above, the card slides down under it.
