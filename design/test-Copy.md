# Test Design: Copy
**Source:** crc-Copy.md

## Test: pending until answered
**Purpose:** a player's changes survive loss, the GM's absence and a reload; with a fake clock and wire
**Input and Expected**, in order:
1. Dana at the table, owning Sam; nothing pending
2. Dana edits the sticky and the edit is dropped on the way: the GM's page still has the old text;
   the edit is pending
3. 3 s later it goes again: the GM's page has it; nothing pending
4. the GM's page away: Dana writes on the sticky, drags Sam and drags the reference card; three
   changes pending
5. the GM's page back (a new key): it asks for the whole table, then has the sticky text and Sam's
   place; Dana's page: synced, nothing pending, same sticky
6. the GM's page away: Dana writes and reloads; still pending after the reload
7. the GM's page back: it has the text; both pages agree; nothing pending
8. a change unanswered after 5 tries: dropped; the whole table asked for; the GM's version on Dana's
   page
**Refs:** crc-Copy.md, seq-edit.md
**Code:** `src/net/copy.test.ts`
**Alarm:** 1
**Fire alarm:** Clear a pending change on any version of the piece from the GM, not only its answer: the catch-up's old sticky replaces Dana's text and the GM never gets it (step 5)
**Inject:** src/net/copy.ts:Copy
**Pulled:** 2026-11-12 — rang: at step 5 the GM's page never got `While you were out`

## Test: catch-up and gaps
**Purpose:** a full table removes what the GM doesn't have, except pending new pieces; a gap asks
again; one player's catch-up doesn't count as a missed batch for another
**Input:** a copy with an extra piece and a pending new one, then a full table; batches 4 then 6;
with Dana and Ann at the table, 5 GM changes
**Expected:** the extra piece gone, the pending one kept; a sync asked after 1.5 s; 5 batches sent,
both players synced with the same sticky
**Refs:** crc-Copy.md, seq-sync.md
**Code:** `src/net/copy.test.ts`
**Alarm:** 2
**Fire alarm:** Let a full table take away pending new pieces too: Dana's own sticky is gone
**Inject:** src/net/copy.ts:Copy
**Pulled:** 2026-11-12 — rang: Dana's own pending sticky was taken away by the full table

## Test: deletions, the book, and silence
**Purpose:** the GM's page tombs deletions and dates Boot Hill; a deletion after a drag is not stale
end to end; a player's page sends nothing before the table arrives; 25 s of silence counts as the
GM's page coming back
**Input and Expected**, in order:
1. the GM's page away; Dana loads and writes on the sticky: no change sent; the GM's page back: the
   change arrives. The GM's page back again with a new key, its table held up on the way: Dana
   writes, and nothing is sent until the table arrives
2. the GM writes on the sticky, its numbers move past that change (a drag), then the GM deletes it:
   Dana's page removes it; the book tombs it at that batch's version
3. the GM changes Boot Hill: `hillGv` is that batch's version
4. the GM's page silent for 26 s, then heard (a batch): Dana's page asks for the whole table
**Refs:** crc-Copy.md, crc-Authority.md, crc-Stamps.md, seq-sync.md
**Code:** `src/net/copy.test.ts`
**Alarm:** 3
**Fire alarm:** Send a deletion under the stamp the piece last went out with (the 11-11 bug): Dana's page keeps the sticky
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-12 — rang: Dana's page kept the deleted sticky
