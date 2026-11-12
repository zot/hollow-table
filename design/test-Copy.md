# Test Design: Copy
**Source:** crc-Copy.md

## Test: pending until answered
**Purpose:** a player's changes survive loss, the GM's absence and a reload; with a fake clock and wire
**Input and Expected**, in order:
1. Dana at the table, owning Sam; nothing pending
2. Dana edits the sticky and the edit is dropped on the way: the GM's page still has the old text;
   the edit is pending
3. 3 s later it goes again: the GM's page has it; nothing pending
4. the GM's page away: Dana writes on the sticky and drags Sam; three changes pending
5. the GM's page back (a new key): it asks for the whole table, then has the sticky text and Sam's
   place; Dana's page: synced, nothing pending, same sticky
6. the GM's page away: Dana writes and reloads; still pending after the reload
7. the GM's page back: it has the text; both pages agree; nothing pending
8. a change unanswered after 5 tries: dropped; the whole table asked for
**Refs:** crc-Copy.md, seq-edit.md
**Code:** `src/net/copy.test.ts`

## Test: catch-up and gaps
**Purpose:** a full table removes what the GM doesn't have, except pending new pieces; a gap asks
again; one player's catch-up doesn't count as a missed batch for another
**Input:** a copy with an extra piece and a pending new one, then a full table; batches 4 then 6;
with Dana and Ann at the table, 5 GM changes
**Expected:** the extra piece gone, the pending one kept; a sync asked after 1.5 s; 5 batches sent,
both players synced with the same sticky
**Refs:** crc-Copy.md, seq-sync.md
**Code:** `src/net/copy.test.ts`
