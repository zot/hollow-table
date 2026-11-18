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
- [ ] **Item 3 — Opinion Records.** **OPEN (not queued.)** Takes in the prototype carve's Item 15.

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
tabs, "Info 1", "Info 2" when there is more than one (and, in Item 3, an Opinion Record per PC). Each
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

## Item 3

Opinion Records: one tab per PC the NPC has met, holding the PC, the Connection value and the
Opinions, inferred with "Opinions of another PC". This is the prototype carve's Item 15 (Bunkum's
Opinion Records, on stickies in the 11-08 playtest). Opinions also feed later Actions (Bunkum: an
Opinion is a Main Pool Influence), so this item may reach past reveals.

Open: what an Opinion is as a record (a line, or an Influence the rolls can use), whether the table
works out Connection, and the first meeting's Reaction or Reputation.
