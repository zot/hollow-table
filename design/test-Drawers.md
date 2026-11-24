# Test Design: Drawers
**Source:** crc-Drawers.md

## Test: what files where, and filing and taking out
**Purpose:** R521-R523, R527: drawerOf by kind and owner, on the GM's page and a player's; filed keeps the records and the name at the end of the drawer; takeOut gives them back and leaves the rest
**Input:** Devreux (the GM's), Sam (Dana's), an open character, a sticky, a chip, a torn roll; for the GM and for a player; Devreux filed with its burial records, then a sticky, then Devreux taken out
**Expected:** GM: npcs, characters, characters, papers, null, null; player: null, null, null, papers, null, null; the npcs drawer lists Devreux with its card and pool's Influence cards; taken out, the records are as filed and the desk holds only the sticky
**Refs:** crc-Drawers.md
**Code:** `src/rules/drawers.test.ts`
**Alarm:** 1
**Fire alarm:** file every character in `characters`; red: Devreux goes to characters
**Inject:** src/rules/drawers.ts:drawerOf
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with every character in characters, Devreux went there; restored clean

## Test: searching the desk
**Purpose:** R546, R547: every word, any case, in a name or the words filed; nothing typed lists every name, alphabetical.
**Input:** a desk holding Devreux (NPCs, "Savvy" on its front), a sticky "Note: buy rope" whose text also says "the coach left at dawn", Sam (Characters), and a docket "Docket: Clues".
**Expected:** "" lists Devreux, Docket: Clues, Note: buy rope, Sam; "sam" finds Sam; "COACH dawn" finds the note by its words; "savvy" finds Devreux by its front; "nobody" finds nothing.
**Refs:** crc-Drawers.md
**Code:** src/rules/drawers.test.ts
**Alarm:** 2
**Fire alarm:** match on the name alone: the note found only by its words is missing
**Inject:** src/rules/drawers.ts:search
**Pulled:** 2026-11-24 — 2026-11-24 — rang: matching names alone, 'searching the desk' failed (the note found by its words missing); restored clean

## Test: names first
**Purpose:** R546: what matches by its name comes before what matches only by its words, though it sorts later.
**Input:** Zeke, matching "ze" by name, and Ann, whose front says "amaze", matching only by its words.
**Expected:** "ze" lists Zeke, then Ann.
**Refs:** crc-Drawers.md
**Code:** src/rules/drawers.test.ts
**Alarm:** 3
**Fire alarm:** sort every match by name alone: Ann comes first
**Inject:** src/rules/drawers.ts:search
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with every match in name order, 'names first' failed (Ann before Zeke); restored clean

## Test: the list of names is alphabetical
**Purpose:** R547: with nothing typed, every entry by name, not in the order filed.
**Input:** the desk of "searching the desk", filed Devreux, the note, Sam, the docket.
**Expected:** "" lists Devreux, Docket: Clues, Note: buy rope, Sam.
**Refs:** crc-Drawers.md
**Code:** src/rules/drawers.test.ts
**Alarm:** 4
**Fire alarm:** drop the sort by name: the empty search lists in the order filed
**Inject:** src/rules/drawers.ts:search
**Pulled:** 2026-11-24 — 2026-11-24 — rang: without the sort by name, 'searching the desk' failed (the empty search in filing order); restored clean

## Test: the GM's desks, browsed as graveyards
**Purpose:** R551, R556: › makes "Desk N" one past the highest, but not past an empty, nameless desk; a renamed desk keeps its name; an empty, nameless desk goes when left; the only one is kept; search reads every desk.
**Input:** an empty desk; one with a note filed; › and renames and ‹ through Desk 1, Act 2 and a new Desk 2; a note in Desk 1 mentioning Devreux, Devreux filed in Act 2.
**Expected:** as each step states; "devreux" finds Devreux in desk 1 by name, then the note in desk 0.
**Refs:** crc-Drawers.md
**Code:** src/rules/drawers.test.ts
**Alarm:** 5
**Fire alarm:** let › make a new desk past an empty, nameless one: the first step makes Desk 2
**Inject:** src/rules/drawers.ts:deskNext
**Pulled:** 2026-11-24 — 2026-11-24 — rang: with deskNext making a desk past an empty nameless one, 'the GM's desks, browsed as graveyards' failed; restored clean

## Test: a desk from before reads as one desk
**Purpose:** R550: the one-list `desk` record #65 saved reads as one nameless "Desk 1"; none, or an empty list of desks, reads as the empty desk.
**Input:** `{ desk: [Devreux] }`, undefined, `{ desks: [] }`.
**Expected:** Desk 1 holding Devreux; the empty desk twice.
**Refs:** crc-Drawers.md
**Code:** src/rules/drawers.test.ts
**Alarm:** 6
**Fire alarm:** read only the new shape: the old record has no desks
**Inject:** src/rules/drawers.ts:desksOf
**Pulled:** 2026-11-24 — 2026-11-24 — rang: reading only the new shape, 'a desk from before reads as one desk' failed; restored clean
