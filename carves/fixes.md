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
- [x] ~~**Item 13 — reference pages, each page's own.**~~ **LANDED (2026-11-25 — `#77`.)** Bill, 2026-11-25.
- [ ] **Item 14 — a pencil to write on a card.** **OPEN (not queued.)** Bill's playtest, 2026-11-27.
- [ ] **Item 15 — loud presence changes.** **OPEN (not queued.)** Bill's playtest, 2026-11-27.
- [x] ~~**Item 16 — what an Opinion shows, reaching the wrong pages.**~~ **LANDED (2026-11-27 — `#81`.)** Bill's playtest, 2026-11-27: viewing as a player, the GM's page drew records whole.
- [x] ~~**Item 17 — "You are" without leaving the table.**~~ **LANDED (2026-11-27 — `#79`.)** Bill's playtest, 2026-11-27.
- [x] ~~**Item 18 — a desk that looks like a desk.**~~ **LANDED (2026-11-27 — `#78`.)** Bill's playtest, 2026-11-27.
- [x] ~~**Item 20 — the table asks in its own page, not the browser's dialogs.**~~ **LANDED (2026-11-27 — `#80`.)** Bill, 2026-11-27. (Item 19, a player's White die, was withdrawn: it works as ruled.)

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

## Item 13

Bill (2026-11-25): "I don't see how to make a skill use reference card once it's removed." The printed
actions card ("SKILL USE / ACTIONS") is a `reference` record that only the playtest seed makes
(`src/store/playtest.ts`): the desk has no pigeonhole for it, and once put away, it vanishes (R288) and
nothing makes another. The specs never made it a supply: every supply list says "the reference card",
meaning "How to play the table". Bill (2026-11-25): "Maybe put it on the back of the how to play card."
Then: "reference cards seem special to me -- I think they shouldn't be shared, just local to each peer.
Also, new peers should get a how to play card on their table automatically."

DECIDED (Bill, 2026-11-25), on Daneel's readings: "Those are good".

- **A reference card is each page's own**, as a "just me" note is: never sent, kept through reloads,
  its moves never shown on another page. At a real table every player has their own player aid, and
  putting yours away or turning it over doesn't touch anyone else's.
- **The actions are on the back of the "How to play the table" card**, turned at the corner as a
  character card is; turning it is this page's own. So the pigeonhole's card carries both.
- **Every page gets a "How to play" card once per game**, the GM's too, on open table in view when it
  arrives. Put away, it doesn't come back on a reload; the pigeonhole still gives another.
- **The shared reference cards already in saved games go**: the GM's page deletes them from the game
  (the playtest seed's actions card, `o:00000009`), since every page now has its own.

Bill (2026-11-25), on two more quick-reference sheets from the rules: "Maybe we should change the
format to a page, rather than a playing card because some of them are larger." The two:

- **Making rolls**: Compare total Influence (the +10 to −10 table), the White / Green / Red result,
  Blue + Yellow + bonus, CRIT!, then Actions, Concessions, Special Influences (the Stagger, Edge and
  Bias pools) and Stagger. Its Actions section is the actions card's text, grown. Not found in the
  Markdown exports or anywhere as text under `HollowRpg/`: it is a figure, Bill (2026-11-25):
  "Bunkum.pdf pages 20 and 21". Read there 2026-11-25 (pdftoppm through mise): PDF page 21, the
  book's page 18, is "APPENDIX B: QUICK REFERENCE", matching Bill's screenshot.
- **Bunkum's character building**: "APPENDIX A: QUICK CHARACTER CREATION", PDF page 20, the book's
  page 17: "Some 16XP Attribute combinations" (the Cha / Int / Wis table) and "Example Fields"
  (`Bunkum.md`, from line 354), Bunkum's own.

Daneel's readings, for Bill's yes or otherwise:

1. **A reference page, not a card**: a sheet the shape of a printed page, in the reference font (R3),
   that the table's zoom brings close enough to read. It stays each page's own, by the rulings above.
2. **One sheet with pages to turn**, "‹ 1 of 3 ›" at its foot, the way a tape's pages turn
   (`rolls.md`): How to play the table, then the book's Quick Reference and Quick Character Creation
   under its own titles. That replaces the front-and-back card, since the Quick Reference holds the
   actions. The pigeonhole and the one given per game
   are this sheet, opened at How to play.
3. **Quick Character Creation is on every sheet for now.** Its Fields and costs are Bunkum's, but a game
   doesn't record its setting: the table already plays Bunkum's rules, the Connection Table among them,
   in every game. Showing it only in Bunkum games would first need a game to say which it is, a
   change of its own.
4. **The text is the book's**, checked against Hollow Folks (dice, Levels, CRIT!) before it is built,
   with the book winning where a sheet disagrees.

DECIDED (Bill, 2026-11-25), on the four readings above: "Those are good". A reference page, each page's
own, with pages to turn: How to play the table, then Bunkum's Quick Reference and Quick Character
Creation under their own titles, on every sheet for now, the text the book's, checked against Hollow
Folks before it is built.


Found checking the Quick Reference against Hollow Folks (2026-11-25): the books read the Resolution Die
differently. Hollow Folks, *3. Resolve the Outcome*: 1-2 Fail, 3 Succeed at Cost, 4-6 Succeed; the
table's dice do this (R91). Bunkum's Quick Reference: 1-2 Fail, 3-4 Success with cost, 5-6 Clean
Success, as Bunkum's worked example has it (Jane's White 3, Green 4: "Succeed at Cost"). Bill
(2026-11-25): "I think I adjusted that because the players were complaining that Stagger happened too
often. So I went to the old standby of 50% success. I'm still on the fence about this." Not ruled.
Meanwhile the sheet says what the table rolls: its Making Rolls reads 4-6 Success, 3 Success with cost,
1-2 Fail, the rest of Bunkum's sheet as printed; if Bill rules 3-4, the dice and the sheet change
together.

DECIDED (Bill, 2026-11-25), after simulating it in another session: "4-6 is a clean success and only a 3
is succeed at cost". Hollow Folks and the table's dice (R91) already read it so; Bill saved Bunkum.pdf
with page 18, the Quick Reference, updated to match ("4-6: Clean Success", "3: Success with cost"), so
the sheet copies the book with no exception and the dice code needs no change.

## Items 14 to 18: playtest feedback

Bill's notes from a playtest (`.scratch/NOTES.md`, 2026-11-27), one item each, checked against the table as
it was that day.

## Item 14

Bill (2026-11-27): "pencil button to edit cards -- play tester clicked name to activate an action instead
of clicking the blue die. The card switched to edit mode. A pencil icon for edit mode would remove
ambiguity."

What the table has today, read from the code: a card's front is always open to write for whoever may
write it (R567: its owner and the GM), so any press on its words, an action's name included, puts the
caret there. An action is rolled only from the die glyph before it (`frontGlyphs`, `piece.ts`; "Roll
this: …"). A pencil would make writing a mode the card enters on purpose. To decide: whether the pencil
is on every card or only shown to its writers; whether a press on an action's name then rolls it, or
does nothing; whether the back's notes wait for the pencil too; and how writing ends (Escape, a press
elsewhere, the pencil again).

## Item 15

Bill (2026-11-27): "LOUD presence warnings -- I changed 'you are' from GM to another player and it
disconnected me but I wasn't looking at the top bar and didn't notice the presence changes. We need a
note in the top bar to show presence changes."

What the table has today (`specs/network.md`, Presence): presence shows only in the name tags, a dot
that dims after 25 s unheard and a tag that goes after 60 s, and "offline" with why on the page that
lost the table. Nothing announces an arrival, a departure or this page's own disconnection. To decide:
which changes get a note (someone arriving, leaving, going quiet; this page offline), how long it stays,
and where in the bar. The disconnection here came from "You are" reloading the page (Item 17).

## Item 16

Bill (2026-11-27): "info about Opinions seems to propagate incorrectly"

Not yet reproduced: which page showed what, and what it should have shown. What reaches a page about
an Opinion today: the Opinion Records revealed to it by a successful Infer, drawn in the card's folders
(R419, R421, R438; `carves/done/infer-reveals.md`), redrawn on every page when a record or the
Connection Table changes. The item starts from a repro: who inferred, what was revealed, and which
page showed more or less than that.

Found (2026-11-27). Bill: "A new opinion sheet was sent entirely revealed"; then "Switching 'you are'
doesn't show Opinion redaction properly", and, a real player's page reloaded, "it still does not show
the Opinion card for Beatrice, which is as it should be". So the wire is right: what reaches a
player's page is redacted (R435). The fault is the GM's page viewing as a player: it holds every record
whole, and its views drew them as held. A card's records came from the Connection Table, which the GM's
page always has, with their full text, so viewing as a player showed every record and every line. The
same went for the Connection Table itself (R410) and paper the viewer doesn't read (R501), and Boot
Hill's burials.

DECIDED (Bill, 2026-11-27): viewing as a player, the GM's page draws each record as it would reach that
player ("I think that's correct"), all of it, not Opinions alone ("Everything"): the pieces on the
table, a card's records (found, as a player's page finds them, by the cards they're published on), and
Boot Hill's list. Only the drawing: the page's writes keep the whole records, so nothing written back
is ever the redacted copy.

## Item 17

Bill (2026-11-27): "switching views disconnects from the p2p network -- does it need to disconnect?"

What the table has today: choosing someone in "You are" saves the choice in the GM's seat and reloads
the page (`main.ts`, R153; `crc-Folks.md`), so the GM's page leaves the room and joins it again, and
every page sees the GM go and come back. The reload is there because the page's viewer is fixed when
it starts: every view, and what the page lets itself do, is built for that viewer. It need not leave:
the GM's page holds the whole game whoever it views as, and what it sends doesn't depend on the view,
so switching could redraw the table for the new viewer while the connection stays. The work is making
the viewer changeable in place.

DECIDED (Bill, 2026-11-27: "Rebuild them"): on a switch the page keeps its connection (room, presence,
authority, rolls, images and moves, none of which reads the viewer) and builds its views again for the
new viewer, rather than redrawing the old ones for a viewer that changes under them: building afresh
gets every decision made at construction right without finding each one. The old views are torn down
first, by one `AbortSignal` per build that ends their document and window listeners, their game
subscriptions, their intervals and the table's ResizeObserver; the page's body goes back to its
starting `#bar`, `#table` and `#world`. Measured 2026-11-27 (by grep, a sizing, not a census): 27
document or window listeners in eight view files plus `main.ts`'s own, 11 `game.listen` calls, 2
intervals, 1 ResizeObserver.

## Item 18

Bill (2026-11-27): "better desk image -- the desk image in the top bar confused the play tester; they
didn't know what it was"

What the table has today: the desk is a little roll-top drawn right after the wordmark (R591, R510;
`desk.ts`), titled "The desk: press for paper; click to open it", which only shows on hover. Shut, its lid
hides the pigeonholes, the one thing that would say "desk".

DECIDED (Bill, 2026-11-27): a small writing desk after a photo Bill chose (a gallery of arched pigeonholes
and three little drawers over a green leather top, two drawers below, four tapered legs), drawn from a
little above so the green shows, with paper standing in its pigeonholes: "Yes, B". Version B of the
mockup in `.scratch/desk-mock/index.html` (an SVG at the bar's 66 × 58, on the bar's colors): white,
yellow and manila edges in the four openings, the paper the desk hands out, the brightest thing on it at
bar size. Drawn, not the photo: its rights are unknown and a photo would sit oddly in the drawn bar.

DECIDED (Bill, 2026-11-27: "the three suggestions look good"):

- On hover the pigeonholes light (the roll-top's slats did the same job); the mockup's pulled drawer
  (version C) read as a shelf and is dropped.
- The board of desks (R562) draws a little roll-top for each desk; it takes the new desk too.
- The legs take a third of its height; if it looks slight beside the wordmark in the real bar, it
  takes a few pixels more width.

## Item 20

Bill (2026-11-27), trying the table in the Claude Desktop browser pane: "the Claude Desktop browser seems
to have trouble connecting to other peers in the same machine and clicking 'copy invite' doesn't put
the link in the clipboard"; then "Yes, write it up".

Measured in the pane that day (its user agent says Chromium 156): `prompt()` throws "prompt() is not
supported", the clipboard-write permission is denied, and WebRTC gathers host (`.local`) and
server-reflexive candidates as Chrome does, so the connection itself is probably not at fault. The
table calls the browser's dialogs in six places (`grep prompt(\|confirm(` over `src/`), and each fails
the same way where dialogs are off:

- `main.ts`, `askName`: an invited page asks its player's name with `prompt()` as it starts. In the
  pane that throws, so the player's page stops before it joins the room; likely the "trouble
  connecting". Not yet watched failing.
- `folks.ts`, Copy invite: when the clipboard refuses, the fallback shows the link with `prompt()`,
  which throws, so nothing shows at all.
- `main.ts`, a player's rename and the GM's rename (`prompt()`): nothing happens.
- `ledger.ts`, naming a checkpoint (`prompt()`): the checkpoint fails.
- `folks.ts`, handing a held name to this browser (`confirm()`): it fails.

The table asks in its own page instead: a small form in the page for each question, answered or
cancelled as the dialog was, and the invite link shown in the page, selected, when the clipboard
refuses. To decide: one shared little form for all six, or each where it is asked (the name on
arrival before anything else is drawn; a rename by its tag; a checkpoint's name in the Ledger); and
how the invite link shows (beside the button, selected for a copy).

DECIDED (Bill, 2026-11-27): "One shared form": a small card centered over the page, as `prompt()` was:
the question, a text line (or Yes and No), OK and Cancel; Enter answers, Escape cancels; all six use it.
And the invite link "Under the button": when the clipboard refuses, a text line just below Copy invite
holds the link, selected for a copy; a press elsewhere or Escape puts it away.

