# Test Design: the table over the wire (browser)
**Source:** crc-Wire.md

Two or more pages, each in its own browser context (so its own identity and database), in Chromium
and Firefox, meeting through the local relay the spec run starts (R297), driven through the page's
test hook. One opt-in spec meets through the public relays.

## Test: join and sync
**Purpose:** two pages find each other, prove identities and sync both ways; a page speaks for the tab its `hi` named (R471)
**Expected:**
- the GM opens the table; the invite names the room and the GM's browser id (22 characters, R470)
- a player joins as Dana and syncs; each sees the other live; the GM's claims hold Dana's browser id
- the player's Ledger is a copy (no checkpoints, no game list; only Tables joined, R485)
- the GM drags the sticky: the player's follows to the same place
- the GM gives Sam to Dana; Dana drags Sam's pool and writes on the sticky: the GM's page has both
- Dana moves the GM's Devreux: refused, and put back on her page too
- Dana's copy is saved; she reloads: the copy shows at once, then syncs
- the GM reloads: same room; Dana leaves: gone from the GM's strip
**Refs:** crc-Wire.md, crc-Presence.md, crc-Copy.md, seq-join.md, seq-sync.md
**Code:** `tests/sync.spec.ts`
**Alarm:** 23
**Fire alarm:** let a peer in under its Trystero peer id instead of the tab its `hi` named; red: the GM's catch-up, sent to Dana's tab, never reaches her
**Inject:** src/net/wire.ts:Wire.#hello
**Pulled:** 2026-11-22 — rang (Chromium): keyed by its Trystero peer id, Dana's page never got the catch-up (not synced); restored clean

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
**Pulled:** 2026-11-19 — re-pulled after R469 (Authority gained rename): rang (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R448 (the batch changed): rang, the spec failed with the GM's view as the public part (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R446 (Authority changed): rang, the secrets reached Eve (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R444 (Authority changed): rang, the secrets reached Eve (Chromium); restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, 17 secrets leaked to Dana's page (Chromium) *Earlier —* 2026-11-13 — rang: Eve heard 17 secret words in the clear (Chromium)
## Test: names held by browsers
**Purpose:** an impostor is nobody until the GM hands the name over; every page bars its tag (R445, R446)
**Expected:** a second browser coming as Dana reads "not yours", sees Sam's sheet blank, and its move
is refused; the first Dana's page bars its tag, not red, with the band drawn, and the GM's tag of it
is red and barred; claims the impostor's page sends (empty) leave Dana's bar as it was; the GM clicks its red tag: it reads "Dana", gets the sheet, and its move is taken,
while the first browser now reads "not yours", and the new holder's page bars that one's tag
**Refs:** crc-Claims.md, crc-Authority.md, crc-Folks.md
**Code:** `tests/away.spec.ts`
**Alarm:** 17
**Fire alarm:** take `claims` from any page, not only the GM's browser; red: the impostor's empty claims take the bar off its tag on Dana's page
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, Dana's barred tag was not found as expected (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), the bar left the impostor's tag; restored clean *Earlier —* 2026-11-22 — re-pulled after R472/R473 (main changed): rang (Chromium), the bar left the impostor's tag; restored clean *Earlier —* 2026-11-19 — re-pulled after R469 (main gained the rename): rang (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R447 (main changed): rang, the impostor's empty claims took the bar off its tag on Dana's page (Chromium); restored clean *Earlier —* 2026-11-19 — rang: the impostor's empty claims took the bar off its tag on Dana's page (Chromium); restored clean
## Test: a page that was away can't bring back what was buried
**Purpose:** stale copies can't resurrect
**Input:** Dana's page leaves the room; the GM buries the big sticky (which no one had changed since
the table opened); away, Dana drags that sticky, deletes Beauford, and adds a sticky; she reloads
**Expected:** her sticky reaches the GM; the buried sticky stays buried on both tables, Beauford is
back on both, and nothing is left pending
**Refs:** crc-Copy.md, crc-Authority.md, seq-sync.md
**Code:** `tests/away.spec.ts`
**Alarm:** 2
**Fire alarm:** Take a piece put back however long ago it was deleted (drop the tomb check from judge, R192): the buried sticky comes back
**Inject:** src/net/authority.ts:judge
**Pulled:** 2026-11-23 — re-pulled after R486 (judge changed): rang, the buried sticky came back (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R464 (judge changed): rang (Chromium); restored clean *Earlier —* 2026-11-19 — re-pulled after R448 (judge changed): rang, the spec failed with the tomb check dropped (Chromium); restored clean *Earlier —* 2026-11-19 — re-aimed: the old injection (a catch-up left out of what has gone out) was silent, on HEAD before R444 too (cause not traced); the tomb check is the guard: rang, the buried sticky came back (Chromium); restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, the away page brought the buried sticky back (Chromium) *Earlier —* 2026-11-13 — rang: the buried sticky came back on the GM's table (Chromium)
## Test: a deletion reaches a player who is at the table
**Purpose:** the 11-11 bug, end to end
**Input:** the GM buries a sticky on the bar and deletes the graveyard forever, with Dana present; then
again with Dana away and back
**Expected:** Dana's table loses the sticky, and her Boot Hill matches the GM's, both times
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
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, Dana's image never reached the GM (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), Dana's image never reached the GM; restored clean *Earlier —* 2026-11-22 — re-pulled after R472/R473 (main changed): rang (Chromium), Dana's image never reached the GM's page; restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, the GM's page never got the blue image (Chromium) *Earlier —* 2026-11-13 — rang: Dana's image never reached the GM's page (Chromium)
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
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, Dana's page said the GM's page didn't answer, not that nobody can roll (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), Dana's page said the GM's page didn't answer, not that nobody can roll; restored clean *Earlier —* 2026-11-22 — re-pulled after R472/R473 (main changed): rang (Chromium), the spec timed out with Dana's page waiting on the gone GM; restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, Dana's page kept waiting on the GM's gone page (Chromium) *Earlier —* 2026-11-13 — rang: Dana's page kept waiting on the GM's gone page instead of saying nobody can roll (Chromium)
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

## Test: the world at the table: its number stays on the GM's page
**Purpose:** R348, R381–R375, R351 over the wire: Dana picks Sam's Infer and the GM's page shows it on Sam's pool; Dana's drag aims at nothing; the GM aims, reminded while the tray is blank; Dana's page holds whether the world is set and never its number; her row shows `vs the world` with the GM's White, locked; her receipt without the number, the GM's with it
**Input:** the GM's table and Dana, Sam given to Dana; Dana clicks Sam's Infer; Dana drags it to open table; the GM drags Sam's Infer to open table; the GM sets the world at 5; Dana opens the tray; the GM aims again; Dana rolls
**Expected:** Infer in Sam's header on the GM's page; no note on Dana's page; the GM's "Put the world's number in the tray first."; Dana's record `{set: true, total: 0}`, her tray "set by the GM", no field; the GM's `vs the world 5`, Dana's `vs the world`, her White locked and the same dice as the GM's; her receipt "vs the world" with no Difference; the GM's "vs the world (5), Difference"
**Refs:** crc-Visibility.md, crc-Tray.md, crc-Rolls.md, crc-Authority.md
**Code:** `tests/rolls.spec.ts`
**Alarm:** 6
**Fire alarm:** drop the world's redaction; red: Dana's page holds 5
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-15 — rang (Chromium): "the world at the table" failed, Dana's page held 5; restored clean

## Test: two mats: a pool hidden from you shows only what others put in it
**Purpose:** R358–R361 over the wire: a chip the GM moves into Devreux's pool leaves the players' pages and comes back with it; Dana's contribution there reaches everyone by her name; her own chip on Sam (hers now) stays on her page, sealed over the public removal, leaves Eve's, and survives a reload, while Eve's reload doesn't bring it
**Input:** the GM's table, Dana and Eve; a chip on the table, into Devreux's Main by the GM, back; into Devreux's Main by Dana; Sam given to Dana; the chip into Sam's Stagger by Dana; Dana and Eve reload
**Expected:** Dana has it, then not, Eve not; Eve has it back; `by` Dana on the GM's and Eve's pages; the GM's has it in Sam's pool, Eve's not, Dana's yes; after reloads Dana's yes, Eve's no
**Refs:** crc-Copy.md, crc-Authority.md, crc-Visibility.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 7
**Fire alarm:** let the public removal win over the tab's own sealed put (don't filter its own rids out of the removals); red: Dana loses her own chip on Sam
**Inject:** src/net/copy.ts:#recs
**Pulled:** 2026-11-16 — rang (Chromium): "two mats" failed at Dana's own chip on Sam, gone from her page; restored clean

## Test: a hidden pool's contributions are never piled for players
**Purpose:** R379: Dana's three −2s in Devreux's Main pile on the GM's page and show as put on hers
**Input:** the GM's table and Dana; three −2 chips by Dana in Devreux's Main
**Expected:** the GM's Main shows a −4 pile; Dana's three −2 chips and no pile
**Refs:** crc-PoolView.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 8
**Fire alarm:** pile every pool (`pileUp` always true); red: Dana's page shows a pile
**Inject:** src/ui/pool.ts:units
**Pulled:** 2026-11-19 — re-pulled after R464 (units changed): rang (Chromium); restored clean *Earlier —* 2026-11-16 — re-pulled after the simplifier renamed its line (`pileUp`): rang (Chromium), Dana's page showed a pile; restored clean *Earlier —* 2026-11-16 — rang (Chromium): Dana's page showed a pile; restored clean
## Test: a player's row reaches the GM's page
**Purpose:** R381: a player's roll row change goes to the GM's page (the same test as the world at the table, its first step)
**Input:** Dana clicks Sam's Infer
**Expected:** Infer in Sam's header on the GM's page
**Refs:** crc-Copy.md
**Code:** `tests/rolls.spec.ts`
**Alarm:** 9
**Fire alarm:** send only pieces and Boot Hill, not `rows` (the old filter); red: the GM's page never shows Infer
**Inject:** src/net/copy.ts:#changed
**Pulled:** 2026-11-16 — rang (Chromium): the GM's page never showed Infer; restored clean

## Test: Stagger is seen, and piled, by everyone
**Purpose:** R377 over the wire: the GM's three −2s in Devreux's Stagger reach Dana as the GM sees them, a −4 pile; one in his Main doesn't reach her
**Input:** the GM's table and Dana; three −2 chips by the GM in Devreux's Stagger, one in his Main
**Expected:** Dana's Stagger shows a −4 pile; her Main has no chip
**Refs:** crc-PoolView.md, crc-Visibility.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 10
**Fire alarm:** leave a hidden pool's Stagger unpiled (drop the `stagger` case from `pileUp`); red: Dana's Stagger shows three −2s, no pile
**Inject:** src/ui/pool.ts:drawPool
**Pulled:** 2026-11-16 — rang (Chromium): Dana's Stagger had no −4 pile; restored clean

## Test: the GM's eye tears an NPC's entries out for the table
**Purpose:** R388, R390, R392–R394 over the wire: with Devreux's eye open on Motivations his three are lit; Keep the Peace, Savvy and Streetwise torn out (the label Skills 3: with them), then on Items both lines lit and Dead Man's Die torn, all stay on the GM's page while the GM's Roll key is disabled; shutting the eye sends them, and Dana's page holds only those, drawn as strips of label and entries, with no Profession or Free Token; Savvy mended leaves her page
**Input:** the GM's table and Dana; the eye's arrow, Motivations; Keep the Peace, Savvy, Streetwise; the arrow, Items; Dead Man's Die; Sam's die; the eye; then the eye, Savvy, the eye
**Expected:** the Infer state; 3 lit, then 2; the label torn; Dead Man's Die and (Free Token, 9 uses) lit; Roll disabled; Dana's front without Savvy; Roll enabled; Dana's front with it, no other secret, strips Devreux, Skills 3: Savvy, Streetwise, Keep the Peace +Sig (0), Items, Dead Man's Die; then Skills 3: Streetwise
**Refs:** crc-PieceView.md, crc-Visibility.md, crc-RollRow.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 11
**Fire alarm:** write each tear to the game as it is made (no draft until the eye shuts); red: Dana's front holds Savvy while the eye is open
**Inject:** src/ui/eyes.ts:toggle
**Pulled:** 2026-11-19 — re-pulled after Item 9 rewrote the eye's toggle; rang (Chromium): Dana's front changed while the eye was open; restored clean *Earlier —* 2026-11-18 — re-pulled after entries (#28), rang (Chromium): Dana's front held Savvy while the eye was open; restored clean
## Test: an NPC's Info cards reach players only as torn clues
**Purpose:** R396–R400, R403, R406 over the wire: the GM's Info card on Devreux reaches Dana blank, with no tab; on Motivations its ANY, MOTIVATION and unknown clues are lit; the MOTIVATION clue torn out and the eye shut, Dana's card holds only that line, her tab shows, and slid out the clue is torn through the back
**Input:** the GM's table and Dana; three clues written on Devreux; the GM's Info tab, the eye's arrow, Motivations, the MOTIVATION clue, the eye; Dana's tab
**Expected:** the GM's Info tab; Dana's one blank card and no tab; 3 lit; Dana's card the clue alone, no watches or faro; one torn strip, the MOTIVATION clue; then, the GM emptying the card, Dana's Boot Hill lists one "GM card" and her page holds no watches, faro, "Info card" or "Devreux:"
**Refs:** crc-PieceView.md, crc-Visibility.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 12
**Fire alarm:** show players a tab for every Info card (drop the face-down filter); red: Dana has a tab before anything is revealed
**Inject:** src/ui/piece.ts:infos
**Pulled:** 2026-11-19 — re-pulled after Item 9 rewrote infos; rang (Chromium): Dana had an Info tab before anything was revealed; restored clean *Earlier —* 2026-11-18 — re-pulled after infos changed for burial; rang (Chromium): Dana had a tab before anything was revealed; restored clean *Earlier —* 2026-11-18 — rang (Chromium): Dana had a tab before anything was revealed; restored clean
## Test: the Connection Table never reaches a player
**Purpose:** R410, R518: with the table on the GM's table, Dana's page holds no Connection Table and her desk has no pigeonhole for it; a forged change from her is refused
**Input:** the GM's table and Dana; the GM takes the Connection Table out; Dana's page sends a put of the table
**Expected:** Dana's desk has five pigeonholes, none the Connection Table's; her page holds no record of kind `connections` and none of "Jephthah"; the GM's table keeps its Levels
**Refs:** crc-Visibility.md, crc-Authority.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 13
**Fire alarm:** send the table to everyone (redact returns it whole); red: Dana's page holds a `connections` record
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-19 — re-pulled after Item 9 rewrote the table's redaction line; rang (Chromium): Dana's page held the `connections` record; restored clean *Earlier —* 2026-11-18 — re-pulled after the redaction took Opinion Records too; rang (Chromium): Dana's page held the `connections` record; restored clean *Earlier —* 2026-11-18 — rang (Chromium): Dana's page held the whole `connections` record, Jephthah and all; restored clean
## Test: Opinion Records never reach a player
**Purpose:** R435: the GM's record of Sam on Devreux, nothing revealed, never reaches Dana, and her forged one is refused
**Input:** the GM's table and Dana; the GM puts a record of Sam under Devreux; Dana's page puts a record
**Expected:** Dana's page holds no record of kind `opinion` and none of its words; the GM's page holds only its own record
**Refs:** crc-Visibility.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 14
**Fire alarm:** send records to everyone (redact returns an Opinion Record whole); red: Dana's page holds it
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-19 — re-pulled after Item 9 rewrote the record's redaction; rang (Chromium): Dana's page held the `opinion` record; restored clean *Earlier —* 2026-11-18 — rang (Chromium): Dana's page held the `opinion` record; restored clean
## Test: a player rolls a Reaction
**Purpose:** R429-R431: the GM calls Sam's Reaction from Devreux's record; Dana rolls it from her page, and both tapes hear it, while the record stays the GM's
**Input:** the GM's table and Dana, Sam given to Dana; the GM makes Devreux's record of Sam and clicks its die; Dana presses Roll on Sam's row
**Expected:** Dana's Sam row shows a White die and Roll; both tapes' newest receipt reads "Devreux's Reaction: " and a Level; the GM's record reads "Reaction " and that Level; Dana's page holds no `opinion` record
**Refs:** crc-Rolls.md, crc-RollRow.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 15
**Fire alarm:** believe the intent over the GM's row (take no `reaction` from the held row); red: Dana's roll prints a plain roll, not a Reaction
**Inject:** src/net/rolls.ts:#intent
**Pulled:** 2026-11-18 — rang (Chromium): Dana's roll printed as a plain roll, Success at cost +Maj, not a Reaction; restored clean

## Test: a player sees a revealed Opinion
**Purpose:** R435-R438: the GM reveals one line of Unton folk's record of Sam on Devreux; Dana sees it under Devreux and Hank, face-down, and nothing else of it
**Input:** the GM's table and Dana; Devreux and Hank in Unton folk; the group's record of Sam, `Reputation +Sig` and `Grudge -Min`, `Grudge -Min` revealed by the GM's eye; Dana slides it out under Hank
**Expected:** a tab "Sam" under Devreux and under Hank on Dana's page; slid out, "➔ Sam" and one torn line `Grudge -Min`; Dana's page holds the record's text with no `Reputation`
**Refs:** crc-Visibility.md, crc-PieceView.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 16
**Fire alarm:** never publish the record's cards (no `on`); red: Dana's page shows no tab "Sam"
**Inject:** src/rules/connections.ts:published
**Pulled:** 2026-11-19 — rang (Chromium): Dana's Hank had no tab "Sam"; restored clean

## Test: a forged claim changes nothing
**Purpose:** R447: a player's page takes a `claim` only from the GM's browser
**Input:** Dana and a second browser as Dana at the table; the second sends Dana's tab a `claim` saying she isn't Dana
**Expected:** Dana's own tag still reads "Dana", not "not yours"
**Refs:** crc-Folks.md, crc-Claims.md, seq-join.md
**Code:** `tests/away.spec.ts`
**Alarm:** 18
**Fire alarm:** take a `claim` from any page (drop the GM's-browser check); red: Dana's tag reads "not yours"
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, Dana's tag read "not yours" (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), Dana's tag read "not yours"; restored clean *Earlier —* 2026-11-22 — re-pulled after R472/R473 (main changed): rang (Chromium), Dana's tag read "not yours"; restored clean *Earlier —* 2026-11-19 — re-pulled after R469 (main gained the rename): rang (Chromium); restored clean *Earlier —* 2026-11-19 — rang: the impostor's forged claim made Dana's tag read "not yours" (Chromium); restored clean
## Test: a player's Ledger lists the tables joined, and deletes the others
**Purpose:** R457, R485: a player's Ledger lists this browser's copies of joined tables; the one being played can't be armed, another goes with two shift-clicks
**Input:** Dana joins; her browser also keeps a copy `room-old`; her Ledger opened; `room-old` shift-clicked twice
**Expected:** two Tables joined entries, the current one disabled; after the first shift-click `room-old` reads "Shift-click again to delete forever"; after the second one entry is left, and the store no longer has `room-old`
**Refs:** crc-Ledger.md, crc-GameStore.md, ui-ledger.md
**Code:** `tests/sync.spec.ts`
**Alarm:** 19
**Fire alarm:** leave the Tables joined list out of a player's Ledger (only the GM's draws it); red: no entries
**Inject:** src/ui/ledger.ts:LedgerView.render
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (the Ledger changed): rang, no Tables joined entries (Chromium); restored clean *Earlier —* 2026-11-19 — rang: Dana's Ledger had no Tables joined entries (Chromium); restored clean
## Test: the GM's eye tears out a Resource for the table
**Purpose:** R392–R394 for a Resource (prototype Item 47): torn out with the eye and the eye shut, Devreux's Money reaches Dana's page, drawn torn, and her other Resource doesn't
**Input:** the GM's table and Dana; the eye's arrow, Resources; Money; the eye
**Expected:** the Infer state; Dana's front holds Money and not Saloon Gossip; her card shows a torn strip with Money +Sig
**Refs:** crc-Visibility.md, crc-PieceView.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 20
**Fire alarm:** blank a revealed `<res>` line as if it weren't shown (skip it in blankFront); red: Dana's front never holds Money
**Inject:** src/rules/visibility.ts:blankFront
**Pulled:** 2026-11-19 — rang (Chromium): with revealed <res> lines blanked, Dana's front never held Money; restored clean

## Test: a Resource revealed before a player joins reaches them
**Purpose:** R394 through a catch-up (prototype Item 47): a Resource revealed before Dana joins reaches her page with the whole table
**Input:** the GM's table; the eye's arrow, Resources; Money; the eye; then Dana joins
**Expected:** Dana's front holds Money, and her card shows a torn strip with Money +Sig
**Refs:** crc-Visibility.md, crc-Authority.md
**Code:** `tests/secret.spec.ts`
**Alarm:** 21
**Fire alarm:** send a catch-up's characters without their reveals (strip `shown` before redacting); red: Dana's front never holds Money
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-19 — rang (Chromium): with a catch-up's reveals stripped, Dana's front never held Money; restored clean

## Test: a player renames, and everything they hold follows
**Purpose:** R467–R469 over the wire: Dana's own tag renames her; "GM" is refused, said on the tag; "Dee" is taken, her page reloads as Dee, and the GM's page has Sam owned by Dee and Dee claimed by her browser
**Input:** the GM's table; Dana, given Sam; her tag clicked, answered GM; clicked again, answered Dee
**Expected:** the tag red, titled why, still Dana; then her tag Dee; Sam's owner Dee on the GM's page; the claim Dee is her browser's
**Refs:** crc-Folks.md, crc-Authority.md, crc-Claims.md
**Code:** `tests/away.spec.ts`
**Alarm:** 22
**Fire alarm:** reload without saving the new name as the tab's (drop `session('hollow.name', to)`); red: the page comes back as Dana
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, the page came back as Dana, not Dee (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476, the injection now the tab's name (the name is the tab's): rang (Chromium), the page came back as Dana; restored clean *Earlier —* 2026-11-22 — re-pulled after R472/R473 (main changed): rang (Chromium), the page came back as Dana; restored clean *Earlier —* 2026-11-19 — rang (Chromium): the page came back as Dana; restored clean
## Test: an invite from before Trystero proved ids opens no table
**Purpose:** R473: an old invite is neither the GM's page nor a player's, and says what to do
**Expected:** a page opened by an invite whose `gm=` is a 20-character id shows "Ask the GM for a new link", its role is `old`, and there is no table
**Refs:** crc-Presence.md
**Code:** `tests/sync.spec.ts`
**Alarm:** 24
**Fire alarm:** let an old invite fall through to the player's page; red: no message, the page tries to join a room
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, no message for the old invite (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after R476 (main changed): rang (Chromium), falling through, no old-invite message was shown; restored clean *Earlier —* 2026-11-22 — rang (Chromium): falling through, no old-invite message was shown; restored clean
## Test: two tabs of one browser are two players
**Purpose:** R475, R476: a name is the tab's, with its own key, so one browser seats two players; a reload keeps the tab's name without asking, and a new tab offers the names held
**Expected:** in one browser, a tab arriving as Dana and another as Sam both show on the GM's page, each with its own id; the second tab's prompt lists Dana; Dana's tab reloads as Dana without being asked
**Refs:** crc-Identity.md, crc-Presence.md, seq-join.md
**Code:** `tests/sync.spec.ts`
**Alarm:** 25
**Fire alarm:** keep the tab's name in localStorage instead of sessionStorage; red: the second tab is never asked and comes as Dana
**Inject:** src/main.ts:main
**Pulled:** 2026-11-23 — re-pulled after R483-R485 (main changed): rang, the second tab was never asked (Chromium); restored clean *Earlier —* 2026-11-23 — re-pulled after the simplifier (the injected line changed): rang (Chromium), the second tab was never asked; restored clean *Earlier —* 2026-11-23 — rang (Chromium): with the name in localStorage, the second tab was never asked; restored clean
## Test: two names in one browser keep copies of their own
**Purpose:** R483, R485: two names seated from one browser open copies of their own, so one's tape never shows on the other's page after a reload; the Ledger names whose copy each is
**Input:** Dana by invite, Sam in a second tab; Sam's page writes a receipt on its tape and saves; Dana reloads; Dana's Ledger
**Expected:** each copy `m-<room>.<user id>`; after the reload Dana's copy is the same, and neither it nor her tape has Sam's receipt; Tables joined lists "Dana at …" and "Sam at …"
**Refs:** crc-GameStore.md, crc-Build.md
**Code:** `tests/sync.spec.ts`
**Alarm:** 26
**Fire alarm:** key every copy by its room alone (`m-${room}` whoever it is); red: Dana reloads with Sam's receipt on her tape
**Inject:** src/store/gamestore.ts:copyFor
**Pulled:** 2026-11-23 — rang: both names opened m-<room> (Chromium), and with the id checks left out, Dana reloaded with Sam's receipt on her tape; restored clean

## Test: a torn tape and its burial stay on the page that tore it
**Purpose:** R486, R488-R491: the GM's torn roll and Dana's never reach the other page; buried, each is listed and counted on its own page's Boot Hill alone, digs up there as a torn roll, and goes when its graveyard is emptied
**Input:** the GM rolls twice and tears the tape onto the table; Dana rolls and tears hers; the GM drops its torn roll on the bar; the GM digs it up and buries it again; the GM empties the graveyard
**Expected:** each page holds only its own torn roll, under `t:`; the GM's Boot Hill lists "Tape: 2 rolls" with badge 1, Dana's lists nothing and her page holds no receipt of the GM's; dug up, the GM's table has its torn roll back; emptied, the GM's Hill is empty; the GM rolls, Dana tears it off and reloads, and the GM rolls again: her tape holds the new roll alone (R490, R491)
**Refs:** crc-Tape.md, crc-Drag.md, crc-BootHillView.md, crc-Authority.md, crc-Copy.md
**Code:** `tests/tapes.spec.ts`
**Alarm:** 27
**Fire alarm:** tear onto `o:` (ridOf) in TapeView; red: Dana's page holds the GM's torn roll
**Inject:** src/ui/tape.ts:TapeView
**Pulled:** 2026-11-23 — re-pulled after R491 (TapeView's tear changed): rang, torn onto `o:`, Dana's page held the GM's torn roll (Chromium); restored clean. A tear without `last` also failed it: Dana's torn roll came back after her reload *Earlier —* 2026-11-23 — rang: torn onto `o:`, Dana's page held the GM's torn roll (Chromium); restored clean
## Test: torn rolls shared before leave the players' pages
**Purpose:** R487: a game holding an `o:` torn roll and a tape buried in the shared Boot Hill, loaded by the GM's page, keeps them as the GM's own, and Dana's page loses them
**Input:** the GM's page writes an `o:` torn roll and a tape's burial into `yards`, as builds before this did, and Dana sees both; the GM's page reloads
**Expected:** Dana's page holds no torn roll and her Boot Hill no tape; the GM's page holds the roll under `t:` and the tape in its Hill
**Refs:** crc-Build.md, crc-Yards.md
**Code:** `tests/tapes.spec.ts`
**Alarm:** 28
**Fire alarm:** skip ownTorn when the GM's page loads; red: Dana's page keeps the torn roll
**Inject:** src/main.ts
**Pulled:** 2026-11-23 — rang: with ownTorn skipped, Dana's page kept the torn roll (Chromium); restored clean

## Test: a note to the GM, a handout, and a note kept to oneself
**Purpose:** R498-R507: private paper across pages: Dana's note to the GM reaches the GM and not Sam; the GM answers on it; the GM's handout to Sam reaches Sam and not Dana; Dana's "just me" note stays on her page through a reload; its fold and tags
**Input:** GM, Dana and Sam at the table; Dana makes a sticky and picks GM; the GM writes on it; the GM makes a sticky and checks Sam; Dana makes another and picks Just me, then reloads
**Expected:** the GM's page holds Dana's note with the GM's words and shows tags "Dana"; Dana's shows "GM"; Sam's page holds neither Dana's note nor any trace; Sam's holds the handout with tags "GM"; Dana's never does; Dana's "just me" note is under `m:` on her page after the reload, tagged "me", and on no other page
**Refs:** crc-PieceView.md, crc-Authority.md, crc-Copy.md, crc-Records.md
**Code:** `tests/private.spec.ts`
**Alarm:** 29
**Fire alarm:** pick Just me as `to: []` under `o:` (no move to `m:`); red: the GM's page holds Dana's "just me" note
**Inject:** src/ui/piece.ts
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with Just me kept under o: as to [], the GM's page still held Dana's note (line 70, Chromium); restored clean
