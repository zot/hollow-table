# Test Design: the table over the wire (browser)
**Source:** crc-Wire.md

Two or more pages in one browser (separate contexts, so separate identities), meeting through the
relays, driven through the page's test hook.

## Test: join and sync
**Purpose:** two pages find each other, prove identities and sync both ways
**Expected:**
- the GM opens the table: live, with relays reachable; the invite names the room and the GM's
  browser id
- a player joins as Dana and is synced within about 10 s; each sees the other; the GM's claims hold
  Dana's browser id
- the player's table equals the GM's (8 pieces); the player's Ledger is a copy (no checkpoints, no
  game list)
- the GM drags the sticky: the player's follows to the same place
- the GM gives Sam to Dana; Dana drops a chip into Sam's Main and drags Sam: the GM's page has both
- Dana writes on the sticky: the GM's page has the text
- Dana moves the GM's Devreux: refused, put back on both pages; both tables the same
- the player reloads: the copy shows at once (unsynced), then syncs, the same as the GM's
- the GM reloads: same room, still GM; Dana leaves: gone from the GM's strip
**Refs:** crc-Wire.md, crc-Presence.md, crc-Copy.md, seq-join.md, seq-sync.md
**Code:** `tests/sync.spec.ts`

## Test: secrets
**Purpose:** Eve at the table, owning nothing, hears no secret word in the clear
**Expected:** Dana sees Devreux's drawer and sheet redacted; Sam's sheet arrives when he is given to
her and blanks when taken back; her rename of Devreux's loose Influence is refused; Devreux buried
shows redacted in her Boot Hill; every batch and edit Eve's page hears contains no secret word, and
she sees sealed boxes she can't open
**Refs:** crc-Authority.md, crc-Seal.md, crc-Visibility.md
**Code:** `tests/secret.spec.ts`

## Test: names held by browsers
**Purpose:** an impostor is nobody until the GM hands the name over; stale copies can't resurrect
**Expected:** a second browser claiming "Dana" is told, sees Sam's sheet blank, and its change is
refused; handed over, it gets the sheet and its change is taken; Dana's stale copy drags a sticky
the GM buried, buries a card, and adds a sticky: when it syncs, the first sticky stays buried, the
card is back on both tables, the new sticky is kept, nothing pending
**Refs:** crc-Claims.md, crc-Authority.md
**Code:** `tests/away.spec.ts`

## Test: a deletion reaches a player who is at the table
**Purpose:** the 11-11 bug, end to end
**Input:** GM rolls three times, tears off the tape, drags it to the bar, empties the graveyard,
with Dana present throughout; then again with Dana away and back
**Expected:** Dana's table has no torn roll in either case, and her Boot Hill matches the GM's
**Refs:** crc-Authority.md, crc-Stamps.md, seq-sync.md
**Code:** `tests/deletion.spec.ts`

## Test: images
**Purpose:** images peer to peer by hash
**Expected:** the GM adds an image: the player's page fetches it by hash and keeps it; Dana adds one:
the GM's page has it; Ann joins later and has both; an image nobody has shows missing with "Nobody at
the table has sent this image yet (the page that has it may be closed); trying again", then shows
once a page with it is back
**Refs:** crc-ImageExchange.md, seq-images.md
**Code:** `tests/rolls.spec.ts`

## Test: rolls at the table
**Purpose:** rolls resolve on the GM's page; each page prints what it may know
**Expected:**
- the GM's own receipt is full with a ✓; Dana's tape shows the table view "rolled by the GM" with no
  Total Influence, base or Difference
- private: the GM's receipt says so, has no ✓, and Dana's tape gets nothing; players have no switch
- Dana's roll: her button shows "GM…" while waiting; her receipt has her numbers and none of
  Devreux's; the GM's receipt says "rolled by Dana" with the Difference, and the GM's page picked
  the row (−3 to −4: −1)
- Beauford isn't Dana's: "On the GM's table, Beauford isn't Dana's to roll"; with no GM: "The GM
  isn't at the table, so nobody can roll", and the button comes back
- two skipped roll numbers print "2 rolls from the GM didn't arrive"; markup in a name arrives as
  text; a die showing 7 drops the roll
- a CRIT locked by its owner shows the punch on every tape
**Refs:** crc-Rolls.md, crc-Tape.md, seq-roll.md
**Code:** `tests/rolls.spec.ts`
