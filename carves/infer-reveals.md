# Infer reveals

What a successful Infer teaches the table about an NPC, shown the way a GM would show it: a patch torn
from the back of the NPC's card, so the line underneath shows through. Bill (2026-11-12): "the GM
should be able to reveal parts of NPC cards to one or more players based on successful Infers ...
thanks to our Action labels, we could give options to the GM".

Opened by Bill, 2026-11-18, from the prototype carve's Item 13 (Infer reveals), taking in its Item 15
(Opinions): "We don't currently represent Connection Cards on the table but they're part of an
Infer; when you Infer Opinions", and "I forgot I renamed Connection Card to Opinion Record".

## Status

- [x] ~~**Item 1 — torn reveals on the card.**~~ **LANDED (2026-11-18 — `#27`.)**
- [x] ~~**Item 4 — reveal by entry.**~~ **LANDED (2026-11-18 — `#28`.)** Before Item 2, which builds on it.
- [x] ~~**Item 2 — the slide-out and its Info cards.**~~ **LANDED (2026-11-18 — `#29`.)**
- [x] ~~**Item 5 — the NPC's menu and its folders.**~~ **LANDED (2026-11-18 — `#30`.)** Replaces Item 2's "+" tab. Before Item 3.
- [x] ~~**Item 6 — the Connection Table.**~~ **LANDED (2026-11-18 — `#32`.)** Before Item 3, which reads its cells.
- [ ] **Item 3 — Opinion Records.** **OPEN (#31.)** Takes in the prototype carve's Item 15. After Item 6.

## The rules

Bunkum, *Infer Actions*, as published: "A successful Infer Action reveals one category of information
about an NPC per Success Level. The Player chooses which": all of the NPC's Skills, all of its
Resources, all of its Motivations, all of its Opinions of another PC, or all it knows about another
character. A friendly Infer with Levels left over improves negative Opinions instead.

RULED (Bill, 2026-11-15, the Infer Contest note in HollowRpg's `.scratch/INFER-CONTEST.md`), not yet in
the books: Infer becomes a multi-roll Contest, and "Success Level = number of items learned. The
Players choose N individual items (a Motivation, a Resource, an Opinion…), not N whole categories."
Still proposed there, not ruled: whether Skills stay a whole category or come out in tiers, and
"Mission hooks attach to items". The table reveals line by line, which serves either.

Bunkum, *Initial Opinions*: on a first meeting the GM tells the players the NPC's Opinions of the PC
"along with any publicly known Skills the NPC has", so a reveal can be a single line, not only a
whole category ("probably Musician but probably not Forgery"). Incapacitating an NPC "grants all
Inferrable knowledge" (*Opinion Damage*).

An **Opinion Record** (Bunkum, *Initial Opinions*): one for each PC the NPC has met, holding the PC,
the NPC's Connection value to that PC (the highest Opinion less the most negative), and its Opinions
of that PC.

A Mission's **Infer clues** (*A Ghoulish Problem*, "Infer clues", as in the Bunkum Mission): "Upon Any
Infer" lines come with any successful Infer; "Upon Inferring …" lines come with the category the
player picks (Skills, Resources, Motivations, Opinions, or what the NPC knows about someone).

## Decisions

DECIDED (Bill, 2026-11-18), the shape: "the Infer info and the connection cards could slide out from
the bottom of an NPC card, with tabs." (His first idea, an eye on each inferrable item, gave way the
same day to one eye per card, below.)

DECIDED (Bill, 2026-11-18): "reveals can go to the entire table, not just one person". So a reveal is
one flag on the line or clue, not a list of players.

DECIDED (Bill, 2026-11-18), what a player sees: "I like the brown, 'Hollow' card back. What about
patches torn from the card back to reveal the text 'underneath'?" The slide-out comes out from under
the face-down card for players too, a tab showing once something in it is revealed ("1: yes"). The
card's name, public already, is always torn out ("2: yes"). And "A little piece rolled up to the right
of the tear might be nice too", with a picture: a horizontal strip torn out, ragged top and bottom
edges showing the paper's light fibers, and the torn piece rolled into a shaded curl at the right
end of the strip.

DECIDED (Bill, 2026-11-18), **Items cards**: "Let's have 'Items N' cards (each Items card gets a
number if there's more than one Items card). Each item on an items card has 'CATEGORY: DESCRIPTION,'
like 'MOTIVATION: it doesn't like its orders. Taking a child's toy is beneath a hunter, and it would
welcome a clever way out'. The new incremental reveal rules for Infer make each item 'one more
revealable thing' in its category. The GM should be able to highlight unrevealed items in a category.
An unrevealed item with category, 'ANY,' would always highlight in this case. An unknown category,
like 'WHAT IT KNOWS ABOUT TRUDY: she is the King's daughter, lost sixteen years. It will say so only if
it believes saying it serves the clan,' is up to the GM so the table should treat it as 'ANY'." And:
"An Items card should be a white card with a list of items, not just one item per card." Renamed
the same day (Bill: "let's use 'Info' for the cards. Items should be listed on the main card, like
resources and motivations are anyway"), since Items are what a character carries: they are **Info
cards**, "Info 1", "Info 2".

DECIDED (Bill, 2026-11-18), **one eye per card**, in place of an eye per item: "These cards aren't
super large and I'm thinking that the eyeballs will take up space. What about an eyeball at the upper
right of the main card that lets you toggle Infer state. Every revealed thing is always highlighted in
yellow and when you have the eyeball open, clicking on something reveals it -- but the info doesn't
get sent out to the players until you shut the eye; this allows the GM to change their mind about what
the players see without revealing anything to them".

DECIDED (Bill, 2026-11-18), on Daneel's four questions:
- **Choosing a category:** "for inspecting reveal categories, let's have a dropdown arrow next to the
  eye. When the GM chooses a category, it goes into 'Infer state mode' and highlights unrevealed things
  in the selected category in a paler yellow." ANY items highlight with every category.
- **Taking a reveal back:** "yes, the GM should be able to toggle whether an Item is revealed. The
  players are responsible for roleplaying their characters' ignorance".
- **Two yellows:** the paler yellow marks unrevealed things in the chosen category; "For revealed ones
  we always use 'highlighter yellow'". (It never meets the in-use action's swish, R77: that is drawn on
  action lines, and nothing inferrable is one.)
- **An open eye is not kept:** marks made with the eye open aren't kept across a reload. "But we do
  need to make it obvious when the eye is open, so the GM doesn't forget to close it. Rolls should be
  disabled and the cards should get a special background image as a reminder", with a picture of a
  cream ticking stripe, thin red and pink lines. Daneel: drawn in CSS as our own ticking, not copied.
  And: "the background image should be pale so you can easily read text over it". So the ticking is
  faint, washed-out pink on cream, and the ink and both yellows read over it as they do on white.
- **Which rolls:** "yes, every roll with stripes only on the open card(s)": while any eye is open,
  every Roll key on the table is disabled.

DECIDED (Bill, 2026-11-18), **the Infer state shows the torn back**, replacing the yellows and the
stripes above: "it seems better for the GM's infer state mode to sort of simulate the torn paper
un-redaction. Instead of yellow highlights, what do you think of superimposing a translucent cardback
over the card when in infer state mode and clicking to tear/untear each item. Showing unrevealed items
in a category could use regular yellow highlights in this case." And, on Daneel's two questions, "Yes,
drop both": a shut card shows nothing of what is revealed, and no ticking stripe (a brown card can't be
missed). Rolls stay disabled while any eye is open.

DECIDED (Bill, 2026-11-18), **cards come from the bar** (superseded the same day: they are made from the NPC's menu, below). Daneel asked what he thought of "dragging info
cards and opinion records from the top bar", and proposed GM-only supplies dropped on a card. On
Daneel's four questions:
- "1: replace": the supply replaces the "+" tab.
- "2: right, only cards not owned by players": a drop lands on a card the GM owns, an NPC.
- "3: The name and influence can start out as `?` and the GM can drag from the name to another card.
  NPCs can potentially have opinion records for other NPCs -- Impress Actions can slowly alter those. A
  story might have that as a goal or something".
- "4: boot hill but GM-only things in Boot Hill should be sent over masked; the players shouldn't see
  the information": a card dragged to the bar is buried.

DECIDED (Bill, 2026-11-18), with the book's picture of an Opinion Record (Bunkum, *Adjusted Motivations
and Opinions*): "Let's make these look like stickies, like in the book". The picture: a yellow sticky,
its first line underlined, "➔ Ted (Connection +Min)", then an Opinion a line, "Reputation -Sig (-Min)",
"Professional Respect +Maj (+Sig)", each with its adjusted value in parentheses after the fixed one.

DECIDED (Bill, 2026-11-18), **the table works out Connection**: "Let's compute Connection based on the
influences in the record. As soon as there is one, the `?` will be replaced by its Level."

DECIDED (Bill, 2026-11-18), **a Connection Table**, with the table from *A Ghoulish Problem* pictured: "Let's
add a carve item for the connection table. We can seed it from that during play. The one in A
Ghoulish Problem is a little easier to read than the Bunkum example. We should also add columns for the
PCs, after a thick vertical line".

DECIDED (Bill, 2026-11-18): "Level 0 is written as `0`". And **the Connection Table keeps in step with
the Opinion Records**: "The Connection Table should be kept in sync with the Opinion Records but
entries can exist apart from them. When an NPC has no Opinion Record for an NPC, the Connection Table
stands in for it. If the GM connects an NPC's Opinion Record to another NPC, it gets an Opinion X
entry as its first Opinion. If an Opinion Record changes its Connection value, we need to update the
Connection Table." (Daneel reads "Opinion X" as an Opinion whose Level is the table's cell, so the new
record's Connection is the cell it came from.)

DECIDED (Bill, 2026-11-18), **the Connection Table's place and its rows**: "The Connection Table is a
GM-only item on the top bar and there's only one. If the GM drags it when it's already on the table, it
just repositions it. Dragging it to the top bar just hides it, it doesn't go into Boot Hill." "I want to
settle on Levels for the values, so 1 is `min`." "The initial Opinion is just `Opinion`." "The players
never see the Connection Table." "NPC Groups get one column and row in the Connection Table and we need
a way to identify an NPC's group, if it has one. Let's use a parenthesized word or phrase after the
name. Typing `(` should pop a selector where you can type in a new name or else select something and
then complete the `)` for GM". Clarified: "The initial opinion when an NPC first meets a PC stays
`Reputation` or `Reaction` but connections to other NPCs already exist and they are `Opinion`".

DECIDED (Bill, 2026-11-18), **the table works out the first meeting**: "The table should fill in the
Opinion Record for the GM based on the Connection Table. If there's no entry, the player gets to roll
a single d6. When the Opinion Record connects to a PC, let's show their dice row, hide everything but
the white die, and disable the white die menu, allowing them to click the roll button to roll a single
white die for the reaction value."
Then: "Levels should be capitalized".

DECIDED (Bill, 2026-11-18), on Daneel's open questions: "The roll should show on the receipt as
`Reaction: N`; the players can tell what kind of reaction the NPC has to them." "Professional respect:
the table should populate common Skills. The GM can always just edit the card to delete inappropriate
ones." "Strongest: the entry in the NPC's row in the Connection Table with the largest magnitude."
"Ties: choose the one with the strongest opinion of the PC. If that's also a tie, give the PC the
benefit of the doubt and take the positive one."

DECIDED (Bill, 2026-11-18), **made from the NPC, not the bar**, on Daneel's Opinion die: "Reaction:
yes, just the Level is good." "I agree, let's not drag from the top to create Opinion Records.
Clicking a name after opinion flips to the opinion record for that character. It has a tab on it, just
like the Info card. Let's make info white and Opinions pink and theme the cards like tabbed manila
folders." "Instead of an `Opinion` button, let's put a dropdown after the GM die and use it for
creating stuff on the NPC, like Info and Opinion Records. Group the Info cards first with the Opinion
Records after them, alphabetized". This replaces the bar supplies for both (above), and the yellow
sticky: an Opinion Record keeps the book's lines, on a pink folder.

DECIDED (Bill, 2026-11-18), on Daneel's questions: "Opinion menu items for the characters: yes, this
is a good idea". "putting cards away: let's just make deleting all the text on a card put it away. No
Boot Hill entry but undo should restore it, even when focus is at the page level. Beyond that, the GM
can make a new one if they want to". And "Empty click away: yes": an emptied card goes once the GM
clicks away from it. On Daneel's proposal of an undo for cards alone, rather than the whole table:
"Cards only".

DECIDED (Bill, 2026-11-18), while Item 5 was being built with a page-only wastebasket for undo: "Hmm,
maybe there's a way we can use Boot Hill instead of a wastebasket", then, on Daneel's proposal: "Let's
use Boot Hill but let the players see 'GM card' rather than 'Devreux: Info card'". This replaces "No
Boot Hill entry" above.

DECIDED (Bill, 2026-11-18), the order: "Swap 3 and 6". Item 6 comes first, so Opinion Records
read real cells from the start: an NPC's record of another NPC starts at its cell, and a first meeting
can be a Reputation. The table's PC columns stay empty until Item 3's records fill them.

DECIDED (Bill, 2026-11-18), Item 6's questions, on Daneel's proposals: how records meet cells goes to
Item 3 ("Move them to Item 3"), so Item 6 is the table alone; its rows come from "Every named NPC
card", not from a list the GM keeps; renaming a group's row, "Cards follow the header"; the group is
typed on "The card's first line"; and, sent while the spec was being started, "Let's keep the rows
and columns alphabetized by name".

## Item 1

Torn reveals on the card. The GM's page shows one eye at the upper right of an NPC's card, shut.
Opened, the card is in its Infer state: a translucent brown back lies over
it, the hidden lines readable through it, each revealed line torn out as the players will see it, and
every Roll key is disabled; clicking an inferrable line of the front (one marked as a Skill, Field,
Resource or Motivation) tears it out or mends it, and nothing leaves the GM's page until the eye shuts
and sends it to the whole table. A dropdown arrow beside the eye picks a category, opening the eye and
highlighting that category's unrevealed lines in yellow. A shut card shows nothing of its reveals.
Tears not yet sent are lost on a reload. Secrecy stays on the wire: a player's page receives the front with only its
revealed lines, never the others' text. It lays the
front out from what it receives, each hidden line a blank gap one line tall (so only the line count
leaks, which the sheet's shape already shows), and covers it with the brown "Hollow" back, torn where
each revealed line and the name sit, a curl at each tear's right end. A tear's ragged edge comes from
the card and the line, like the paper's tilt, so it is the same on every page.

Open: what a revealed line shows when the GM later edits it. (Daneel's earlier proposal, one click
opening a whole category, is answered by the 11-15 rule: items come out one at a time, and the GM
highlights a category's unrevealed items to choose among them.)

## Item 2

The slide-out and its **Info cards**: white cards that slide out from the bottom of an NPC's card on
tabs, "Info 1", "Info 2" when there is more than one (and, in Item 3, an Opinion Record per character). Each
is a list of clues reading `CATEGORY: DESCRIPTION`, written by the GM as on the front, a "+" tab adding
another card. Agreed with Bill 2026-11-18 (on Daneel's proposal, unopposed):
- They live on the NPC's record, a text per card; a revealed clue goes in the same `shown` as the
  front's entries, so redaction, the eye and the torn drawing carry over.
- A clue's category is the word before its colon, any case, singular or plural: Skill(s),
  Resource(s), Motivation(s) and Item(s) match the dropdown's categories; ANY, and any category the
  table doesn't know ("WHAT IT KNOWS ABOUT TRUDY"), is ANY, lit with every category.
- The card's one eye covers its slide-out: open, a click tears a clue out or mends it, and the
  dropdown lights clues as it lights the front.
- A player sees a tab once something on it is revealed; its card slides out face-down, the revealed
  clues torn through its back.
- Which tab is slid out is each viewer's own, kept in their seat.

## Item 4

Reveal by entry, in place of #27's whole lines. DECIDED (Bill, 2026-11-18): "Items on the main card
should also be revealable, like Devreux's Dead Man's Die. Comma separated things like skills should be
individually revealable". On Daneel's four proposals ("1: yes 2: yes 3: this works -- the parenthetical
is for GMs only so they can leave it unrevealed 4: yes"):
1. The unit revealed is an **entry**: a comma-separated part of an inferrable line, split only at
   commas outside parentheses ("Rhetoric (x2, Style)" is one entry); a line without commas is one.
2. A revealed entry carries its line's label, so a Skill comes with its Level: players see "Skills 3:
   Savvy" as one strip, and "Skills 3: Savvy, Streetwise" when both are revealed.
3. Each line under an ITEMS heading is an entry, so a parenthetical line under an Item ("(Free Token,
   9 uses)") is the GM's to leave unrevealed. The dropdown gains an **Items** category.
4. A reveal is still recorded by its text, now its line's and its entry's, so an edit hides what it
   changes and nothing can leak.

## Item 5

The NPC's menu and its folders, in place of Item 2's "+" tab. On the GM's page, a dropdown after the
owner die ("GM") on the pool of a card the GM owns, for making things on that NPC: an Info card, and
in Item 3 an Opinion Record. The cards under the NPC are themed as tabbed manila folders, each tab
showing above the one behind it: the Info cards white, "Info 1", "Info 2", first; the Opinion Records
(Item 3) pink after them, alphabetized by their tab. Clicking a tab flips to that card. A card made
from the menu slides out with the cursor in it. A card whose text is all deleted is put away once the
GM leaves it, buried on Boot Hill as "Devreux: Info card" with its words and its place; players see
"GM card" and nothing more, and only the GM can bring it back or delete it. Undo (Ctrl+Z, ⌘Z) on the
GM's page, outside written text, digs up the newest Info card buried in the current graveyard, back in
its place and slid out, so it reaches back as far as Boot Hill does, across reloads; dragging one out
of the list does the same. Undo undoes nothing else (Bill: "Cards only").

Found while building: a player's page writes Boot Hill whole when it buries its own things, and the
GM's page puts back what the player sees masked by the buried records' oids. A GM card holds no
record, so each carries a name of its own (`gm`), kept in the mask, by which it is put back.

Open, for Item 3: what digging up a record does to its Connection Table cell, which stays as it was
when the record goes (Item 6: a cell can stand without a record).

## Item 3

Opinion Records: pink folders on tabs under a GM-owned card (Item 5), one for each character it has an
Opinion of, a PC or another NPC (Impress Actions can move an NPC's Opinion of another, and a story may
turn on it). Drawn as the book draws one: the first line underlined, "➔ Ted (Connection +Min)", then
an Opinion a line, the adjusted value in parentheses after the fixed one. Its tab reads the
character's name. A record is made from the NPC's menu for a character, so it is named from the
start: the menu's "Opinion of" lists the characters the NPC has no record of yet, PCs first, and
picking one makes the record. The table works out the Connection from the record's Opinions, by their
fixed values (Bunkum, *Initial Opinions*: the best positive less the worst negative, either being zero
when there is none), and writes it as a Level ("+Min", Hollow Folks' Min, Sig, Maj, Ext, Exq, at 2,
4, 6, 8, 10), a Connection of no Level as "0". Named for an NPC with a cell in the Connection Table (Item 6), a record starts with one
Opinion, "Opinion", at that cell's Level: NPCs know each other already. Named for a PC, it starts as
the book's first meeting starts it, filled in by the table:
- **Reputation**, when the NPC and the PC have a Connection in common in the Connection Table: the
  entry in the NPC's row with the largest magnitude among them, and that character's Connection to the
  PC as the Level, inverted when the NPC's own Connection to them is negative. A tie goes to the one
  with the strongest Connection to the PC, and a tie there to the positive one.
- **Professional Respect**, from the Skills the two cards have in common, filled in by the table; the
  GM deletes any the characters wouldn't know about.
- **Reaction**, when there is none: the PC's dice row comes up on its pool showing only the White
  die, its menu disabled, and the player's Roll rolls that one die, a d6 read on the book's Default
  Reaction table (1: -Sig, 2: -Min, 3-4: 0, 5: +Min, 6: +Sig). The die is seen by everyone, as any
  roll is, and its receipt reads the Level, "Reaction: +Min", so the players know how the NPC took to them; the
  Reaction goes on the NPC's record. Inferred with "Opinions of another PC", torn through the back like the
rest. This is the prototype carve's Item 15 (Bunkum's Opinion Records, on stickies in the 11-08
playtest). Opinions also feed later Actions (Bunkum: an Opinion is a Main Pool Influence), so this
item may reach past reveals.

Open: whether an Opinion is only a line or an Influence the rolls can use; how Professional Respect names its
Skills, so the GM can delete one; how a group member's records meet its group's cells (a member's
record of an NPC moving the group's cell, or a member keeping a row of its own once it has records).

## Item 6

The Connection Table: how the characters view each other (Bunkum, *Initial Opinions*: "one way to
figure out how NPCs view each other"). GM-only, and one per game: a supply on the GM's bar, dragged
out to put it on the table and dragged again to move it; dropped on the bar it is put away, not
buried, and the supply brings the same table back. Players never see it, and secrecy is on the wire:
no player's page receives it.

Laid out as *A Ghoulish Problem* lays it out (*Connections in Unton*): read across, the row's
Connection to the column, an X where a row meets itself. Every value is a Level, as on an Opinion
Record, capitalized as the book writes them: "+Min", "-Sig", "0". After a thick vertical line, a column for each PC. Seeded for play from
the adventure's table, whose Levels total 0 as the book asks of a starting table. It feeds the first
meeting (Item 3): an NPC with a Connection in common with the PC takes the strongest as a Reputation
Opinion, inverted when its own Connection is negative, and one with none rolls a Reaction.

A row and column is an NPC, or an **NPC group**, which takes one row and column for all its members.
An NPC's group is a word or phrase in parentheses after its name on its card, the GM's alone. Typing
`(` there opens a chooser of the game's groups: the GM picks one or types a new name, and the chooser
closes the `)`.

For Item 3, which owns it now (Bill, 2026-11-18: "Move them to Item 3"): a cell and an Opinion Record
keep in step, so when a record's Connection changes, its cell takes the new value. A cell can stand without a record, and for an NPC with no record of another NPC the cell is its
Connection to them. Naming a record for an NPC (Item 3) gives it a first Opinion, "Opinion", at the
cell's Level; a record for a PC starts with Reputation or Reaction, as the book's first meeting does. The PC columns come only from records, an NPC's Connection to a PC being kept nowhere
else.

The rows: every named NPC card has one, or its group's when it has a group, besides the seeded rows;
a row stays when its card is deleted, and goes when the GM clears its name. Rows and columns are in
alphabetical order by name, the PC columns too, after the thick line. Renaming a group's row renames
the group on its members' cards; a cleared group's members keep the words and find no row. A group
is typed on the card's first line, after the name, where a GM card's words are already secret.
