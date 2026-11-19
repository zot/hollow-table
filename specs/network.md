# The table over the wire

Browsers talk to each other directly over WebRTC (Trystero). Public Nostr relays only introduce
them. Nothing to install, no local-network grant, no daemon.

## Rooms and invites

- **Open the table** makes a room. The room name is random (about 128 bits) and is the capability:
  whoever has the invite can join, and nobody else hears anything.
- **Copy invite** copies a link carrying the room and the GM's browser id, and says "Copied" for about a
  second (if the clipboard refuses, the link is shown to copy by hand). Shift-clicking it closes
  the table. Arriving by an invite asks for your name until you give one that isn't "GM" (cancel
  gives "Player"). The GM's own URL is never rewritten (reloading an invite would demote the GM); the
  GM's room is remembered per game.
- The page pins a list of relays that answered, the same on every page, so any two pages share them.
- **Relays come and go, so the list is tended by hand** (Bill, 11-19: "Swap it, add a probe"):
  `npm run relays` says which pinned relays, and which of Trystero's own defaults, answer, and a dead
  pinned relay is swapped for a live default. The list never changes by itself: every page must
  choose alike.

## Presence

- Name tags in the bar show who's at the table. The GM's tag is clickable to rename.
- **The tags** (Bill, 11-12, as the mockup): each name in the hand font beside a dot, green and
  glowing when that page is live; the GM's tag reddish, your own outlined. The GM first, then you,
  then everyone else alphabetically. A tag dims after 25 s unheard and goes after 60 s. The GM
  renames by a prompt (up to 32 characters; blank is "GM"). Red tags, with no dot: on the GM's
  page, someone who came as a name another browser holds (clicking hands them the name, after
  asking); on a player's page, "not yours" and "offline" with why. That someone's tag is barred on
  every page (below).
- A page that connects is greeted and answers. A connection that closes is a goodbye.
- You're **live** while a relay or a peer is reachable. After 15 s with neither you're **offline**,
  with why, and the page keeps trying.

## Identity

- Each browser makes a signing key pair once and keeps it (the private half can't be exported). The
  browser's id comes from its public key, so it survives reloads.
- **Before a page is let in, both sides prove their browsers' keys** and vouch for their sealing
  keys. A bad signature is refused. So every message's sender is the browser behind that
  connection.
- **The first browser to claim a name holds it.** A page claiming a held name from another browser
  is nobody: it gets only what anyone sees, its changes, moves and roll requests are refused, and it
  sees a red "not yours" chip that says why. The GM's strip marks it in red, and clicking it hands
  the name over. "GM" can't be claimed.
- **Everyone can tell who's in the seat** (Bill, 11-13: "a stretched out bar sinister over the
  impostor name"; 11-19: on every page, and the GM's "red and barred"). On every page, the tag of a
  page using a name another browser holds is barred: a band across it from its upper right corner to
  its lower left. So the GM's page tells every page who holds each name, the names and their
  browsers, whenever that changes and to a page as it catches up; who holds a name is no secret, as
  everyone at a table sees who sits in Dana's chair. A page takes it only from the GM's browser.
  Only the GM's page can hand the name over.
- **Handing a name over** (Bill, 11-13): the page now holding it loses its "not yours" tag and gets
  its secrets; a page of that name on the browser that held it gets the tag. Whether a page is
  "not yours" is the GM's page's word alone: a page takes it only from the GM's browser, so no other
  page can make it read "not yours", or clear it.
- A browser profile is a person. Clearing site data makes you someone new; the GM hands your name
  over.

## The GM's page holds the game

- **The GM's page holds the game; a player's page shows a copy.** Each save on the GM's page sends
  the pieces that changed. Players take the round from the GM but keep their own tape.
- **Joining**, a player's page asks for the whole table until it arrives, and sends none of its own
  changes before then, so a stale copy can't overwrite the GM's. A gap in the GM's batches asks
  again.
- **A player's changes** go to the GM's page, which checks them (a character and its card belong to
  their owner, or to anyone while open; a character can't be handed to someone else), takes them,
  and sends them to everyone. A refused change is answered with the GM's version.
- **A deletion reaches every page at the table**: when the GM's page deletes a piece (put away,
  buried, or deleted forever), every page removes it, however recently the piece was moved.
- Pieces arrive cleaned: a piece from another page can carry nothing runnable.

## Moves

- **Every page publishes its drags straight to the room**, at most every 100 ms, whatever is
  carried: paper, a character's card or pool, a chip, an Influence card. Every other page shows the
  piece in that hand, lifted, and slides it to the most recent position it has for it, never through
  the ones in between, including moves that arrived while you were holding it. Only what another
  page moved slides; what you let go yourself never does.
- **A move carries its aim**: what the piece would land on (a slot, a drawer and where among its
  cards, the kill box, a tap it would merge with, a card paper would pin to), the strip it opened in
  a pool and the slot paying for it, and whether a card is showing as a chip over the slots. The
  carrying page decides the aim; every page, the carrier's too, draws what the aim does (the place
  lit, the gap in the drawer, the strip open, the chip) in its own layout. Those reactions are never
  sent otherwise and never saved. Where two hands aim at one pool or drawer, the latest aim shows.
- **A move changes nothing saved.** The drop counts as a move, and the drop's change, sent right
  after it, places the piece on every page. A piece another page let go stays where it was dropped
  until that change arrives, and goes back where its record says if none comes within a second. A
  piece in another page's hand whose record changes is let go there and then (the change may
  overtake the drop), and its next move, if any, takes it up again. A piece in the hand of a page
  that leaves is let go.
- Each page numbers what it sends, moves and changes on one counter that continues across a reload.
  **Each piece keeps the highest number it has applied from each page and discards anything
  lower.** Among moves arriving together, the newest arrival places a piece; an older one changes it
  only if it is from the same page with a higher number.
- A piece in your hand, or one you're writing in, waits until you let go.

## Secrets

- Secrets travel **sealed**: the GM's page and each player's page share a key, and a sealed box says
  what it is and who it's from and to, so it can't be passed off as something else.
- Every batch carries each piece as someone who owns nothing sees it (Influence names and values
  gone, the sheet's words, numbers and images blanked). For each player, the pieces they see
  differently ride sealed in the same batch.
- **A piece someone may not see at all** (the private mat of a pool, `ownership.md`) isn't in the
  public part of a batch; it rides sealed to those who may read it. When a piece goes private (a chip
  moved into a hidden pool), the other pages get a removal, not a deletion: it is not remembered as
  deleted, since it may come back out onto the table, and a player who alone stops seeing it gets the
  removal sealed. Nobody's carry of such a piece goes to the room: the other pages see only where it
  lands, the GM's page too.
- **Changing hands:** when Sam is given to Dana, his sheet and cards go sealed to her; when he's
  taken back, she gets the redacted ones.
- Players' changes are sealed to the GM's page. **A redacted copy can't overwrite the real one**: the
  GM's page refuses a change carrying a piece its sender can only see redacted.
- **Boot Hill holds only what was buried** (Bill, 11-19: "Only what it deletes"). A player's page
  adds to Boot Hill only the pieces its own change deletes, and only those whose deletion the GM's
  page takes, as the GM's page holds them, never as the player's copy has them; a burial left with
  nothing is dropped, and a piece whose deletion is refused stays in play. What lies buried is the GM's
  copy: a player can name graveyards and dig burials up, but never rewrite what is buried.

## While the GM's page is away

- **A player's change stays pending until the GM's page answers it**, whether it took the change or
  refused it. Pending changes survive a reload and go again every 3 s; after 5 tries the GM's
  version wins.
- When the GM's page comes back (a new key, or a message after 25 s of silence), the player's page
  asks for the whole table. Its pending changes are kept and sent again.
- **A change wins only over what its copy saw** (Bill, 11-19: "Refuse it"). A player's change to a
  piece someone else changed after the copy it was made on, a put or a deletion, is refused, and the
  player's page gets the piece as it now is: the GM rewrites a sticky while Dana's page is out of
  date, and her move of it snaps back, the GM's text kept. A piece nobody else changed since takes the
  player's change, as long as the GM's page allows it, and a page's own changes in a row never count
  against each other.
- **The GM's database has the final say.** The GM's page numbers its batches with the table's
  version, which carries on across reloads and restores. A change that puts back a piece deleted
  after the copy it was made on is answered with the deletion again. A Boot Hill change from a copy
  that missed a later one is refused whole.
- **What the book forgets, it refuses** (Bill, 11-19: "A floor"). The book remembers the last 3,000
  deletions, and the last change of up to 3,000 pieces; when it forgets the oldest, it keeps the
  newest version it forgot. A change from a copy older than that is refused whole, and the page gets
  the GM's pieces: a copy that old can't be judged, so it can't put back what was deleted long ago.

## Images

- Image bytes stay in each page's own store, named by their hash. A page missing an image asks the
  table by hash; the first answer that hashes right is kept, so that page can answer the next one.
  The GM's page has every image it has seen.
- **An image is kept as its bytes and its type** (Bill, 11-19: "Queue the image fix"), not as a file:
  Safari's engine won't keep a file in the browser's database in a private window, and bytes keep
  everywhere. An image a browser kept as a file before still loads.
- Meanwhile the image shows striped and marked missing, with why ("Nobody at the table has sent this
  image yet"), and the page asks again every 10 s.

## Not yet

- A player's roll requests go in the clear.
- A stale copy's changes to pieces the GM has changed (not deleted) still win.
- No TURN server, so some pairs can't connect (symmetric NAT).
- A tape history for latecomers.
- Whether a roll the GM throws away should leave players' tapes too.
