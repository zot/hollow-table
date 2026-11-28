# PieceView
**Requirements:** R5, R22-27, R62, R75-77, R202, R209, R213, R245, R248-250, R252-256, R258, R259, R263-265, R309, R310, R312, R316, R318, R331, R332, R334, R335, R339, R341-343, R354, R355, R363, R384, R388, R390, R392, R393, R397-404, R407, R409, R414, R419, R421, R425, R426, R428, R429, R432, R436, R438, R450, R486, R496, R500, R503, R505, R577-580, R532, R533, R542, R566-568, R570, R571, R583, R592, R593, R594, R595, R596, R603, R604, R605

Draws one paper piece from its record and turns edits back into Game changes: character cards,
stickies, loose text, images, torn rolls and the reference sheet.

## Knows
- The record it shows, and the viewer (for redacted faces drawn face-down).

## Does
- writable (R450): every written place takes Ctrl+A or ⌘A itself, selecting all of its contents, since
  WebKit's select-all selects nothing in one that holds non-editable dice or glyphs.
- frontOrder(front): the Damage columns in drawing order, rotated so `front` (the one brought
  forward, or none) is first, the rest following in turn (R253).
- draw(record, old): makes or updates a piece's element; text written in place is left alone while
  it holds the caret. The card's front reads in two columns, as printed. A card its viewer may not
  read lies face-down ("Hollow").
- the fold (R503, R505, R577, R578, R500): paper shows a folded corner at its upper right, folded when
  `private`; its owner is its `by`, the GM for paper without one. On its owner's page a ▾ beside it
  opens the audience menu: Everyone, Just me, and a checkbox per player at the table (`players`: the
  names claimed, which the GM's page holds, and the players present) or who already reads it, the owner left out; a player's adds GM (`to: []`), and on the GM's
  Just me is `to: []`, as none checked is. A pick is one change: `by` written, `to` and `mine`
  rewritten, and, crossing to or from Just me, the piece deleted under its old key and put under its
  new one (ridFor).
- giving (R579-R581, R583): under the readers the menu has "Give to", the players at the table but its
  owner and, for a player's note, GM; on the GM's page paper someone else owns has a ▾ with "Give to"
  alone. Open, the menu listens for presses on the page, capturing: one outside the menu and its ▾
  closes it, never stopping the press, and the listener goes when the menu does. While the menu is open
  its paper is raised over every other piece but one carried or a pin line's (`:has(> .readmenu)`, R596). A pick puts Ownership.handOver of the note, in one change; a `mine` note leaves `m:` for the
  table in it (ridFor). By a folded
  corner, tags in the hand font name everyone who reads it but the viewer ("GM" for the GM), or "me"
  when only the viewer reads it.
- the eye (R388, R392, R393): on the GM's own page, a card the GM owns has an eye at its front's upper right
  and a dropdown arrow beside it (Skills, Resources, Motivations, Items, Opinions). The open eyes are the page's own,
  never saved or sent (Eyes): each open card keeps a draft of its revealed entries, begun from `shown`.
  Open, the card is drawn torn from the back as below, but the back is translucent and its hidden
  text is written in a muted ink, each line with entries (MarkReader.entries) drawn as its label and
  its entries, each its own target; its text takes no caret, and a click on an entry tears it out or
  mends it in the draft, its line's label torn with it. Shutting the
  eye writes the draft as `shown` in one change (absent when empty). The dropdown's category opens
  the eye and highlights that category's unrevealed entries yellow. A shut card shows nothing of `shown`.
  (R436) The draft takes in the card's records' items too (Connections.opinionItems), begun from their
  `shown`; with the eye open, a slid-out record is drawn torn as an Info card is, each line a target,
  with no glyph or die. Shutting writes each record whose revealed lines changed, its `shown` and, by
  Connections.published, its `on` and `name`, in the same change as the card.
- Info cards (R400, R397–R399, R402): manila-folder tabs on a card's bottom edge, "Info 1", "Info 2"
  ("Info" for one); a tab slides its white card out from under the NPC's card, another tab or the same
  one tucking it back. Which is out is the Seat's (`open.info`, `<oid>:<k>`). The GM writes on one as
  on the front. addInfo(oid) (R401, from the pool's menu) appends an empty card, slides it out and puts
  the caret in it. An emptied card (R403) is dropped when it loses the caret, and buried with its
  last words before emptying (kept as it is written); a card that never had words leaves no burial. In the Infer state its clues (MarkReader.clues) are targets as the front's
  entries are, lit for the chosen category when ANY or of it. A face-down card's tabs show only for
  cards with words, and such a card slides out face-down, each line with words torn through its back.
- torn from the back (R390, and R392 in the Infer state): a face-down card shows its front's face in brown, "Hollow" across it,
  its public `name` in its first line's place, and each line with words (its revealed entries, R394),
  as a white strip torn through it,
  in the text's own flow: ragged top and bottom edges picked from the card's oid and the line, and
  the torn piece rolled at its right end.
- the pointer over writing (R384): text written in place takes the I-beam while it holds the caret,
  its marks with it; the glyphs and action dice in it keep the pointing hand, and text without the
  caret keeps the open hand, a press there carrying the piece. A stylesheet rule
  (manifest-ui.md, Global rules), so a receipt's title on the tape gets it too.
- glyphs (R54, R249, R258): a tap glyph, drawn as a tiny card, before each `<res>` and `<mot>` mark on the front, before each named Damage slot,
  and for each checked box; it starts Drag.startGlyph, and refuses the native drag and selection a
  press inside written text would start.
- card(record): two faces, flipped at the corner, one shown at a time (R252: no 3D, which Chrome
  draws blurred); a change of face turns the card by squeezing it to its edge and opening it on the
  other face (turn), instant under reduced motion; the front's marks drawn by MarkedText.render with
  their dice (`act`) and tap glyphs (`res`); the back's three Damage columns (Biases, Afflictions,
  Injuries), each a Mild, Min, Sig and Maj slot whose name is drawn as a span of its column's mark
  (`bias`, `aff`, `inj`) with a tap glyph, so CSS and the glyph handler treat it like a `res`; empty
  columns collapsed to their names; clicking a column's name brings it to the front (R253: it
  opens, the others' empty columns collapse, and the columns rotate so it is leftmost, drawn with
  CSS `order` from frontOrder; the one opened is kept per card in the Seat); Slot boxes, in front of their slot's Level word, toggle (a box can't be checked
  until its slot has a name), each checked box with a tap glyph of its own; how many boxes a slot has,
  and the absorb a column's heading shows when it isn't 0, come from Influence.columnRoom (R264,
  R265): never typed; a box checked beyond the count stays drawn until unchecked; with no attribute
  marked, the boxes the card has. A slot worth only 1 says so after its Level word, "Mild (1)"
  (Influence.slotWorth, R496).
- actions (R316, R76, R77): a small die before each alternative of an `<act>` label (split at `/`) at rest (like the glyphs), which calls
  useAction (the roll row docks and fills, or the die shakes); the action in use (inUse, matched by
  label) carries `inuse`, its highlighter swish, even while written on.
- refuse (R259): a glyph whose tap the page refuses (someone else's Resource) shakes and carries
  nothing.
- dry (R250): each glyph is marked dry when its source has no Levels left (Tap.leftOf, by its whole source), redrawn
  with the character.
- ruled(text) (R255): the notes over an SVG of lines with a non-scaling stroke, a line every 26 px;
  when the writing scrolls (the caret past the bottom), the lines shift with it, by the scroll
  modulo a line, so they stay under the text.
- sticky, text: handwriting, edited in place; a sticky with `big` is the big sticky (R248).
- marks look printed at rest (R245): the highlights show only while the piece is being written on,
  the same moment its pens are out (CSS on the piece); a Damage entry fills only once named (R263).
- image: from BlobStore by hash; striped and marked missing with why when absent.
- tornroll: its receipts, scrolling inside (the wheel scrolls it rather than zooming); its element
  carries its `t:` rid (Records.ridFor, R486).
- reference sheet (R592, R593): a printed page in PT Mono, its page (`which`) drawn when it differs from
  the one shown: How to use the table, then Bunkum's Quick Reference and Quick Character Creation in its
  words, with "‹ n of 3 ›" at its foot, whose turns write `which` on this page's own record (`m:`).
- the sheet given (R594, main.ts): the first time a page opens a game, a sheet open at How to use the
  table is put in the middle of its view, and the seat of the page's own person (`self`, whoever it views
  as) remembers `given`, so neither a reload nor a sheet put away brings another.
- shared cards gone (R595, main.ts): the GM's page deletes any `reference` under `o:`, at start and after
  every change, since every page has its own sheet.
- records (R419, R426): an NPC's pink Opinion Records follow its Info cards in the slide-out, those
  of its row (its group's, for a member), alphabetical by their character's name, each tab that name;
  slid out, the paper shows "➔ <name> (Connection <Level>)" underlined over the GM's writing. An edit
  writes the record and its cell (synced) in one change; leaving it works Professional Respect out
  again, and leaving it empty buries it (R428). Which is slid out is kept in the Seat as `<npc>:o<oid>`.
  While the paper isn't being written in, a record of a PC has a White die (`.reactdie`, holding no
  text) before its "Reaction ?" line, which calls react(pc, npc) (R429), and every Opinion, a line with
  a fixed Level other than 0, a tap glyph, its source `<npc>:o<record>/<name>`, faded when Tap.leftOf
  says it is dry (R432). (R438, R603) On a player's page, and on the GM's viewing as a player, a card
  shows the records whose `on` holds it, as they reach that player (seen), each
  tab named by the record's `name`; slid out, face-down, "➔ <name>" over its revealed lines torn
  through its back, taking no caret, with no Connection, glyph or die. Leaving the paper draws it afresh from the record, its lines and marks, which
  were left alone while it was written in.
- seen(r, w) (R603): a record as it reaches this page's viewer: itself for the GM, else `redact`, as the
  GM's page would send it, and undefined when it wouldn't reach them. TableView draws pieces through it,
  and a card's records come through it; the page's own records, and everything it writes, stay whole.
- connections: the Connection Table's sheet (crc-Connections.md); placeOf gives none while it is
  `away`, so a put-away table is not drawn (R409). On the GM's page a GM card's first line opens the
  group chooser on `(` (R414).
- edit: on input, MarkedText.read the element and Game.change the record's text.
- tilt: a small random tilt, squared while the piece holds the text cursor.
- pin: a pinned sticky, text or image follows its card.

- taking (R309–R312): for a Take, the target's card turns to its back with the Attack's column at
  the front; a strip under the columns reads ‹ k of n ›, Take and Cancel, and the overflow when there
  is one ("3 left over: a Conviction", R339); the page's Slots are marked on the column as they would
  fill, and a Conviction or Burden it would start or grow is pencilled on its line.
  Take sends Rolls.take; Escape, Cancel or a click elsewhere backs out. A local view state, never
  saved.
- A Slot waiting for a name draws an empty mark with "Beauford names it" (R312).
- lasting (R341, R342, R343): under the Biases' and Afflictions' Maj slot, a line for the column's
  Conviction or Burden while the card has one: "Conviction", its tap glyph (source
  `<oid>:<damage>/lasting`), its name (written in place, waiting as a Slot's does), its Level word
  and its points in place over its top, `Sig (5/6)`, the points written in place too, and what it has
  spent. Writing its name and points away (no name, 0 points, nothing waited for) removes it. A
  column with one never collapses.

- A lone Influence (R363, MarkReader.suffers): an action line that is only an Influence and no variant
  gets no die.
- A variant (R354, R355, MarkReader.variants): its line gets `varpad` (indented under its action),
  and in place of its own die a die per alternative of the action it varies, each passing that
  alternative to useAction, so the roll is typed by it and named by the variant.
- skillIndents(front) (R331): which front lines are a Field's Skills, and which of those carry a ✓; the view gives them `sklpad` (indented) and `sklhang` (the ✓ hanging in the margin).
- toggleCheck(lines, line) (R335): the lines with that Field Skill's ✓ written (`✓ ` at the start of its text) or taken out; the same lines when the line isn't one `skillIndents` indents.
- The ghost ✓ (R334) is CSS on a `sklpad` line without `sklhang`, shown only while the card is written on; a press in an indented Skill's margin while the front holds the caret toggles its ✓ through toggleCheck and saves through the front's own `input`, as a pen does (R335).
- docket (R532, R533): a small tag of card, its name written in place in the hand font (40 characters at most), a knot at its left end whose click ties or unties it on this page (R542), and the folded corner of paper.
- the pencil (R604, R605): beside the flip, shown only where Ownership.mayWrite allows; pressed, the
  card is `writing` (a class on its element, this page's alone, gone with a reload or a rebuild) and its
  front and notes take the caret; the pencil again, Escape in its text, or a press off the card (a
  capture listener held only while writing) puts it down. Not writing, a press on an action's name
  rolls it: the die before the press in its line (each die carries its `label` and `alt`), as that die's
  click does.
- the card's writing (R566, R567): front and notes writable only where Ownership.mayWrite allows, and
  only while the card is `writing` (R604); an edit
  that changes Connections.cardName of the front sets the character's name to it.
- the tack (R568, R570, R571): every sticky, loose text and image has a `.tack`, shown while it is pinned
  to a card (TableView marks it `tacked`); a click on it unpins the paper where it lies, a drag hands it
  to Drag.startTack.

## Collaborators
- Absorb: the pages and what they fill
- Rolls: take
- MarkedText, MarkReader, BlobStore, Game, Pens

## Sequences
- seq-save.md
