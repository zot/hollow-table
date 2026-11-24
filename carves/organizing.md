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
- [x] ~~**Item 4 — dockets.**~~ **LANDED (2026-11-24 — `#66`.)** After Item 3.
- [x] ~~**Item 5 — search and the list of names.**~~ **LANDED (2026-11-24 — `#67`.)** After Item 3.
- [x] ~~**Item 6 — the GM's desks.**~~ **LANDED (2026-11-24 — `#68`.)** After Item 3.
- [x] ~~**Item 7 — desktops and the knife switch.**~~ **LANDED (2026-11-24 — `#69`.)** After Item 6.

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
label piece taken from its own pigeonhole like a sticky. Its papers lie inside **red tape**: a red
cord drawn under them, knotted at the label, round the convex hull of their corners and the label's,
pushed out by a radius so each corner is an arc and the runs between are straight. Paper dropped
inside the tape or on the label joins the docket and travels with it when the label is dragged. A
paper dragged within the tape just moves, and the tape refits when it's let go; while it's carried,
the tape holds still as the other papers give it, and a paper let go still touching the tape stays,
so the tape grows to take it. One dragged entirely clear comes off, and the tape shrinks back to show
it before it's let go. No selecting several, no lasso. Filed, a docket goes in the Papers drawer with
its papers and comes back with them laid out as they were. Anyone can make one, and a player's docket
follows that player's paper rules, folded corner and all.

### Item 4's decisions

DECIDED (Bill, 2026-11-24): "Pin to a docket". *(Its pigeonhole makes six on a player's desk and seven on
the GM's.)*

DECIDED (Bill, 2026-11-24), on moving a docket's papers without taking them off ("I'd like it to be
possible to move attached things around without detaching them ... make an outline that expands as
items are added"): the outline is **red tape** ("red tape"), and **"intersecting the line count[s] as
'inside the docket'"**. Its shape is **"a smoothed polygon convex hull formed from the padded bounding
box corners of the items"**, smoothed by **rounding with a radius** ("rounded by a radius sounds good
and also simple, let's use that"), which keeps it convex. So whether a paper touches the tape is
exact arithmetic on the hull, done in table coordinates with no library and no DOM: the
separating-axis test for overlap, and otherwise the nearest edges within the radius and half the
cord's width. Each page draws the tape round the papers it reads, so its size never shows a note
hidden from that page.

DECIDED (Bill, 2026-11-24): **the touch test**, Bill's steps for a polygon, run on the bare hull, with
a last step that handles the rounding:

1. If the item's box misses the hull's bounding box padded by the radius, false.
2. If any corner of the item's box is inside the hull, true.
3. If any vertex of the hull is inside the item's box, true.
4. If any edge of the item's box crosses an edge of the hull, true.
5. Otherwise the two are disjoint and convex, so their nearest points are a vertex of one and an edge
   of the other: true when the least distance from a hull vertex to a box edge, or from a box corner
   to a hull edge, is within the radius and half the cord's width.

Pure geometry with its own unit tests. Step 5 makes the arcs exact and takes in edges that only graze.

DECIDED (Bill, 2026-11-24): **a docket's paper dropped on a card pins to the card** and leaves the
docket ("card is more specific"); **a docket dropped inside another's tape doesn't join it** ("doesn't
join"): no dockets inside dockets.

DECIDED (Bill, 2026-11-24), on Daneel's three questions: **a paper's own readers decide who sees it,
not its docket's** ("the paper itself, not the docket, determines visibility"), so a public paper in a
docket only the GM reads lies loose on the players' pages; **a docket filed or buried by a page that
can't read one of its papers leaves that paper on the table, loose where it lay**, as hidden notes are
left on Boot Hill ("yes"); **only the label carries the whole docket**, with no grip on the tape
("yes"). Settled alongside them, unless Bill says otherwise: being in a docket is recorded, a pin
with an offset as on a card, and the tape is drawn from the pins, so every page agrees on who's in
it; the label's name is written as a pool's is, and an empty docket's tape runs round its label;
whoever reads a docket may add to it and take out, and adding someone's paper doesn't change its
maker; burying a docket takes its papers, as filing does; where tapes overlap, a drop joins the
docket on top.

DECIDED (Bill, 2026-11-24): **a docket can be tied up**, each page's own ("clicking the label piling
the papers together and binding them? Just a visual trick -- not actually moving the papers around
for the other players"). A click on the **knot** at the label ties and unties it, leaving the label
to its name and its drag. Tied, the papers it reads pile squarely under the label, offset a little
like a real stack, with the red tape crossed over them in a bow; untied, the tape lies loose round
them again. A tied bundle is closed: a drag anywhere on it carries the whole docket, and a paper is
got at by untying. A paper dropped on it joins at the offset it was dropped at, piled on this page and
laid out where it fell on the others. It stays tied through a reload, as this page's own state, and
others keep moving its papers meanwhile, which shows when it's untied. **No count** ("no count, the
thickness says enough").

Specified in `specs/dockets.md` as R532–R545, with the docket's pigeonhole and paper following its
holder on every page in `specs/table.md` as R529–R531 (#66), retiring R509 and R511.

@undecided: Daneel's reading while building #66, settled by Bill's yes or undone at his no: the GM's
page lets a docket's paper loose only when the docket was **deleted** (it holds its tombstone). A
docket merely not on the GM's page, a player's "just me" docket, keeps the table's paper pinned to it,
and that paper is left where it lies.

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

Specified in `specs/desk.md`, *Finding*, as R546–R549 (#67). Built before Item 6, a result says its
drawer alone ("NPCs"); with several desks it will say its desk too ("Act 2: NPCs").

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

Specified in `specs/desk.md`, *The GM's desks*, as R550–R556 (#68). Until Item 7 sets a desk out, the
board's first desk is the one open, as Bill put it ("Yes, the current desk"); the knife switch's mark
comes with Item 7. A desk saved before #68 (one list of entries) reads as "Desk 1".

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

DECIDED (Bill, 2026-11-24), on Daneel's three questions before #69: **the Connection Table is one per
game**, never a desktop's ("one per game -- it's supposed to track all the NPCs in the story"); **a new
desk's desktop starts empty**, the travelers where they lie ("yes"); **the board's first desk is the
one set out**, replacing the open desk #68 used until there was a switch ("yes"); and, as Daneel
proposed, **everything not named as travelling stays with its desktop**: NPCs, the GM's paper
(handouts too), the GM's dockets, loose chips and cards, and the reference card ("Yes, your other
decisions were good").

Specified in `specs/desk.md`, *Desktops and the knife switch*, as R557–R564 (#69), retiring R554 (the
board's open desk first) for R562 (the desk set out first). The desk set out is never empty, so › from a
fresh Desk 1 makes Desk 2 at once, where #68 waited for something filed or a name.
