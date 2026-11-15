# Damage

Make Damage easy to manage at the table: the card back's Biases, Afflictions and Injuries, what an
Attack does to them, and how they come and go. The rules are Hollow Folks, *Damage Resources*,
*Injury, Bias, and Affliction Pools*, *Absorbing Damage* and *Convictions and Burdens*; Bunkum uses
Bias alone (*Bunkum*, its Influence Pool Mat).

Opened by Bill, 2026-11-12, after the back gained its Damage columns.

## Status

- [x] ~~**Item 1 — Damage columns, kinds and absorb in the records and rules.**~~ **LANDED (2026-11-12.)**
- [x] ~~**Item 2 — draw and edit the back.**~~ **LANDED (2026-11-13 — `#5`.)** PieceView, with the rest of the views.
- [x] ~~**Item 3 — Slots and absorb from Con and Wis.**~~ **LANDED (2026-11-13 — `#6`.)**
- [x] ~~**Item 4 — taking an Attack.**~~ **LANDED (2026-11-13 — `#7`.)**
- [x] ~~**Item 5 — Damage that ends.**~~ **LANDED (2026-11-15 — `#8`.)**
- [x] ~~**Item 6 — Convictions and Burdens.**~~ **LANDED (2026-11-15 — `#9`.)**
- [ ] **Item 7 — what a card tapped from a Mild slot is worth.** **OPEN (#10.)**

## Decisions

DECIDED (Bill, 2026-11-12):

- **The back has three Damage columns**, Biases, Afflictions and Injuries, each with a Mild, Min,
  Sig and Maj slot, a box per extra Slot of that Level, and an absorb number. An empty column
  collapses to its name, so a Bunkum back shows Biases alone.
- **A slot's column says what its entry is.** The entry is stored as a plain name and drawn as a
  `<bias>`, `<aff>` or `<inj>` mark; those tags are never stored, so Damage appears only in its
  slots.
- **A checked box is a Resource of its own**, named after its slot and worth the slot's Level.
- **A Damage Resource makes an Influence of its kind**, which goes only into its kind's pool slot
  and takes only its kind.
- **Anyone may tap any character's Damage** for the current action; the GM decides what applies.
- **The book's worked example is wrong where it puts Bob's Injuries in the Main pool**; the Pool
  rule stands. Bill fixes the book.
- **The layout follows the printed cards**: Samuel Diamond's card in *A Ghoulish Problem* for the
  columns, the example card in *Bunkum* for the boxes in front of the Level word and the
  `(absorb N)` heading.

## Item 1

Landed in the specs (`table.md`, `influence.md`, `rolls.md`), R23, R54, R61, R62, R117, R204 and
R209–R214, the design (crc-Records, crc-Tap, crc-Pool, crc-Visibility and the rest), and the rules:
`CardBack.damage` and `absorb`, Tap's `<damage>/<row>[#k]` sources, `Influence.damage`,
`Pool.accepts`. Every alarm on it was pulled 2026-11-12, and it landed in the commit *Build scaffold,
pure rules, and Damage columns*.

## Item 2

The back as `ui-card.md` draws it: the three columns side by side, each slot's boxes in front of
its Level word (R213), the `(absorb N)` heading (R214), tap glyphs on named slots and checked boxes,
spent Levels shown on the slot, and R203's collapsing. Part of the views layer of the pour, so it
is scheduled with PieceView rather than on its own.

## Item 3

The Slots table in *Absorbing Damage* gives the extra Mild, Min and Sig Slots and the Result
absorption for each Con and Wis Level: Wis for Biases and Afflictions, Con for Injuries. The table
could fill a back's boxes and absorb from the card's front, or offer to, so nobody counts boxes by
hand. The Docs export mangles the table, so it is read from the PDF.

DECIDED (Bill, 2026-11-12, T7): filled automatically from the front, never typed (R264, R265).
DECIDED (Bill, 2026-11-13): Bunkum characters have no Con, so their Injury column gets no extra
boxes, and no per-game rule is needed: R265 already keeps the boxes a card has when no attribute
is marked for the column.

## Item 4

An Attack's Result against a character, worked the way *Absorbing Damage* says: absorb comes off
first; then Slots of the Attack's kind fill, each absorbing its amount (Mild 2, Min 2, Sig 4, Maj
6), and they must keep filling while Result remains, using the smallest available Slot even when
it is larger than what is left. The first Damage in a Slot of a size is named by the attacker; later
ones are nameless, which on the card is a checked box. Result left with no Slot free incapacitates
the character: unconscious for a physical Attack, a Conviction for a mental one, a Burden for a
psychological one.

DECIDED (Bill, 2026-11-13): the table proposes every possible filling and the target flips through
them like pages: "There aren't *that* many possibilities because there's a limited number of
target slots." Filling them all leads to a Conviction or a Burden, which the table doesn't track
yet (Item 6), so this part depends on Item 6 for what happens when the Slots run out.
DECIDED (Bill, 2026-11-13): the excess from a physical Attack makes a **Condition**, as a mental
one makes a Conviction and a psychological one a Burden. The book doesn't have this yet: *Absorbing
Damage* only says the character falls unconscious (or dies, from Lethal Damage), and "Condition"
is not a defined term in any published book; Conditions come from the unpublished Hollow physical
injury rules (Bill, 2026-11-13).
DECIDED (Bill, 2026-11-13): **any Slots that account for the damage.** "The player can choose any
slots, as long as they account for the damage. But if only a Maj slot remains and they take 1 point
of damage, they must use the Maj slot to cover it. So covering 3 points of damage with 2 minor slots
could be a worse choice than using a Sig slot. On the other hand, smaller slots heal faster, so it's
not a simple choice." Read as: a filling is a set of available Slots that covers the Result, with
none of them spare (drop any one and the rest fall short); when none can cover it, every Slot fills
and the rest is overflow.
DECIDED (Bill, 2026-11-13): **the target's owner chooses the Slots; the attacker names them**,
"unless they're boxes", which stay nameless. Same as at the table with pencil and paper.
Found 11-13: targeting's chooser offers Mental or Psych **Defend** (R83, `rollrow.ts`), only when
the card's two numbers differ; there is no physical choice, and a roll records `defend: mental |
psych` only. Bill (11-13): the choice "can 'color' the action". #7 needs the Attack's kind every
time.

## Item 5

How Damage leaves: a Mild Damage Resource disappears immediately after the Contest; Biases and
Afflictions last one hour per point and all go with sleep; a Temporary Bias or Affliction ends with
the scene; Injuries last until healed. End already recharges spent Levels (R117).

~~@undecided: whether End also clears Mild slots, and how much of the rest the table tracks rather
than leaving to the GM.~~ Settled below.

DECIDED (Bill, 2026-11-15): **End clears the Mild slots**, name and boxes, in all three columns: End
ends the Conflict, and the book's Mild Damage "disappears immediately after the Contest". The hours,
sleep, Temporary Biases and Afflictions, and healing stay the GM's call, erased by hand; the table
knows no clock, Scene or Event.
DECIDED (Bill, 2026-11-15): **End keeps recharging Biases, Afflictions and Injuries** (R117), a
table ruling: the book has Biases and Afflictions "recover their points at the end of the Event",
and at this table End stands in for that.

## Item 6

Convictions, Burdens and Conditions (Bill, 2026-11-13: a Condition is the physical one): where
they sit on the card, and what tapping them makes. In Bunkum,
Convictions are Resources that create Bias Influences, like Biases (*Bunkum*, Resources).

The book (Hollow Folks, *Convictions and Burdens*): "long-lasting Biases" and "long-lasting
Afflictions" that "start at Minor and absorb up to 2 points, then rise to Significant, absorbing up
to 4 more points, and so on, all the way up to Exquisite, for a potential total of 30 points
absorbed across several Results." Bunkum: tapping them "depletes them temporarily until the end of
the Scene"; Recovery lowers them by Levels at the end of an Event (Glimmer: a week of rest a Level).

DECIDED (Bill, 2026-11-15): **under their column**: a line under the Maj slot, a Conviction under
Biases and a Burden under Afflictions, with its name, its Level, and its points toward the next
Level: *Conviction Cheats always win Sig (5/6)*.
DECIDED (Bill, 2026-11-15): **it grows**: one per column, and later overflow adds its points and
raises its Level (Min 2, Sig 6, Maj 12, Ext 20, Exq 30), "absorbed across several Results".
DECIDED (Bill, 2026-11-15): **the attacker names it**, as a new Damage slot, and the GM can rename it.
DECIDED (Bill, 2026-11-15): **Conditions stay a Note**: physical overflow is still written in the
card's Notes until the physical injury rules are published.
Table's choice (Daneel, 2026-11-15, for Bill's review): the table knows no Event, so Recovery is the
GM's hand: rewriting the points lowers it, and 0 points with no name removes it.

## Item 7

The open question in `specs/influence.md`: what a card tapped from a Mild slot is worth. The
proposal there is Min (2), vanishing at End; settling it updates the spec.
