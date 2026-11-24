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

DECIDED (Bill, 2026-11-24): the carve takes gaps O9 and O12–O16 ("Those six gaps"); O1 and O10 stay as
gaps.
