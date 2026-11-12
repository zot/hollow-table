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
  Relays come and go; the list needs tending.

## Presence

- Name tags in the bar show who's at the table. The GM's tag is clickable to rename.
- **The tags** (Bill, 11-12, as the mockup): each name in the hand font beside a dot, green and
  glowing when that page is live; the GM's tag reddish, your own outlined. The GM first, then you,
  then everyone else alphabetically. A tag dims after 25 s unheard and goes after 60 s. The GM
  renames by a prompt (up to 32 characters; blank is "GM"). Red tags, with no dot: on the GM's
  page, someone who came as a name another browser holds (clicking hands them the name, after
  asking); on a player's page, "not yours" and "offline" with why.
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

- **Every page publishes its drags straight to the room**, at most every 100 ms, and the receiving
  page slides the piece there: always to the most recent position it has for it, never through the
  ones in between, including moves that arrived while you were holding it. Only what another page
  moved slides; what you let go yourself never does. A drop counts as a move; what the drop changed beyond places goes out
  right after it.
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
- **Changing hands:** when Sam is given to Dana, his sheet and cards go sealed to her; when he's
  taken back, she gets the redacted ones.
- Players' changes are sealed to the GM's page. **A redacted copy can't overwrite the real one**: the
  GM's page refuses a change carrying a piece its sender can only see redacted.

## While the GM's page is away

- **A player's change stays pending until the GM's page answers it**, whether it took the change or
  refused it. Pending changes survive a reload and go again every 3 s; after 5 tries the GM's
  version wins.
- When the GM's page comes back (a new key, or a message after 25 s of silence), the player's page
  asks for the whole table. Its pending changes are kept and sent again, and **the player's change
  wins**, as long as the GM's page allows it.
- **The GM's database has the final say.** The GM's page numbers its batches with the table's
  version, which carries on across reloads and restores. A change that puts back a piece deleted
  after the copy it was made on is answered with the deletion again. A Boot Hill change from a copy
  that missed a later one is refused whole.

## Images

- Image bytes stay in each page's own store, named by their hash. A page missing an image asks the
  table by hash; the first answer that hashes right is kept, so that page can answer the next one.
  The GM's page has every image it has seen.
- Meanwhile the image shows striped and marked missing, with why ("Nobody at the table has sent this
  image yet"), and the page asks again every 10 s.

## Not yet

- A player's roll requests go in the clear.
- A stale copy's changes to pieces the GM has changed (not deleted) still win.
- No TURN server, so some pairs can't connect (symmetric NAT).
- A tape history for latecomers.
- Whether a roll the GM throws away should leave players' tapes too.
