# Connections

How the characters view each other: the Connection Table. A game tier record (`games.md`), the GM's
alone.

## The Connection Table

- **The Connection Table** (Bill, 11-18; Bunkum, *Initial Opinions*: "one way to figure out how NPCs
  view each other") is a sheet the GM keeps behind the screen, laid out as *A Ghoulish Problem* lays
  out *Connections in Unton*: read across, the row's Connection to the column, an X where a row meets
  itself.
- **One per game, GM-only.** It is a supply on the GM's bar, stacked under the "How to play the table" card so the
  bar keeps its width; players' bars don't have it. Dragged
  out, it goes on the table; dragged from the supply again while it is out, the same table moves to
  where it is dropped. Dropped on the bar it is **put away, not buried**: nothing goes on Boot Hill,
  and the supply brings the same table back. Players never see it, and secrecy is on the wire: no
  player's page receives it.
- **Every value is a Level**, as the book writes them, capitalized (Bill, 11-18: "Levels should be
  capitalized"): "+Min", "-Sig", "+Maj", "-Ext", "+Exq", and "0" for none. Clicking a cell opens a
  chooser of the Levels, -Exq to +Exq, to set it.
- **A row and column for every named NPC** (Bill, 11-18: "Every named NPC card"): each GM card that
  has been given a name has one, or its group's when it has a group. A row stays when its card is put
  away, and goes when the GM clears its name in the table.
- **NPC groups** (Bill, 11-18: "NPC Groups get one column and row"): a group takes one row and column
  for all its members. An NPC's group is a word or phrase in parentheses after the name on the first
  line of its card, "Mistress Devreux (Unton folk), Rank 3", where a GM card's words are already
  secret. Typing `(` there opens a chooser of the game's groups: the GM picks one or types a new name,
  and the chooser closes the `)`.
- **Renaming a row renames its character** (Bill, 11-18: "Cards follow the header"): renaming a
  group's row renames the group on its members' cards, and renaming an NPC's row renames the NPC.
  Renaming an NPC on its pool renames its row. A cleared group's members keep the words and find no
  row until a card names a group again.
- **Alphabetical** (Bill, 11-18: "Let's keep the rows and columns alphabetized by name"): rows and
  columns are in order by name.
- **A column for each PC**, after a thick vertical line (Bill, 11-18), alphabetical too. An NPC's
  Connection to a PC is kept only on its Opinion Record of them, so a PC column's cell shows a
  record's Connection, and is blank where there has been none.
- **Seeded from the adventure**: the playtest game starts with the table put away, holding the eight
  Unton NPCs of *A Ghoulish Problem* and their Levels.

## Opinion Records

- **An Opinion Record** (Bunkum, *Initial Opinions*) is an NPC's Opinions of one character, a PC or
  another NPC. It is a pink folder under the NPC's card, among its Info cards (white, first) and its
  other records (alphabetical by the character's name), its tab reading that name (Bill, 11-18: "Let's
  make info white and Opinions pink"). Its first line, underlined, is drawn by the table, "➔ Sam
  (Connection +Min)"; under it the GM writes an Opinion a line, "Reputation -Sig".
- **The Connection** is worked out from the Opinions' fixed Levels, any adjusted value in parentheses
  after one left out: the best positive Opinion less the worst negative, either zero when there is
  none, written as a Level (Bunkum: "the highest-value Opinion, reduced by the most negative Opinion").
  A line with no Level, "Reaction ?", counts for nothing.
- **Records keep their cells in step**: whenever a record's Connection changes, the Connection Table's
  cell for its NPC (row) and its character (column) takes it, a PC's column too.
- **Made from the NPC's menu** (Bill, 11-18: "let's put a dropdown after the GM die and use it for
  creating stuff on the NPC, like Info and Opinion Records"): under **Opinion of**, the PCs the NPC has
  no record of, then the other rows of the Connection Table it has none of; picking one makes the
  record, slid out.
- **A record of an NPC starts with "Opinion"** at the NPC's cell for it (Bill, 11-18: "connections to
  other NPCs already exist and they are `Opinion`").
- **A record of a PC starts as the book's first meeting does** (Bill, 11-18: "The table should fill in
  the Opinion Record for the GM"):
  - **Reputation**, when the NPC and the PC have a Connection in common: of the characters the NPC has
    a cell for, other than 0, that have a record of the PC, the one whose cell is strongest, by
    magnitude; a tie goes to the one with the strongest Connection to the PC, and a tie there to the
    positive one (Bill, 11-18: "give the PC the benefit of the doubt"). The Reputation is that one's
    Connection to the PC, inverted when the NPC's cell for it is negative.
  - **Reaction ?** otherwise, for the GM to fill in with the book's Default Reaction (a d6: 1 -Sig,
    2 -Min, 3-4 0, 5 +Min, 6 +Sig).
  - **Professional Respect**, one line naming the Skills the two cards have in common (Bill, 11-18:
    "One line naming the Skills"), "Professional Respect (Composure, Tact) +Maj": 1 Level, plus 2 if
    the PC has Level 2 in any of them (Bunkum). The GM deletes a Skill the characters wouldn't know
    about from the parentheses, and on leaving the record its Level is worked out again; with none
    left, the line goes.
- **A group shares its records** (Bill, 11-18: "The group gets the connection record, not the
  individual NPC ... they share the logical card, like two Emacs windows on the same buffer"): an NPC
  in a group shows the group's records, its Opinions of the characters are the group's, and an edit
  under one member's card shows under every member's.
- **The GM's alone, for now**: no player's page receives an Opinion Record. Revealing one after an
  Infer comes later (Bill, 11-18: "it's fine to reveal the group").
- **Emptied, a record is buried** on Boot Hill as "Devreux: Opinion of Sam", as an Info card is (see
  `ownership.md`): players see "GM card"; undo or dragging it out of the list digs it up. While it is
  buried its cell keeps its value; dug up, its Connection is written to the cell again.

