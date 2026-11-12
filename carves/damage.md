# Damage

Make Damage easy to manage at the table: the card back's Biases, Afflictions and Injuries, what an
Attack does to them, and how they come and go. The rules are Hollow Folks, *Damage Resources*,
*Injury, Bias, and Affliction Pools*, *Absorbing Damage* and *Convictions and Burdens*; Bunkum uses
Bias alone (*Bunkum*, its Influence Pool Mat).

Opened by Bill, 2026-11-12, after the back gained its Damage columns.

## Status

- [x] ~~**Item 1 — Damage columns, kinds and absorb in the records and rules.**~~ **LANDED (2026-11-12.)**
- [ ] **Item 2 — draw and edit the back.** **OPEN (not queued.)** PieceView, with the rest of the views.
- [ ] **Item 3 — Slots and absorb from Con and Wis.** **OPEN (not queued.)**
- [ ] **Item 4 — taking an Attack.** **OPEN (not queued.)**
- [ ] **Item 5 — Damage that ends.** **OPEN (not queued.)**
- [ ] **Item 6 — Convictions and Burdens.** **OPEN (not queued.)**
- [ ] **Item 7 — what a card tapped from a Mild slot is worth.** **OPEN (not queued.)**

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

@undecided: fill automatically from the front, offer it, or leave it to hand.
@undecided: Bunkum characters have no Con, so their Injury column has no extra Slots; whether the
table needs a per-game rule for that, or the empty column is enough.

## Item 4

An Attack's Result against a character, worked the way *Absorbing Damage* says: absorb comes off
first; then Slots of the Attack's kind fill, each absorbing its amount (Mild 2, Min 2, Sig 4, Maj
6), and they must keep filling while Result remains, using the smallest available Slot even when
it is larger than what is left. The first Damage in a Slot of a size is named by the attacker; later
ones are nameless, which on the card is a checked box. Result left with no Slot free incapacitates
the character: unconscious for a physical Attack, a Conviction for a mental one, a Burden for a
psychological one.

@undecided: the book gives the target the choice of Slots; whether the table proposes a filling
for the target to accept, or only shows what is free.

## Item 5

How Damage leaves: a Mild Damage Resource disappears immediately after the Contest; Biases and
Afflictions last one hour per point and all go with sleep; a Temporary Bias or Affliction ends with
the scene; Injuries last until healed. End already recharges spent Levels (R117).

@undecided: whether End also clears Mild slots, and how much of the rest the table tracks rather
than leaving to the GM.

## Item 6

Convictions and Burdens: where they sit on the card, and what tapping them makes. In Bunkum,
Convictions are Resources that create Bias Influences, like Biases (*Bunkum*, Resources).

## Item 7

The open question in `specs/influence.md`: what a card tapped from a Mild slot is worth. The
proposal there is Min (2), vanishing at End; settling it updates the spec.
