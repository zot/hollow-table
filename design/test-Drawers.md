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
