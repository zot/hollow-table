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

- The table fills the window. Drag empty table to pan; the wheel zooms.
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
- **A column's heading carries its absorb**, *Biases (absorb 2)*: how much of each Attack's Result
  the character absorbs before any Slot fills (Hollow Folks, *Absorbing Damage*). It is edited on
  the back and shown only when it isn't 0 (Bill, 11-12).
- **A slot's column says what its entry is.** The entry is stored as a plain name (*The mayor can
  pardon criminals*); the table draws it as a `<bias>`, `<aff>` or `<inj>` mark, for its look and
  its tap glyph, so a Damage mark can't appear anywhere but its own column (Bill, 11-12).
- **An empty column on a card's back collapses** to its name at the top (Bill, 11-11). Empty means
  nothing written and no box checked. Clicking anywhere in the column opens it so a slot can be
  filled in; left empty, it closes again at the next click elsewhere.
- **Sticky note**: yellow, handwritten, edited in place. It comes in two sizes: the note from the
  supply, and a **big sticky** (330 by 300) for the GM's long notes (Bill, 11-12).
- **Loose text**: handwriting straight on the table.
- **Image**: dropped from the bar's image supply (a file picker). Images belong to the game and
  survive a reload.
- Stickies, text and images can pin to a card and travel with it.

## Card text

Text on cards, stickies and loose writing is handwriting with **marks**: a very small markup that
says what a run of text *is* in the game, instead of how it looks (Bill, 11-11). There is no bold,
italic or underline.

| Mark | Marks | The table reads |
|---|---|---|
| `<act>` | an action line | Base, Yellows and bonus; gets a die |
| `<res>` | a Resource | `Name +Level`; gets a tap glyph; its Level is rewritten when spent |
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
  `Name +Level` after "Resources"), the table offers that pen for it; nobody needs to know the tags.
- **A marked card looks printed** (Bill, 11-12). A mark's highlight shows only while its paper is
  being written on, pens out, so you can see what is marked; at rest a card reads as the printed one
  does, with its glyphs and dice as the cues, and the one highlighter swish on it is the action in
  use.
- **Labels take the print's weight from the marks**, with no markup of their own (Bill, 11-12): an
  action or Defend line's label, up to its colon, is bold; a heading is 18 px bold, and a heading on
  the card's first line, its name, 21 px.
- **Several Resources may share a line**, separated by commas (`Money +Min, Liquid Courage +Maj`):
  the Resource pen at a bare caret marks each entry as its own Resource (Bill, 11-12).
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
- Dropping the bar's **character** supply pops its pool out above the new card, linked and
  gathered, owned by whoever made it (the GM's are GM-owned). A pool never pops out under the bar:
  with no room above, the card slides down under it.
