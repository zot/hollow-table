# Fixes

Things the table does wrong that are known and written down as gaps in `design/design.md`, gathered
to be fixed. Opened by Bill, 2026-11-24, from gaps O9 and O12–O16 ("Those six gaps"). Gaps O1 (looks
checked by hand only) and O10 (old receipts' words) stay as gaps.

## Status

- [x] ~~**Item 1 — paper on a gathered card follows its pool.**~~ **LANDED (2026-11-24 — `#73`.)** Gap O16.
- [ ] **Item 2 — a change just before a reload is kept.** **OPEN (not queued.)** Gap O12.
- [ ] **Item 3 — a renamed player's own notes.** **OPEN (not queued.)** Gap O14.
- [ ] **Item 4 — digging up a burial with a note you can't read.** **OPEN (not queued.)** Gap O13.
- [ ] **Item 5 — a refused Attack says why.** **OPEN (not queued.)** Gap O9.
- [ ] **Item 6 — the tape spec's reload race.** **OPEN (not queued.)** Gap O15.
- [x] ~~**Item 7 — the name above a pool, written and tied to its card.**~~ **LANDED (2026-11-24 — `#70`.)** Bill, 2026-11-24.
- [x] ~~**Item 8 — a thumbtack on paper pinned to a card.**~~ **LANDED (2026-11-24 — `#71`.)** Bill, 2026-11-24.
- [x] ~~**Item 9 — pinned paper jumps when its pool is dragged.**~~ **LANDED (2026-11-24 — `#72`.)** Bill, 2026-11-24.
- [x] ~~**Item 10 — Gather, and a drawer's growing, bring the card's paper with it.**~~ **LANDED (2026-11-24 — `#74`.)** Bill, 2026-11-24.
- [x] ~~**Item 11 — paper's owner: no maker is the GM's; owners reassign and share.**~~ **LANDED (2026-11-25 — `#75`.)** Bill, 2026-11-24.
- [x] ~~**Item 12 — characters in dockets.**~~ **LANDED (2026-11-25 — `#76`.)** Bill, 2026-11-25.

## Item 1

Paper pinned to a **gathered** card is left behind when its pool is carried. A gathered card is drawn
under its pool, but its record keeps the place it had when it was gathered, and Drag's pool drop moves
the pool alone; Hands carries the paper along only while the pool is in hand, so it jumps back on the
drop. Dockets' repin (R531) skips gathered cards for the same reason: their records don't say where
they are drawn. Seen 2026-11-24 by making the pool drop's change on the GM's page.

Daneel's reading, for Bill's yes: the pool's drop moves the paper pinned to its gathered card by the
pool's offset, as an ungathered card's drop does, and a gathered card's record follows its pool, so
repin can follow it too.

## Item 2

A change made in the 400 ms before a page reloads can be lost. GameStore saves `SAVE_PAUSE` after a
change, and the save main.ts starts on `pagehide` doesn't finish before a quick reload. Seen with a
"just me" note (#63), and true of every change. `tests/private.spec.ts` waits for the save before
reloading, which hides it there.

## Item 3

A player's "just me" notes keep their old name as maker after a rename. R507 rewrites names in the GM's
game, but `m:` paper is the page's own, so the new name sees no fold menu on its own notes. The page
that renames could rewrite its own `m:` paper when the rename is taken, before it reloads.

## Item 4

A player can't dig up a burial holding a private note they can't read pinned to its card: their copy
lacks the note, so the GM's page refuses the whole change rather than lose the note (R508). Rare:
someone else's note pinned to a card the player may dig up. The GM's page already puts hidden notes
back into a player's Boot Hill changes (mergeYards); digging up could put them back on the table the
same way.

## Item 5

Taking or naming an Attack that the GM's page refuses (someone else's, a stale page, one already taken)
changes nothing and says nothing to the sender: `Rolls.#take` and `#name` return without a note. A
refusal note like a roll's (R281) would say why.

## Item 6

`tests/tapes.spec.ts` flaked once in 17 runs (Chromium, 2026-11-24): `synced()` after `dana.reload()`
hit "Execution context was destroyed" while the page was still navigating. A race in the spec helper,
not the table: `synced` could wait for the page's hook to be ready again after a reload.

## Item 7

Bill (2026-11-24): "changing a name on a card doesn't affect the text above the pools and you can't edit
the text above the pools. Let's allow editing and also tie them together."

What the table has today, read from the code: a character's name (the words above its pool, and on its
card's back when face-down) is its record's `name`, separate from the card's first line. Writing the
first line never changes it, and the pool's name is drawn as plain text. Renaming an NPC's Connection
Table row sets `name` but leaves the card's first line alone. `specs/connections.md` says "Renaming an
NPC on its pool renames its row", which nothing on the pool lets you do. The scene shows how far they
drift: Sam's pool says "Sam" and his card "Samuel Diamond, Rank 3".

DECIDED (Bill, 2026-11-24): "Full name on the pool; the name is public. But about the tie: let's make
editing the name on the card reset the name at the top but allow editing the top name separately. That
way players can type in a nickname if they want to. Only the owner is allowed to edit the nickname or
the card."

- **Writing the name on the card resets the name above the pool** to it, in full: the first line's
  words before the group and the Rank ("Mistress Devreux (Unton folk), Rank 3" gives "Mistress
  Devreux").
- **The name above the pool can be written on its own**, a nickname ("Sam"), and the card keeps its
  first line. The next change to the name on the card replaces the nickname.
- **The owner and the GM write the nickname and the card** (Bill, 2026-11-24: "ah -- the GM can also
  edit it"), no one else. The name is public, as now.

DECIDED (Bill, 2026-11-24), on Daneel's two questions: **an open character is the GM's alone to write**,
its card and its nickname, until someone claims it ("that's right"); **a Connection Table rename sets the
NPC's name above its pool**, as now, and leaves its card's first line alone ("yes").

Specified in `specs/table.md` (the name above a pool) and `specs/ownership.md` (who writes a character)
as R565–R567 (#70).

## Item 8

Bill (2026-11-24): "there's no indication of whether a card it pinned -- let's add a thumbtack as a card
item (apparently they had thumbtacks but not pushpins back then)". The period holds: "thumb-tack" is
American English from the 1880s, the pushpin with its handle from 1900 (from memory, unverified).

Paper pinned to a card (a sticky, loose text or an image) shows a thumbtack where it's pinned, so
pinned paper reads as pinned and loose paper lying over a card as loose.

DECIDED (Bill, 2026-11-24), on Daneel's three questions: **the tack sits at the paper's top middle**, a
brass head with its shadow, the same on every kind of paper ("yes"); **paper in a docket has no tack**,
its red tape says so ("right"); **the tack is how paper is unpinned** ("the tack gives us a way to unpin
the paper").

DECIDED (Bill, 2026-11-24): "Once we have thumbtacks, we should make dragging the paper simply reposition
it instead of unfastening it. Pressing on the tack should show a line to center of the card it's
attached to and dragging it should let you connect to a different card or, if dragged to the table
itself, cancel the drag (esc also cancels)." And on Daneel's four questions: **a click on the tack
unpins** the paper where it lies ("yes"); **loose paper dropped on a card still pins to it**, gaining a
tack ("yes"); **a tack goes only to cards**, never to a docket ("right"); **pinned paper dragged over a
docket's tape stays on its card** ("right"). "Dragging a pinned card should show the pin line to the
card it's attached to", and "Pin lines should be the same amber color we're using for drop borders".

- **Dragging pinned paper repositions it** and it stays pinned, wherever it's let go; while it's
  carried, the pin line runs from its tack to the center of its card.
- **A press on the tack** shows the pin line; **dragged**, the line follows the pointer, and let go on
  another card the paper is pinned there; let go on the table, or Esc, nothing changes. **A click**
  (no drag) takes the tack out and the paper lies loose where it is.
- **The pin line is the aiming line's amber**, `#ffd36b`: the color of the dashed line a roll row's aim
  draws to the pool it points at, and of the dashed box round that pool (Bill, 2026-11-24, by a
  screenshot of an aim at "Name", after Daneel had read "drop borders" as `--amber`, `#f0a040`, the
  opponent's ring). Daneel's reading: drawn like that line too, 3 px and dashed, with its shadow, since
  both say "this points at that".

DECIDED (Bill, 2026-11-24, after #71, by a screenshot of the line ending at the tack's top): "make the
drag line come from the center of the thumbtack", and "under the paper is better, so it's between the
paper and the card in z-order". R569 retired for R572. And (Bill, 2026-11-24): "let's temporarily raise
the card, paper, and tack during the drag, otherwise the line can appear to be attached to an obscuring
card" (R573).

Specified in `specs/table.md` (a thumbtack holds pinned paper) as R568–R571 (#71), R572 after. Found while building:
paper whose pin was taken out kept its "pinned" mark on the page (the redraw skipped paper with no `pin`
at all), from before; fixed with the tack's own mark.

## Item 9

Bill (2026-11-24): "dragging the paper and then dragging the pool mat makes the paper jump up. Dragging
the paper after that makes it jump back down while it drags."

Daneel's guess, not yet checked: the same root as Item 1. A gathered card is drawn under its pool, not
where its record says (seen 2026-11-24: drawn at y 276 with its record at 300). A pin's offset is taken
from the card's record, but while the pool is carried, Hands holds the pinned paper at the card's drawn
place plus that offset, so the paper jumps by the difference; and the paper's own drag starts from its
record. If so, Items 1 and 9 are one fix: a gathered card's record following its pool, so the record
and the drawing agree.

Checked 2026-11-24 (#72) by a probe: Sam gathered, his record at y 300 and drawn at 275; mid-carry the
card moved 18 px and the paper 2; after the drop the card's record and the paper's stood where they were.
One fix for Items 1 and 9: a pool's drop moves its gathered card's record to where the card was drawn,
moved with the pool, and the paper pinned to it by the same offset; and pins are measured from where the
card is drawn. Specified in `specs/table.md` as R574 and R575 (#72, #73); gap O16 resolved.

## Item 10

Bill (2026-11-24): "dragging the pool mat after a gather shifts attached papers while dragging and then
unshifts them on drop. Let's add a carve item to make gather move attached notes with the same delta as
their card."

Gather snaps a card back under its pool, but only on the page: the card's record keeps its old place and
its paper stays where it was. The carry then holds the paper against the card where it's drawn (R575),
and the drop moves the paper only by the pool's offset (R574), so it shifts and comes back.

**Gather moves the paper pinned to the card by the card's delta**: from where the card was to where it
is drawn under its pool, and the card's record goes there too, as a pool's drop now does.

DECIDED (Bill, 2026-11-24), on Daneel's note that a drawer growing or shrinking moves a gathered card
the same way (R33), its paper left where it lies: **include it** ("Yes, include it"). Whenever a gathered
card is snapped to a new place under its pool, by Gather or by its drawer, its paper moves by the same
delta and its record follows.

Specified in `specs/table.md` as R576 (#74). A gathered card belongs under its pool, a page's own open roll
row left out; the GM's page keeps its record there, and `repin` now counts gathered cards, so their
paper follows on every page (the table's paper by the GM's page, each page's own "just me" paper by that
page). A pin made on a gathered card before #72 may move once, by the old gap, when the GM's page first
corrects the card's record.

## Item 11

Bill (2026-11-24), on two stickies with no maker on the GM's page: "Unowned notes should count as owned by
the GM and the GM should be able to reassign them."

Today paper with no maker (`by`), made before private paper or written straight into the game, is
everyone's: no folded corner and no ▾, so no one can change who reads it (R498). Under this item it
counts as the GM's: on the GM's page it shows the fold and the GM's ▾ (Everyone, Just me, the players),
and the GM can hand it to someone.

DECIDED (Bill, 2026-11-24): "The GM should be able to reassign visible notes": any note the GM can see,
a player's too, and their private notes while the GM views as them ([the GM's backup](backup.md), Item 3).

DECIDED (Bill, 2026-11-25): "The owner should be able to reassign ownership and also share with several
people or the whole table."

- **Reassigning hands the note over**: whoever gets it becomes its owner (its maker, `by`), with its fold
  and ▾; the one who gave it no longer is.
- **The owner reassigns**, as the GM may for any note the GM can see.
- **Every owner shares as the GM does**: Everyone, Just me, or a checklist of the players, so a player
  can share a note with several players too, not only with the GM. (The GM reads every note but a
  player's "just me", as now; with [the GM's backup](backup.md), that one too, by viewing as them.)

DECIDED (Bill, 2026-11-25), on Daneel's proposals: "those are good".

- **Paper with no maker keeps the readers it has** (everyone) when it becomes the GM's, so nothing
  changes for anyone until the GM picks.
- **The one who gave it away no longer reads it**, unless it's shared with them or with everyone: a note
  handed across a real table is gone from your hand.
- **A "just me" note handed over becomes the new owner's "just me"**, so it stays private, now to them.
- **Reassigning lives in the ▾**: a "Give to" list of the players (and the GM, for a player's note),
  beside the readers.

DECIDED (Bill, 2026-11-24): the carve takes gaps O9 and O12–O16 ("Those six gaps"); O1 and O10 stay as
gaps.

## Item 12

Bill (2026-11-25): "Let's allow characters to be in dockets -- had we ruled that out before?"

No ruling kept them out. Bill ruled that paper dropped on a card pins to the card and leaves its docket
("card is more specific") and that a docket never joins a docket ("doesn't join"), both 2026-11-24 in
[organizing](done/organizing.md). The words "a card or a chip" in `specs/dockets.md`'s list of what
never joins were Daneel's, read from that carve's "bundle of paper", with no ruling behind them; R536
("Paper (a sticky, loose text or an image) ...") follows them. This item rewrites both.

A character is more than one piece: its card, its pool and the chips in it, its drawer of Influence
cards, and the paper pinned to the card. So a docket holding one has questions paper never raised.
Daneel's readings, for Bill's yes or otherwise:

1. **What joins.** The card, let go touching the tape or on the label, as paper joins: pinned to the
   docket with its offset from the label, and the paper pinned to the card riding with it as it does
   now. Its pool stays where it is, as when a card is dragged off its pool. A gathered card (drawn under
   its pool) joins only by being dragged out first. Not sure: whether Bill means the card or the whole
   character, pool and all.
2. **Carrying.** Dragging the label carries the card and the paper pinned to it, not its pool.
3. **Burying and filing.** Burying or filing a docket leaves its characters on the table, loose where
   they lie, as a paper the page can't read is left; a character goes to Boot Hill or the desk by itself.
   Burying a docket shouldn't bury a character without anyone meaning to.
4. **Who may put one in or take it out.** Whoever writes the card: its owner or the GM, the GM alone for
   an open character (R567's rule for writing a card). So a player can't put the GM's NPC in their
   docket, and the GM's page refuses it as it refuses other changes to a card.
5. **Chips and Influence cards stay out.**
6. **Seeing.** A card in a docket shows as it does anywhere: face-down to whoever can't read it, as R535
   has a paper's own readers decide, not its docket's.

DECIDED (Bill, 2026-11-25), on Daneel's readings: **the card is what joins** (picked "The card"), and
"putting the character in the docket means the whole thing is in there, but the table just shows the
character being inside. Burying or filing the docket does so to the character, the pool mat, and any
thing attached to it. This lets a docket manage several NPCs."

DECIDED (Bill, 2026-11-25): **dragging the label carries** "card and pool and also anything attached to
the character".

So, ruled: the card joins as paper does, and the tape is drawn round the card; the character is in the
docket whole, so carrying the label carries the card, its pool mat and everything attached to either,
and burying or filing the docket takes them all (reversing reading 3). Readings 4 (whoever writes the
card puts it in or takes it out), 5 (chips and Influence cards stay out) and 6 (a card in a docket shows
as it does anywhere) stand, not contradicted.


DECIDED (Bill, 2026-11-25), on three more of Daneel's questions:

- **Characters a carrier may not move follow anyway** (picked "They follow anyway"): the GM's page brings
  them to the label, as it brings paper the carrier can't read (R531); at a real table anyone can push
  the bundle.
- **Tied, a character's card and pool pile** (picked "Card and pool pile"), on that page alone.
- **Filed, a docket goes in Papers with its characters** (picked "Papers drawer, all in"); on a
  player's desk, which takes paper only, its characters are buried, as a character dropped there is.
