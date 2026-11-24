# Organizing

Putting things away without burying them, finding them again, and setting out a scene. Bill
(2026-11-23): "The GM needs to be able to put away / remove / archive players and NPCs and look them
up and restore them. Also named groups of objects: notes, text, images. The name should be a caveat
text object like we have above the character pools. Let's have a rolodex item for the GM screen or
maybe there's a more appropriate Old West themed organizer."

Opened by Bill, 2026-11-23, and worked out with Daneel over 2026-11-23 and 24.

## Status

- [x] ~~**Item 1 — private paper.**~~ **LANDED (2026-11-24 — `#63`.)** First: paper gets an owner, which Items 3 and 7 need.
- [x] ~~**Item 2 — the desk and its pigeonholes.**~~ **LANDED (2026-11-24 — `#64`.)**
- [x] ~~**Item 3 — drawers and filing.**~~ **LANDED (2026-11-24 — `#65`.)** After Items 1 and 2.
- [ ] **Item 4 — dockets.** **OPEN (not queued.)** After Item 3.
- [ ] **Item 5 — search and the list of names.** **OPEN (not queued.)** After Item 3.
- [ ] **Item 6 — the GM's desks.** **OPEN (not queued.)** After Item 3.
- [ ] **Item 7 — desktops and the knife switch.** **OPEN (not queued.)** After Item 6.

## What the table has today

- **Boot Hill** (`specs/boothill.md`) puts things away and brings them back: dropped on the bar,
  buried in named graveyards flipped with ‹ ›, dragged out to restore, deleted forever by two
  shift-clicks. It is the table's: players see the burials' names and can dig them up, and it reads
  as gone, not offstage.
- **Paper pins to a card** and travels with it; nothing else gathers pieces, and there is no
  selecting several at once.
- **Paper has no owner.** Every sticky, loose text and image is seen by everyone.
- **"Group" is taken**: an NPC group (`specs/connections.md`) is the parenthesized word on an NPC's
  card that shares a Connection Table row. This carve's bundle of paper is a **docket**.

## Decisions

DECIDED (Bill, 2026-11-23): **the organizer is a pigeonhole desk** ("Pigeonhole desk"), over a hotel's
key rack (public), a strongbox (no compartments) and the Rolodex (1956, so out of period; the date is
from memory). The roll-top desks of the 1870s (the Wooton "patent desk" among them, also from memory)
are the picture: pigeonholes for blank stock, drawers for what's kept, a top that rolls down.

DECIDED (Bill, 2026-11-23): **the desk sits beside Boot Hill** ("Beside Boot Hill"). Boot Hill stays the
table's undo, public, graveyards and all; the desk is for keeping. Two named lists that flip alike,
shared in code only if carrying both becomes a burden.

DECIDED (Bill, 2026-11-23), his proposal: "what if we put the character, note, text, etc. tools into
the desk and put the desk right after Hollow? Clicking the desk could enlarge it a bit, with the pigeon
holes for the supplies and drawers for accessing things you put away. The GM would get an extra NPCs
drawer." So **every page has a desk**, right after the wordmark, its pigeonholes holding the supplies
and its drawers what's put away. Only the GM has several desks (Item 6).

DECIDED (Bill, 2026-11-23): **two drops on the bar** ("Agreed"). Dropped on the desk, a piece is filed in
its drawer; anywhere else on the bar it's buried on Boot Hill as today. The "→" hint names which: the
drawer, or the graveyard. Boot Hill is for throwing away, the desk for keeping.

DECIDED (Bill, 2026-11-23): **drawers are fixed by kind** ("fixed by kind"), named bundles living in a
drawer as dockets (Item 4) rather than drawers the user names.

## Item 1

Private paper. Bill (2026-11-23): "there should be a way for a player to make things they put on the
desktop private. Maybe an eyeball icon like the GM gets? Maybe a dropdown arrow to let them reveal
only to the GM. The GM could write on it as well to answer a quick question." Paper gets an owner,
whoever made it, and one of three audiences: everyone, the GM (or, for the GM's paper, chosen
players), or just its owner. It's the note passed across a real table, and the GM's handout.

- **A folded corner** shows it: flat for everyone, folded for private, with a dropdown beside it.
  A player's dropdown offers the GM, or just me; the GM's is a checklist of the players, the note
  going to each one checked ("you two notice…"). A GM's note to no one stays on the GM's page.
- **By the fold, the names it went to**, as tags in the hand font: "Sam, Dana", "GM", "me".
- **Answers go both ways**: the GM can write on a player's note to the GM, and a player on a GM's
  note sent to them; on a note to several players, everyone it went to sees the answer.
- **Other players' pages don't get it at all**, not even face-down. Pinned to a public card, it rides
  on that card only on the pages that hold it.
- **A "just me" note is a local piece** of its owner's copy of the table, as a torn tape is: never
  sent, kept through reloads on that page, and not in the game the GM saves. A note to the GM goes to
  the GM's page like any piece, and to no other.

Specified in `specs/ownership.md`, *Private paper*, as R498–R508 (#63).

@undecided: four calls Daneel made while building #63, each settled by Bill's yes or undone at his no:
the GM's menu has a **Just me** choice (the GM alone, the same as no box checked, and the only way to
reach it with no players at the table); its checklist also holds **anyone the note already went to**,
and a name stays while the menu is open; the tags name **everyone who reads it but the viewer**, so
Sam sees "GM, Dana" on a handout to him and Dana; and a note only the viewer reads shows **"me"**, the
GM's to no one included.

### Item 1's decisions

DECIDED (Bill, 2026-11-23), on Daneel's questions:

- **Unseen, not face-down** ("Don't see it at all"), over Daneel's face-down proposal.
- **"Just me" on the player's page only** ("Player's page only"): the GM's page holding a note it
  doesn't show would be hidden only in the view.
- **A folded corner, not an eye** ("Let's do a folded corner -- the GM should get that and their
  dropdown shows the player list instead of a GM option"): on the GM's page an NPC's eye already
  means reveal mode.
- **Several players** ("Several players"), **answers both ways** ("Yes, both ways"), and **names by the
  fold** ("Names by the fold"; Bill: "Each player should get a highlight with their name or some way
  to indicate them"), with no player colors.
- **In this carve** ("Keep it here"), and first, since the desk's travelling paper (Item 7) needs
  paper to have an owner.

DECIDED (Bill, 2026-11-24), on Daneel's question while designing: **a buried private note is hidden
from Boot Hill too** ("Nothing"), over a nameless "Private note" entry or burying it on the burying
page alone. A player who can't read it sees no burial, and the GM's page keeps it where it lies when
that player's Boot Hill changes.

## Item 2

The desk and its pigeonholes. The desk sits on every page's bar right after the wordmark, and the
supplies leave the bar for its pigeonholes: character, sticky, loose text, image, the reference card,
and on the GM's page the Connection Table (a docket's pigeonhole joins them in Item 4). The chips stay
on the bar.

- **Pressing the desk shows only the pigeonholes**, a strip opening below it:

  ```
  +-----------------------------------+
  | [character] [note] [text] [image] |
  +-----------------------------------+
  ```

  Dragging across them shows each one's piece small, in hand.
- **Dragging out of the strip** makes the piece at its full size, carried as any piece is.
- **Letting go in a pigeonhole also makes it**, and it follows the pointer with no button held until
  the next press puts it down. A press on the bar instead deletes it, and so does Esc. The wheel and a
  pinch still zoom, the piece staying under the pointer; a press on another piece puts yours down
  there rather than picking that one up.
- **The image pigeonhole opens the file picker when you let go in it**: the release ends a click, which
  a browser lets open a picker. A cancelled picker makes nothing; a chosen image arrives carried.
- **On touch**, a piece let go in its pigeonhole lands just below the strip, ready to drag, since a
  lifted finger leaves nothing to follow.
- **Clicking the desk itself** (pressing and letting go without moving) opens the whole desk: the
  pigeonholes, and the drawers below them (Item 3).

Specified in `specs/table.md`, *The bar*, as R509–R518 (#64), retiring R18, R287, R304, R408 and R453.

### Item 2's decisions

DECIDED (Bill, 2026-11-23), on the strip: "I'd show just the pigeon holes at first, letting the user
drag over different pigeon holes and showing a small version of the thing they're dragging according
to its pigeon hole ... Once they drag free of the containing rectangle, the current thing they're
dragging becomes the large version of it that actually shows on the table. If they actually click the
desk, it also shows the drawers."

DECIDED (Bill, 2026-11-23): "releasing inside the strip makes the item and starts moving it around on
the tabletop, releasing it with a mousedown. The user can move up to the bar and press to delete it.
This handles images because when you release inside the image pigeon hole, it can pop the file
opener." On touch, "Just below the strip".

DECIDED (Bill, 2026-11-23): **the chips stay out** ("Chips stay out"): handled all game, and poker chips
rather than stationery. **The reference card and the Connection Table go in** ("Into pigeonholes").

DECIDED (Bill, 2026-11-24, "These are all good"): Esc, zooming and pressing on another piece while
carrying, as above.

DECIDED (Bill, 2026-11-24, on Daneel's question while building #64): **the image dragged out of the strip
opens the picker where it's let go** ("Picker on drop"): the small image follows the pointer, and letting
go on the table opens the file picker, the image landing there. A browser opens a picker only for a
while after a press, so a very slow drag may open none.

## Item 3

Drawers and filing. Dropped on the desk, a piece is filed in the drawer for its kind, and dragged out
of the drawer it comes back where the pointer is, as from Boot Hill. Taking a filed piece out of the
desk while it's open works the same way.

- **The GM's desk** has Characters, Papers and NPCs drawers. A PC the GM puts away goes in
  Characters, and comes back to its player, its name on the die; if that player is away it waits for
  them, and the GM can still open it by shift-click as now. NPCs are the GM's own people.
- **A player's desk** has a Papers drawer only: a character is the GM's game, so a player can't file
  one.
- **What a player files is theirs alone**, kept on their page as a "just me" note is (Item 1): never
  sent, kept through reloads there, not in the game the GM saves. Clearing that browser loses it.
- **A filed NPC takes everything with it**, as burying does: its pool and card, its Info cards and
  Opinion Records, and the paper pinned to it. Taking it out brings them all back. Its revealed
  entries stay revealed and its Connection Table row stays.
- **Secrecy is on the wire**: while it's filed, players' pages don't hold an NPC's card. Players see
  a piece leave the table, as at a real one, and nothing of what's in the drawers.

### Item 3's decisions

DECIDED (Bill, 2026-11-23): **a player's drawers are the player's only** ("Player only"), over Daneel's
"player and GM". DECIDED (Bill, 2026-11-24): **paper only** ("Paper only"); **a PC comes back to its
player** ("Back to its player"), filed in the GM's Characters drawer ("These are all good"); **a filed
NPC takes its records with it** ("All go with it").

Specified in `specs/desk.md` as R519–R528 (#65).

@undecided: Daneel's reading while building #65, settled by Bill's yes or undone at his no: a filed
NPC takes its Info cards and revealed entries (they are on its card) but **not its Opinion Records**,
which belong to its row of the Connection Table rather than its card; the row stays, so they stay in the
game and show under the card again when it comes back. Taking them would leave the Table's cells
pointing at records that are gone.

## Item 4

Dockets: the named bundle of Bill's opening, its name written in Caveat like a pool's. A docket is a
label piece taken from its own pigeonhole like a sticky. Paper dropped on it pins to it as paper pins
to a card, travels with it, and comes off when dragged away; no selecting several, no lasso. Filed,
it goes in the Papers drawer with its papers and comes back with them laid out as they were. Anyone
can make one, and a player's docket follows that player's paper rules, folded corner and all.

### Item 4's decisions

DECIDED (Bill, 2026-11-24): "Pin to a docket". *(Its pigeonhole makes six on a player's desk and seven on
the GM's.)*

## Item 5

Search and the list of names. A field at the top of the open desk, live as you type, matches names
and the words on filed things (a sticky's text, a character card's words) across every desk, names
first. Each result shows its desk and drawer ("Act 2: NPCs") and drags out as from a drawer. With
nothing typed, the field lists every filed name in every desk, alphabetical, each with its desk and
drawer; typing narrows it, clearing brings it back. A page searches only what it holds, so a player
finds only their own paper.

### Item 5's decisions

DECIDED (Bill, 2026-11-24): "words too for a typed-in search but we should also have a way to present a
list of names to the GM", and that list is the empty search ("Empty search shows it").

## Item 6

The GM's desks. The GM can keep several desks, as Boot Hill keeps graveyards: the open desk shows ‹,
its name and ›; a new desk is numbered one past the highest "Desk N"; an empty, nameless desk
disappears when you leave it; there is always at least one. Every desk has the same pigeonholes; only
its drawers (and its desktop, Item 7) differ. A player has one desk, with no arrows. Flipping through
the GM's desks only browses their drawers, privately.

Filing goes by a list. Carrying a piece over the desk with more than one desk drops a list of them
below it: let go on the desk and the piece is filed in the first, or drag down the list and let go on
another. The desk set out (Item 7) is first, then the rest in order. The drawer follows the piece's
kind, and the "→" hint names both: "→ Act 2: NPCs".

```
  [desk]                <- the desk on the bar
  +------------------+
  | ╓──╖  Act 2   ⏚  |  <- set out: a tiny closed knife switch
  | ╓──╖  Act 1      |
  | ╓──╖  Desk 3     |
  +------------------+
```

- **A walnut board hangs below the desk**, as the brass tray hangs below the Opposition plate: one row
  per desk, each at least 44 px high, since it's a drop target and touch aims with a finger.
- **Each row is a miniature roll-top and its name**, the name in Caveat in a small brass label holder,
  like the card holders on old file drawers (period for 1880s office furniture from memory,
  unverified).
- **The desk set out is first, marked by a tiny closed knife switch.**
- **The desk under the carried piece rolls its lid up**, and down again when the piece leaves it: the
  list's one motion.
- **No scrolling until it's earned**: past about six desks the board would need it.

### Item 6's decisions

DECIDED (Bill, 2026-11-23): "Act 2 does give me an idea -- why not more desks, just like graveyards. We
could show arrows and a desk name when you click it to expand"; "Same rules"; only the GM's ("GM's desks
only", since a desk carries a desktop, Item 7).

DECIDED (Bill, 2026-11-24): "When there's more than one desk, let's pop down a list of desks so if the GM
drops on the desk it goes into the first one, but they can drag down to drop into another desk"; the
first is the one set out ("Yes, the current desk"); its look as drawn ("Yes, let's record that design").
The hint naming desk and drawer, and identical pigeonholes: "These are all good".

## Item 7

Desktops and the knife switch. Each of the GM's desks carries a desktop: what lies on the table while
it's set out. Bill (2026-11-23): "let's associate the desktop with the desk. Switching desks switches
the desktop contents. The PCs are present on all desktops but switching desks moves the PCs to where
they are for that desk."

- **A knife switch beside the open desk sets it out**: thrown, everyone's table switches to that desk's
  desktop. It can be thrown only for a desk that isn't set out, and the open desk marks which is. Laying
  out a desktop means setting it out, so Act 2 is arranged before the session or at a break.
- **Players' pages hold only the desktop that's set out.** Another desk's NPCs and papers reach them
  when it's set out, not before.
- **What travels**: the PCs, with their pools and what's pinned to them; open characters, waiting to be
  picked up; and each player's own paper, as a real GM clears the scene and players keep their notes.
  Each has a place of its own on each desktop.
- **Setting out isn't a scene's end.** End does that, as now, so a split party can be flipped between
  within one scene.

### Item 7's decisions

DECIDED (Bill, 2026-11-23): "Separate set-out. Let's put a Frankenstein switch next to the expanded GM
desk"; "Travels with player"; switching is "Independent" of ending a scene. DECIDED (Bill, 2026-11-24):
the switch only for a desk not set out, and open characters travel ("These are all good").
