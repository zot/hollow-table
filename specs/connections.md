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
  - **Reaction ?** otherwise, for the player to roll (below).
  - **Professional Respect**, one line naming the Skills the two cards have in common (Bill, 11-18:
    "One line naming the Skills"), "Professional Respect (Composure, Tact) +Maj": 1 Level, plus 2 if
    the PC has Level 2 in any of them (Bunkum). The GM deletes a Skill the characters wouldn't know
    about from the parentheses, and on leaving the record its Level is worked out again; with none
    left, the line goes.
- **The Reaction roll** (Bill, 11-18: "A die on the line"; Bunkum: "the Player rolls a d6 for a
  Reaction value"): on the GM's page a record's "Reaction ?" line has a White die before it. Clicking
  it brings the PC's roll row up on its pool as a Reaction: only the White die, set by no one, and Roll;
  the header reads "Devreux's Reaction". The PC's owner, or the GM, presses Roll, and the GM's page
  rolls a d6 on the book's Default Reaction table (1 -Sig, 2 -Min, 3-4 0, 5 +Min, 6 +Sig), writes
  "Reaction +Min" in the line's place, its cell taking the record's new Connection, and puts the row
  away. The receipt is one of the PC's rolls, the same on every tape (Bill, 11-18: "Names NPC and
  Level"): the White die, "White 5 on the Default Reaction table", "Devreux's Reaction: +Min". The
  record stays the GM's; everyone hears the Reaction, as at a real table.
- **Made by the GM, not by aiming** (Bill, 11-18: "Not now; menu only"): a record is made from the
  menu when the GM says the characters have met, though Bunkum makes it "The first time a PC targets
  a particular NPC with an Action".
- **A group shares its records** (Bill, 11-18: "The group gets the connection record, not the
  individual NPC ... they share the logical card, like two Emacs windows on the same buffer"): an NPC
  in a group shows the group's records, its Opinions of the characters are the group's, and an edit
  under one member's card shows under every member's.
- **Tapping Opinions** (Bunkum: "Opinions and Motivations create Main Pool Influences"): every line of
  a record with a Level is an Opinion (Bill, 11-18: "Every line with a Level") and has a tap glyph
  before it, as a Motivation does (see *Tapping Resources* in `influence.md`). Dragged out, it makes a
  Main Pool Influence of its sign named for the NPC and the Opinion (Bill, 11-18: "The NPC and
  Opinion"), "Devreux: Reputation +Min", at home in the drawer of the NPC whose card it was dragged from;
  what it spends shows in parentheses after the fixed Level, "Reputation +Sig (+Min)", and leaves the
  Connection as it was, which counts fixed Levels only. A record of a group is tapped from any
  member's card, named for that member. Only the GM taps a record, on the GM's page. The
  parentheses stay until the GM writes them away (Bill, 11-18: "Like Motivations, later"): a scene's or
  Event's end that recharges them, and Bunkum's Event Updates that move a fixed value after a large
  tap, come later.
- **Revealed line by line** (Bill, 11-19: "Line by line"; an Infer reveals one item per Success
  Level, ruled 11-15): a record is the GM's until the GM reveals one of its Opinions. With the eye open
  on an NPC's card (see *Infer reveals* in `ownership.md`), a click on a line of the record slid out
  tears it out or mends it, and the eye's dropdown lights its unrevealed Opinions under **Opinions**.
  A revealed line is known by its words, as an entry is: rewritten, it is hidden again.
- **Every record starts hidden** (Bill, 11-19: "Start hidden; GM tears"): the GM tells the players an
  NPC's first Opinions aloud, as Bunkum's first meeting has it ("tells them to the Players"), and
  tears out what they should keep in front of them.
- **A group's record is revealed for the group** (Bill, 11-18: "it's fine to reveal the group"):
  revealed under one member's card, it shows under every member's.
- **What a player sees**: once one of its Opinions is revealed, a pink tab under the NPC's card,
  named for the character the record is of; slid out, the record face-down, "➔ Sam" over its revealed
  Opinions torn through its back, and nothing else: the Connection is the GM's (Bill, 11-19: "Name
  only"). Only those words reach a player's page, and no player's page can change a record.
- **Emptied, a record is buried** on Boot Hill as "Devreux: Opinion of Sam", as an Info card is (see
  `ownership.md`): players see "GM card"; undo or dragging it out of the list digs it up. While it is
  buried its cell keeps its value; dug up, its Connection is written to the cell again.

