# Fixes

Things the table does wrong that are known and written down as gaps in `design/design.md`, gathered
to be fixed. Opened by Bill, 2026-11-24, from gaps O9 and O12–O16 ("Those six gaps"). Gaps O1 (looks
checked by hand only) and O10 (old receipts' words) stay as gaps.

## Status

- [ ] **Item 1 — paper on a gathered card follows its pool.** **OPEN (not queued.)** Gap O16.
- [ ] **Item 2 — a change just before a reload is kept.** **OPEN (not queued.)** Gap O12.
- [ ] **Item 3 — a renamed player's own notes.** **OPEN (not queued.)** Gap O14.
- [ ] **Item 4 — digging up a burial with a note you can't read.** **OPEN (not queued.)** Gap O13.
- [ ] **Item 5 — a refused Attack says why.** **OPEN (not queued.)** Gap O9.
- [ ] **Item 6 — the tape spec's reload race.** **OPEN (not queued.)** Gap O15.
- [x] ~~**Item 7 — the name above a pool, written and tied to its card.**~~ **LANDED (2026-11-24 — `#70`.)** Bill, 2026-11-24.

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

## Decisions

DECIDED (Bill, 2026-11-24): the carve takes gaps O9 and O12–O16 ("Those six gaps"); O1 and O10 stay as
gaps.
