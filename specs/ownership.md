# Who owns what, and who sees what

Glimmer is full of things only *some* people can perceive. The table shows each person only what
they may know.

## Ownership

A character has one of three owners:

- **GM** (the default for NPCs): only the GM sees it; players can't take it.
- **Open**: everyone sees it and anyone may claim it (a pregen waiting to be picked up).
- **A player**: that player and the GM see it.

The die by the character's name shows GM, open, or the player.

- Clicking an open character's die claims it.
- Shift-clicking your own character's die opens it; the GM can open any.
- The GM can always take one back by clicking an open one. Taking a character from a player is
  shift-click (open), then click (claim).
- A player can't take another player's character, and clicking it does nothing.
- A player may own several characters.
- **Who writes a character** (Bill, 2026-11-24: "Only the owner is allowed to edit the nickname or the
  card", "the GM can also edit it"): its owner and the GM write its card and the name above its pool,
  no one else; an open character's are the GM's alone until someone claims it ("that's right"). The
  GM's page refuses anyone else's change to them.

## Secrecy

- **What's secret.** A character's sheet and its Influence cards, wherever they are: in its drawer,
  its used pile, someone's pool, loose on the table, or in Boot Hill. Only the owner and the GM may
  read them.
- **What's public.** The character's name and place, the number of cards in its drawer, the sheet's
  shape, and what others put in its pool (below).
- To everyone else, a hidden character's card is face-down, and its drawer's cards are face-down.
- **Infer reveals** (Bill, 11-18; Infer reveals one item per Success Level, ruled 11-15). The GM can
  reveal an NPC's front to the whole table an entry at a time: each of its Skills, Fields, Resources,
  Motivations and Items. "Comma separated things like skills should be individually revealable", so
  an entry is one part of a line between commas (a comma inside parentheses doesn't split), and each
  line under ITEMS is an entry, a parenthetical one being "for GMs only so they can leave it
  unrevealed". A revealed entry comes with its line's label, so a Skill brings its Level: "Skills 3:
  Savvy". "The players are responsible for roleplaying their characters' ignorance", so the GM can
  hide a revealed entry again. A revealed entry is known by its words: if the GM rewrites it, it is
  hidden again until revealed anew.
- **The eye.** On the GM's page an NPC's card has an eye at its upper right, shut. Opening it puts the
  card in its Infer state, showing it as the players will see it: a translucent brown back over it,
  its hidden text readable through it, its revealed entries torn out. Clicking an entry tears it
  out or mends it, and nothing reaches the players until the eye shuts. Changes made with the eye open
  are lost if the page reloads. A dropdown arrow beside the eye picks a category (Skills, Resources,
  Motivations, Items, Opinions), opening the eye and highlighting that category's unrevealed entries in
  yellow. A shut card shows nothing of what is revealed (Bill, 11-18).
- **An open eye can't be forgotten:** while any eye is open, every Roll key on the table is disabled.
- **Torn from the back.** A face-down card shows its name, and each line holding revealed entries
  (its label and those entries), as a strip of the front showing through a tear in its brown "Hollow"
  back, where the line sits, with ragged edges and the torn piece rolled up at the strip's right end.
  Only those words reach a player's page.
- **Info cards** (Bill, 11-18: "Let's have 'Info N' cards"). An NPC can have white Info cards that
  slide out from under its card on tabs, "Info 1", "Info 2" when there is more than one. Each is a
  list of the GM's clues, a line apiece, reading `CATEGORY: DESCRIPTION` ("MOTIVATION: it doesn't like
  its orders"). A clue is revealed whole, like an entry. Its category is the word before its colon:
  Skill, Resource, Motivation, Item or Opinion; any other ("WHAT IT KNOWS ABOUT TRUDY") is up to the GM, so it
  counts as ANY, which the dropdown lights with every category. The GM writes on an Info card as on the
  front. Which card is slid out is each person's own.
- **The NPC's menu** (Bill, 11-18: "let's put a dropdown after the GM die and use it for creating stuff
  on the NPC, like Info and Opinion Records"). On the GM's page, a card the GM owns has a ▾ after the
  "GM" die on its pool; its **Info card** makes one, slid out with the cursor in it, and its **Opinion
  of** makes an Opinion Record (see `connections.md`).
- **The cards under an NPC are tabbed manila folders** (Bill, 11-18: "theme the cards like tabbed
  manila folders"), each with a folder's tab; Info cards are white, Opinion Records pink.
- **Emptying a card puts it away** (Bill, 11-18: "let's just make deleting all the text on a card put
  it away"): a card with all its text deleted is gone once the GM clicks away, buried on Boot Hill
  with the words it had (Bill, 11-18: "Let's use Boot Hill"; see `boothill.md`). **Undo** (Ctrl+Z, ⌘Z)
  on the GM's page, outside any text being written, digs up the newest Info card or Opinion Record buried
  in the current graveyard, back where it was and slid out. It undoes nothing else ("Cards only").
- **The eye covers the Info cards too**, and the Opinion Records (see `connections.md`): with it open,
  a click on a clue tears it out or mends it.
  A player sees an Info card's tab only once one of its clues is revealed, and the card face-down,
  each revealed clue torn through its back.
- **A pool has two mats** (Bill, 11-16: "At the game table, there would be an Influence Pool mat for
  the NPC on the table and another one behind the GM screen"). A **contribution** is an Influence put
  in a pool by someone other than its character's owner: a chip a player (or the GM, on a player's
  character) put there, or a card from another owner's character. Contributions are the public mat,
  seen by everyone ("since we're all speaking out loud and shoving chips around at the table"), a
  card from a hidden character face-down with its value. Everything else in the pool, what its own
  side put there, is the **private mat**: only the owner and the GM may see it, and
  it never reaches anyone else's page, not even face-down. The game counts the whole pool, piled,
  contributions included, each counted as it is, never copied; the public mat is only for watching
  (Bill, 11-16: "Nothing uses the chip counts in the public mats").
- **A chip remembers who put it in a pool** (`by`), and a chip moved into a pool from the table takes
  the mover's name. A chip moved into a hidden pool by its own side goes private, leaving the other
  pages. Chips already in pools before this belong to the private mat.
- **Stagger is always seen** (Bill, 11-16: "Stagger should always be visible to everyone. They can
  tell when the opposition is becoming off-balance and when they use a Rest action to clear it up"):
  a pool's Stagger slot is public whoever put its chips there, on neither mat, and shows to everyone
  as its owner sees it, piles included; a card in it from a hidden character face-down with its value.
- **Roll Ups happen behind the screen**: outside Stagger, piles are worked out only where the private mat is seen;
  a pool you can't see shows its contributions as they were put, never piled (Bill, 11-16: "The
  public view should only show publicly contributed influences and chips and should not do rollup").
- **The GM sees the private mats**; "You are" shows the table as a player sees it.

## Private paper

Bill (2026-11-23): "there should be a way for a player to make things they put on the desktop
private ... let them reveal only to the GM. The GM could write on it as well to answer a quick
question." The note passed across a real table, and the GM's handout (`carves/done/organizing.md`, Item 1).

- **Paper has an owner**, at first its maker: a sticky, loose text or an image remembers who made it.
  Paper from before this has no maker and counts as the GM's (Bill, 2026-11-24: "Unowned notes should
  count as owned by the GM"): everyone still reads it until the GM picks otherwise, and it shows a fold
  as the GM's paper does.
- **Its owner picks who reads it**: everyone, or a few. Paper goes to any of the players, and a
  player's to the GM, or to no one but its owner ("just me"). The GM reads every note but a player's
  "just me" (Bill, 2026-11-25: "The owner should be able to ... share with several people or the whole
  table").
- **A folded corner** says which: flat for everyone, folded for a few ("Let's do a folded corner").
  Beside it, on its owner's page, a dropdown picks: Everyone, Just me, and a checklist of the players
  ("Several players"); a player's adds GM, the note to the GM alone, and on the GM's none checked is
  the GM alone, as Just me is. The list holds the players at the table and anyone the note already
  went to, its owner left out. Only its owner changes who reads it. A press anywhere outside the
  dropdown closes it and still does what it would have (Bill, 2026-11-25: "a mousedown that's not in
  the dropdown close it without consuming the event"), so a press on another note both closes it and
  picks that note up. Open, the dropdown lies over everything on the table, papers pinned to its own
  docket too (Bill, 2026-11-25: "The docket menu needs a z-index boost -- it's occluded by an item
  inside").
- **Handing a note over** (Bill, 2026-11-25: "The owner should be able to reassign ownership"): under
  the readers, the dropdown's "Give to" lists the players at the table, and the GM for a player's
  note. Whoever gets it becomes its owner, and the giver no longer reads it unless everyone does, as a
  note handed across a real table is gone from your hand. The rest who read it still do. A "just me"
  note becomes the new owner's "just me", private now to them. The GM can hand over any note the GM
  can see (Bill, 2026-11-24: "The GM should be able to reassign visible notes"), so on the GM's page a
  note someone else owns has a dropdown with "Give to" alone.
- **By the fold, who else reads it** (Bill, 2026-11-23: "Names by the fold"), as name tags in the hand
  font: everyone who reads it but you, "GM" for the GM, so Sam's note to the GM shows "GM" on Sam's
  page and "Sam" on the GM's, and the GM's handout to Sam and Dana shows "Sam, Dana" on the GM's page
  and "GM, Dana" on Sam's. A note only you read shows "me".
- **Everyone who reads it may write on it** ("Yes, both ways"): the GM answers a player's note on the
  note, and a player a handout; on a note to several players, they all see the answer. They may move
  it and put it away too.
- **Nobody else's page gets it at all** ("Don't see it at all"), not even face-down: not its place, not
  its moves while carried, not its picture. Pinned to a card others see, it rides that card only on
  the pages that read it. Buried, it's left out of their Boot Hill too (Bill, 2026-11-24: "Nothing"):
  a burial of nothing but such notes isn't listed for them, and their changes to Boot Hill leave it
  where it lies.
- **A "just me" note is that page's own** ("Player's page only"), as a torn tape is: never sent, kept
  through reloads on that page, buried in that page's Boot Hill, and not in the game the GM saves.
  Turned public or sent to the GM, it goes to the table; turned "just me", it leaves every other page.
  Handed to someone, it crosses the table to their page alone, which takes it as its own "just me".
  Since no other page reads it, the GM's page lets a player hand a "just me" note to someone though it
  holds no copy to check, where it never lets a player make paper under another's name.
- **Renaming** a player carries their paper with them: what they made, and what was sent to them.

## Identity and viewing as

- **Real identity is separate from who you're viewing as.** Only a real GM gets the "You are"
  chooser (a thing at the table, not a dropdown), which lists the GM, the players present, and the defaults, and keeps it while viewing as
  a player. A player's page has none and is fixed to that player.
- The plain page is the GM's. An invite link makes a player, named per tab, so one browser can seat
  several players, a tab each (Bill, 11-22).

## Renaming

- **A player renames by clicking their own name in the bar** (Bill, 11-19: "maybe click on the name in
  the top bar to edit and disallow duplicate names"). It asks for the new name, as arriving does.
- **Everything they hold follows it** ("Everything they hold"): the characters they own, the chips they
  put in pools, their claim to the name, and their seat. Receipts already printed keep the old name.
- **A name in use is refused** ("Any name in use, any case"): one another browser holds, any character's
  owner, "GM" or "open", compared without case, and a blank one or one over 32 characters. The tag
  says why and the name stays.
- **The GM's page decides it**, holding the claims: with it away, the tag says so ("No, it says why").
- **Taken, the page reloads as the new name** ("It reloads as the new name").
- Owners are names, so a rename rewrites them. The name's key goes with it, so its id holds. Another tab
  still on the old name takes it as a new name when it reloads.
