# Test Design: the table over the wire (browser)
**Source:** crc-Wire.md

Two or more pages, each in its own browser context (so its own identity and database), in Chromium
and Firefox, meeting through the local relay the spec run starts (R297), driven through the page's
test hook. One opt-in spec meets through the public relays.

## Test: join and sync
**Purpose:** two pages find each other, prove identities and sync both ways
**Expected:**
- the GM opens the table; the invite names the room and the GM's browser id
- a player joins as Dana and syncs; each sees the other live; the GM's claims hold Dana's browser id
- the player's Ledger is a copy (no checkpoints, no game list)
- the GM drags the sticky: the player's follows to the same place
- the GM gives Sam to Dana; Dana drags Sam's pool and writes on the sticky: the GM's page has both
- Dana moves the GM's Devreux: refused, and put back on her page too
- Dana's copy is saved; she reloads: the copy shows at once, then syncs
- the GM reloads: same room; Dana leaves: gone from the GM's strip
**Refs:** crc-Wire.md, crc-Presence.md, crc-Copy.md, seq-join.md, seq-sync.md
**Code:** `tests/sync.spec.ts`

## Test: secrets
**Purpose:** Eve at the table, owning nothing, hears no secret word in the clear
**Expected:** Dana and Eve hold Devreux's sheet and drawer redacted; Sam's sheet reaches Dana when
he is given to her and blanks when taken back; her rename of Devreux's Influence card is refused;
Devreux buried shows redacted in her Boot Hill; every batch Eve's page hears, and everything it
holds, has no secret word, and she hears boxes sealed to others
**Refs:** crc-Authority.md, crc-Seal.md, crc-Visibility.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 1
**Fire alarm:** Send the GM's own view as the public part of a batch: Eve hears the secrets
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-13 — rang: Eve heard 17 secret words in the clear (Chromium)

## Test: names held by browsers
**Purpose:** an impostor is nobody until the GM hands the name over
**Expected:** a second browser coming as Dana reads "not yours", sees Sam's sheet blank, and its move
is refused; the GM clicks its red tag: it reads "Dana", gets the sheet, and its move is taken, while
the first browser now reads "not yours"
**Refs:** crc-Claims.md, crc-Authority.md, crc-Folks.md
**Code:** `tests/away.spec.ts`

## Test: a page that was away can't bring back what was buried
**Purpose:** stale copies can't resurrect
**Input:** Dana's page leaves the room; the GM buries the big sticky (which no one had changed since
the table opened); away, Dana drags that sticky, deletes Beauford, and adds a sticky; she reloads
**Expected:** her sticky reaches the GM; the buried sticky stays buried on both tables, Beauford is
back on both, and nothing is left pending
**Refs:** crc-Copy.md, crc-Authority.md, seq-sync.md
**Code:** `tests/away.spec.ts`
**Alarm:** 2
**Fire alarm:** Leave what a catch-up sends out of what has gone out to everyone: the buried sticky comes back
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-13 — rang: the buried sticky came back on the GM's table (Chromium)

## Test: a deletion reaches a player who is at the table
**Purpose:** the 11-11 bug, end to end
**Input:** the GM rolls three times, tears the tape off onto the bar, and deletes the graveyard
forever, with Dana present; then again with Dana away and back
**Expected:** Dana's table has no torn roll either time, and her Boot Hill matches the GM's
**Refs:** crc-Authority.md, crc-Stamps.md, seq-sync.md
**Code:** `tests/deletion.spec.ts`

## Test: images
**Purpose:** images peer to peer by hash, drawn when they arrive
**Expected:** the GM adds an image: Dana's page fetches it by hash, keeps it and draws it; Dana adds
one: the GM's page has it; Ann joins later and has both; an image nobody has is drawn missing with
"Nobody at the table has sent this image yet (the page that has it may be closed); trying again"
**Refs:** crc-ImageExchange.md, seq-images.md
**Code:** `tests/images.spec.ts`
**Alarm:** 3
**Fire alarm:** The GM's page doesn't watch for images: Dana's image never reaches the GM
**Inject:** src/main.ts:main
**Pulled:** 2026-11-13 — rang: Dana's image never reached the GM's page (Chromium)

## Test: rolls at the table
**Purpose:** rolls resolve on the GM's page; each page prints what it may know
**Expected:**
- the GM's own receipt has a ✓; Dana's tape shows "rolled by the GM" with no Total Influence
- private: the GM's receipt says "Private: not shown to the table" and has no ✓; Dana's tape gets
  nothing
- Dana rolls for Sam: Roll shows "GM…" while it waits; her receipt has its resolution and Level;
  the GM's says "rolled by Dana"
- Beauford isn't Dana's: "Beauford isn't yours to roll."; once the GM's page has gone: "Nobody can
  roll: the GM isn't at the table."
**Refs:** crc-Rolls.md, crc-Tape.md, seq-roll.md
**Code:** `tests/rolls.spec.ts`
**Alarm:** 4
**Fire alarm:** Don't tell Rolls when the GM's page has gone: Dana's page keeps waiting on it
**Inject:** src/main.ts:main
**Pulled:** 2026-11-13 — rang: Dana's page kept waiting on the GM's gone page instead of saying nobody can roll (Chromium)

## Test: one carry, shown alike
**Purpose:** R298–R301: what one page carries shows lifted on another, aimed there, and is saved only
by the drop
**Expected:**
- the GM takes Beauford's Stagger chip: Dana's page holds it lifted (`carried`) at the GM's place;
  on both pages its record still says Stagger
- over Sam's Bias strip it opens on both pages, lit on Dana's; let go there, Bias holds it on both
  and no hand holds anything
- Devreux's Keep the Peace in the GM's hand is a card on Dana's page, and a chip over Sam's slots;
  over Sam's drawer the gap opens in Sam's drawer on Dana's page, and closes when it leaves; let
  go there, it is Sam's on both pages
- Beauford's chip dropped on the kill box changes nothing; Dana's page puts it back in Stagger by
  itself, and neither page's record moved
- Dana carrying Devreux's pool (not hers) isn't shown on the GM's page; carrying Sam's (given her)
  is, and when she leaves holding it the GM's page lets it go
**Refs:** crc-Hands.md, crc-Moves.md, crc-Drag.md, seq-move.md
**Code:** `tests/hands.spec.ts`
**Alarm:** 5
**Fire alarm:** Send drags without their aim: Sam's Bias strip opens only on the GM's page
**Inject:** src/net/moves.ts:Moves.drag
**Pulled:** 2026-11-13 — rang: without the aim, Sam's Bias strip stayed narrow on Dana's page and the card never showed as a chip there (Chromium)

## Test: the public relays
**Purpose:** R160, R297: the relays in use still introduce pages (opt-in, `npm run spec:public`)
**Expected:** the GM and Dana see each other live
**Refs:** crc-Wire.md
**Code:** `tests/relays.spec.ts`
