# Records
**Requirements:** R23, R26, R28, R36, R38, R47, R63, R98, R126, R130, R191, R209, R211, R248, R260, R264, R266, R278, R279

The game as typed records: the lingua franca every other part speaks. What is saved, sent, redacted,
checkpointed and exported is these records; the DOM is a view of them. Plain data, no methods, so a
record crosses the wire, the database and an export file unchanged.

## Knows
- Rid: a record's key. `o:<oid>` for a piece; `yards`, `meta`, `book`, `tape` for the singletons.
- Oid: 8 hex characters, unique within a game. Player-made characters number from 100000 up so they
  can't collide with the GM's.
- Place: `{x, y, z, tilt}` on the table.
- Who: a character's owner: `GM`, `open`, or a player's name.
- SlotName: `bonus | main | edge | stagger | bias | affliction | injury`, in that order.
- Where (for chips and Influence cards): `drawer` | `used` | `{slot: oid, name: SlotName}` |
  `{table: Place}`. Order within a drawer, used pile or slot is a number `n`.
- Character: `{kind: 'character', oid, owner: Who, name, pool: Place, card: Place, flipped,
  gathered, front: Marked, back: CardBack}`. `name` is public; `front` and `back` are secret.
- Damage: `bias | affliction | injury`, the back's columns (Hollow Folks, *Injury, Bias, and
  Affliction Pools*), named as their pool slots. Level rows:
  `mild | min | sig | maj`.
- CardBack: `{damage: {bias, affliction, injury: {mild, min, sig, maj: DamageSlot}}, absorb: {bias,
  affliction, injury: number}, notes: Marked}`. `absorb` is no longer read: a column's absorb is worked out from the card's attributes (R264); the
  field stays so old games load.
- DamageSlot: `{name: string, boxes: boolean[], spent: number[]}`. `name` is the entry, plain (its
  column makes it a Bias, Affliction or Injury, R209); the boxes are the extra Slots of Hollow Folks,
  *Absorbing Damage*, drawn as on Samuel Diamond's card, *A Ghoulish Problem*; `spent[0]` is the Levels tapped from the slot
  and `spent[k]` from its k-th box, until End recharges them.
- Influence: `{kind: 'influence', oid, home: oid, where: Where, n, name, sign, points, used, crit,
  tap?: {ledger: {[source]: number}, current: source}, damage?: Damage, mot?: true}`. `damage` marks a card
  tapped from a Damage Resource: an Influence of that kind (R211); `mot` one tapped from a
  Motivation, a Main Pool Influence (R260). `home` is the character whose drawer it
  belongs to and who may read it. A source is `<character oid>:<Resource name>`.
- Chip: `{kind: 'chip', oid, where: Where, n, sign, points, rider}`. A loose odd point is
  `points: 1`; `rider` is a +1 riding the chip.
- Sticky, Text: `{kind, oid, place, text: Marked, pin?: {card: oid, dx, dy}}`; a sticky may carry
  `big: true` (R248).
- Image: `{kind: 'image', oid, place, blob: sha256, w, h, pin?}`.
- TornRoll: `{kind: 'tornroll', oid, place, receipts: Receipt[]}`.
- Reference: `{kind: 'reference', oid, place, which: 'howto' | 'actions'}`.
- Receipt: `{id, at, title, by?, action?, dice: Die[], influence?, base?, vs?, row?, resolution, level, outcome,
  crit?: {max, dbl, chosen: 'max' | 'dbl', locked}, priv?, ok?}`; `ok` is this page's own roll
  having reached the table. Die: `{c: W|G|R|B|Y, v, added, dropped}`.
- Yards: `{yards: [{name, named, items: [{name, records: PieceRecord[]}]}]}`; a burial keeps the
  records buried together (a character with its cards, a sticky).
- Meta: `{round, rolls, counts?: {[character oid]: number}}`; `counts` numbers each character's rolls
  (R278).
- Book (the GM's page only, never sent): `{claims: {name: browser id}, gv, tomb: {rid: gv}, hillGv?}`:
  the table's version, the version each piece was deleted at (at most 3,000), and the version Boot
  Hill last changed at.
- Tape (each page's own, never sent): `{receipts: Receipt[]}`.
- Marked: card text with marks (see crc-MarkedText.md), stored as its source string.

## Does
- isPiece(rid), oidOf(rid), ridOf(oid): key helpers.
- check(rid, record): validates a record for its key field by field (types, ranges, string caps, a
  piece's oid matching its key); anything off is rejected whole. Every record from another page or an import passes through it.

## Collaborators
- MarkedText: the type of every text field.

## Sequences
- seq-save.md
