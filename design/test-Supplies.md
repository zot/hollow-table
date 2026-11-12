# Test Design: Supplies
**Source:** crc-Bar.md

## Test: what a supply makes
**Purpose:** R287: a supply's piece has its middle at the pointer; R34: a character is its maker's,
its pool above its card, gathered; loose text starts "Write here"
**Input:** a character made by Dana at 500, 400; one by the GM; a sticky at 115, 75; loose text; the
How-to card; a red +1 chip at 21, 21
**Expected:** Dana's, card at 285, 242, gathered, pool above; the GM's; sticky at x 0, "Write here";
`howto`; sign −1, 1 point, on the table at 0, 0
**Refs:** crc-Bar.md
**Code:** `src/rules/supplies.test.ts`
**Alarm:** 1
**Fire alarm:** In newCharacter, give a player's character to the GM: Dana's new character is the GM's
**Inject:** src/rules/supplies.ts:newCharacter
**Pulled:** 2026-11-13 — rang: Dana's new character was the GM's

## Test: what a burial is called
**Purpose:** R290: the pool's name or "Nameless"; "Note: " and "Writing: " with the first line, 28
characters at most; "Tape: N rolls, last <title>"
**Input:** Sam; a blank name; a sticky starting with an empty line then a long heading; an empty
sticky; loose text; a torn roll of two receipts
**Expected:** `Sam`, `Nameless`, `Note: Find: How did Trudy get infe`, `Note: …`, `Writing: Write here`,
`Tape: 2 rolls, last Sam, roll 3`
**Refs:** crc-Yards.md
**Code:** `src/rules/supplies.test.ts`
**Alarm:** 2
**Fire alarm:** In graveName, take the text's first line even when it is empty: the sticky is `Note: …`
**Inject:** src/rules/yards.ts:graveName
**Pulled:** 2026-11-13 — rang: the sticky with an empty first line read `Note: …`
