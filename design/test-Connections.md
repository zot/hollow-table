# Test Design: Connections
**Source:** crc-Connections.md

## Test: Levels and groups
**Purpose:** R411, R413: a Level's words, and a card's group read from its first line
**Input and Expected:**
1. level of 0, 1, -2, 3, -4, 5: "0", "+Min", "-Sig", "+Maj", "-Ext", "+Exq"
2. groupOf `<head>Mistress Devreux (Unton folk), Rank 3</head>`: "Unton folk"
3. groupOf `<head>Mistress Devreux</head>` and of a group only on a later line: none
4. groupOf `<head>Jake ( </head>`, a `(` with nothing after it: none
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`

## Test: a row for every named NPC
**Purpose:** R412, R413: keep links a card to its row, takes a seeded row of its name, uses its group's row, and leaves a cleared row cleared
**Input and Expected**, from the seed:
1. keep Devreux (linked in the seed): the rows unchanged
2. a new GM card named "Name": no row
3. renamed "Obed": takes Obed's row (its oid set), still eight rows
4. renamed "Mayor Obed": the same row, renamed
5. a GM card "Hank (Gravediggers)": a ninth row, "Gravediggers", a group; another "Lou (Gravediggers)": still nine
6. a player's card named "Sam": no row
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 1
**Fire alarm:** give a grouped card its own row (ignore the group in keep); red: step 5 makes a row "Hank"
**Inject:** src/rules/connections.ts:keep
**Pulled:** 2026-11-18 — rang: step 5 made rows for Hank and Lou, not "Gravediggers"; restored clean

## Test: renaming a row
**Purpose:** R412, R415: a group's rename reaches its members' cards, an NPC's reaches its card, and a cleared row goes with its cells
**Input and Expected:**
1. rename Gravediggers to "Diggers": Hank's and Lou's first lines read "(Diggers)", the row "Diggers"
2. rename Devreux's row "Madame Devreux": the Devreux card's name is "Madame Devreux"
3. rename Jake's row "": the row gone, and no cell names its id
4. set Eliza → Obed to 3, read back: 3; set it to 0: no cell stored
5. order: rows by name, ignoring case
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 2
**Fire alarm:** rename a group's row without touching its members (return no characters); red: step 1 leaves Hank's first line "(Gravediggers)"
**Inject:** src/rules/connections.ts:rename
**Pulled:** 2026-11-18 — rang: step 1 left Hank's first line "(Gravediggers)"; restored clean

## Test: the seed is the book's table
**Purpose:** R418: eight rows, the book's Levels, totaling 0
**Input and Expected:** the seed: rows Obed, Beatrice, Eliza, Maggie, Devreux, Jake, Jameson, Jephthah, Devreux linked to the playtest card; Obed → Beatrice 2, Devreux → Jake -2, Jameson → Jephthah -2; the sum of every cell 0
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
