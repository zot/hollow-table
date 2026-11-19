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

## Test: a record's Connection
**Purpose:** R420: best positive less worst negative, by fixed Levels
**Input and Expected:**
1. "Reputation -Sig" and "Professional Respect (Composure) +Maj": -2 + 3 = 1
2. "Old Friends +Sig (0)", the adjusted value left out: 2
3. "Reaction ?" alone: 0; "Grudge -Min" and "Fear -Maj": -3; "Opinion 0": 0
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 3
**Fire alarm:** count the adjusted value (read the last Level on the line); red: step 2 gives 0
**Inject:** src/rules/connections.ts:fixed
**Pulled:** 2026-11-18 — rang: step 2 gave 0 for 2; restored clean (a first injection, dropping the parenthesis stripping, stayed silent: the first Level is read before the adjusted one, so the alarm was pointed at the line reader, `fixed`)

## Test: the first meeting
**Purpose:** R423-R425: a record's first Opinions, from the adventure's table
**Input and Expected**, from the seed, with Eliza holding a record of Sam, "Old Friends +Sig":
1. Devreux of Obed: "Opinion -Min" (Devreux's cell for Obed)
2. Devreux of Sam: "Reputation +Sig" (her cell for Eliza +Min), then "Professional Respect (Composure, Suasion, Tact) +Maj" (Sam has Composure 2)
3. Jake of Sam: "Reputation -Sig" (his cell for Eliza -Min inverts it)
4. Jameson of Sam: "Reaction ?" (his cell for Eliza is 0)
5. Beatrice also holding a record of Sam at +Maj: Devreux still takes Eliza's (her cell for Beatrice is 0), and Obed takes Beatrice's, "Reputation +Maj" (his cell for her, +Sig, beats his +Min for Eliza); with Obed holding one at -Ext too, Maggie, +Min for both Obed and Eliza, takes Obed's, the stronger Connection: "Reputation -Ext"
6. respected on "Professional Respect (Suasion, Tact) +Maj": "+Min"; on "Professional Respect () +Maj": the line gone
7. synced: Devreux's record of Sam at +Sig sets her cell for Sam to 2; a record at 0 keeps a 0 cell
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 4
**Fire alarm:** never invert a Reputation; red: step 3 gives "Reputation +Sig"
**Inject:** src/rules/connections.ts:first
**Pulled:** 2026-11-18 — rang: Jake's Reputation came out +Sig; restored clean


## Test: a Reaction
**Purpose:** R430: the Default Reaction table, and the record's line it writes
**Input and Expected:**
1. reactionOf 1 to 6: -2, -1, 0, 0, 1, 2
2. awaits on `Reaction ?\nProfessional Respect (Tact) +Min`: true; on `Reaction +Min`: false
3. reacted with 1 on `Reaction ?\nProfessional Respect (Tact) +Min`: `Reaction +Min\nProfessional Respect (Tact) +Min`; with -2 on `  Reaction ?  `: `Reaction -Sig`; on text with no such line: unchanged
4. recordOf: Devreux's record of Sam when Devreux holds one; a group member's, the group's record
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 5
**Fire alarm:** read the table off by one (the d6's face as the index); red: step 1 gives -1 for a 1
**Inject:** src/rules/connections.ts:reactionOf
**Pulled:** 2026-11-18 — rang: reactionOf read 1 as -1, the table shifted by one; restored clean

## Test: a record's items and where it shows
**Purpose:** R436-R438: a record's lines are items keyed by the record; once one is revealed it is published on its row's cards with its name; a player's page finds records by `on`
**Input:** Devreux's record of Sam, `Reputation +Sig` and a blank line and `Grudge -Min`; published with nothing shown, then with `Grudge -Min` shown; the same record held by a group row "Unton folk" of Devreux and Hank; recordsOn for Hank with no table
**Expected:** two items, keys `o<oid>:Reputation +Sig` and `o<oid>:Grudge -Min`, both Opinions; no `on` or `name` with nothing shown; then `on` [Devreux], `name` "Sam"; for the group `on` [Devreux, Hank]; recordsOn gives the record for Hank
**Refs:** crc-Connections.md
**Code:** `src/rules/connections.test.ts`
**Alarm:** 6
**Fire alarm:** publish a group's record on the first member only (`on` the first card); red: the group's `on` is [Devreux]
**Inject:** src/rules/connections.ts:published
**Pulled:** 2026-11-19 — rang: the group's `on` held Devreux alone; restored clean
