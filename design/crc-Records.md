# Records
**Requirements:** R23, R26, R28, R36, R38, R47, R462, R98, R126, R130, R191, R209, R211, R248, R463, R264, R266, R278, R279, R312, R317, R340, R341, R343, R347, R348, R362, R360, R381, R380, R391, R400, R407-409, R419, R426, R429, R436, R439, R464

The game as typed records: the lingua franca every other part speaks. What is saved, sent, redacted,
checkpointed and exported is these records; the DOM is a view of them. Plain data, no methods, so a
record crosses the wire, the database and an export file unchanged.

## Knows
- Rid: a record's key. `o:<oid>` for a piece; `yards`, `meta`, `world`, `book`, `tape` for the singletons.
- Oid: 8 hex characters, unique within a game. Player-made characters number from 100000 up so they
  can't collide with the GM's.
- Place: `{x, y, z, tilt}` on the table.
- Who: a character's owner: `GM`, `open`, or a player's name.
- SlotName: `bonus | main | edge | stagger | bias | affliction | injury`, in that order.
- Where (for chips and Influence cards): `drawer` | `used` | `{slot: oid, name: SlotName}` |
  `{table: Place}`. Order within a drawer, used pile or slot is a number `n`.
- Character: `{kind: 'character', oid, owner: Who, name, pool: Place, card: Place, flipped,
  gathered, front: Marked, back: CardBack, shown?: string[]}`. `name` is public; `front` and `back` are
  secret. `info` (R400) is an NPC's Info cards, a text each, absent when none. `shown` (R391) is the front's revealed lines, each by its text, for an NPC the GM reveals
  lines of; absent when none.
- Damage: `bias | affliction | injury`, the back's columns (Hollow Folks, *Injury, Bias, and
  Affliction Pools*), named as their pool slots. Level rows:
  `mild | min | sig | maj`.
- CardBack: `{damage: {bias, affliction, injury: {mild, min, sig, maj: DamageSlot}}, absorb: {bias,
  affliction, injury: number}, notes: Marked, lasting?: {bias?, affliction?: Lasting}}`. `absorb` is no longer read: a column's absorb is worked out from the card's attributes (R264); the
  field stays so old games load.
- DamageSlot: `{name: string, boxes: boolean[], spent: number[]}`. `name` is the entry, plain (its
  column makes it a Bias, Affliction or Injury, R209); the boxes are the extra Slots of Hollow Folks,
  *Absorbing Damage*, drawn as on Samuel Diamond's card, *A Ghoulish Problem*; `spent[0]` is the Levels tapped from the slot
  and `spent[k]` from its k-th box, until End recharges them.
- Lasting (R341, R343): a Conviction (`lasting.bias`) or a Burden (`lasting.affliction`), `{name,
  points, spent, naming?}`: its name, the overflow points it has absorbed, the Levels tapped until
  End, and while new the attacker's name it waits for (`{by, id}`, as DamageSlot.naming). Optional,
  so old games load; a back without one has no `lasting`.
- Influence: `{kind: 'influence', oid, home: oid, where: Where, n, name, sign, points, used, crit,
  tap?: {ledger: {[source]: number}, current: source}, damage?: Damage, mot?: true, once?: true}`. `damage` marks a card
  tapped from a Damage Resource: an Influence of that kind (R211); `mot` one tapped from a
  Motivation, a Main Pool Influence (R463); `flag` (R464) `{why, fed: {source: Levels}, plain?}` a tap
  the GM rules on; `once` one an action put in its actor's Main pool for its
  own roll (R362, R353). `home` is the character whose drawer it
  belongs to and who may read it. A source is `<character oid>:<Resource name>`.
- Chip: `{kind: 'chip', oid, where: Where, n, sign, points, rider, by?}`. A loose odd point is
  `points: 1`; `rider` is a +1 riding the chip; `by` is who put it in a pool (R360), absent on
  chips from before. Chips are never merged (R366): a Roll Up is a pile, worked out, never stored.
- Sticky, Text: `{kind, oid, place, text: Marked, pin?: {card: oid, dx, dy}}`; a sticky may carry
  `big: true` (R248).
- Image: `{kind: 'image', oid, place, blob: sha256, w, h, pin?}`.
- TornRoll: `{kind: 'tornroll', oid, place, receipts: Receipt[]}`.
- Reference: `{kind: 'reference', oid, place, which: 'howto' | 'actions'}`.
- Opinion (R419, R426, R436): `{kind: 'opinion', oid, holder, of, text, shown?, on?, name?}`, an Opinion
  Record (crc-Connections.md), with no place; `shown` its revealed lines by their words, and, once one
  is, `on` the cards it shows under and `name` what it is of, written by the GM's page.
- Connections (R407-409): `{kind: 'connections', oid, place, away?, rows: {id, name, oid?, group?}[],
  cells}`, the Connection Table (crc-Connections.md); a cell is a Level, -5 to 5, keyed `<row id>><column id>`.
- Receipt: `{id, at, title, by?, action?, dice: Die[], influence?, base?, vs?, row?, resolution, level, outcome,
  crit?: {max, dbl, chosen: 'max' | 'dbl', locked}, priv?, ok?}`; `ok` is this page's own roll
  having reached the table. Die: `{c: W|G|R|B|Y, v, added, dropped}`.
- Rows (R381): `{rows: {[character oid]: Roller}}`, each character's roll row (action, alternative,
  type, hand, opponent, Defend kind, what was pointed at, the White row and whether picked by hand,
  the GM's private switch, and `reaction`, the NPC's card, for a Reaction roll, R429). Written as
  truth only by the GM's page.
- Yards: `{yards: [{name, named, items: [{name, records: PieceRecord[]}]}]}`; a burial keeps the
  records buried together (a character with its cards, a sticky); an Info card's burial has no
  records and `info: {oid, k, text}` (R403).
- Meta: `{round, rolls, counts?: {[character oid]: number}, marked?: true}`; `marked` says an older game's
  Fields and Skills have been marked (R380); `counts` numbers each character's rolls
  (R278).
- World (R347, R348): `{set, total}`, the world's Total Influence in the brass tray; `set` false is a
  blank tray, and no record is the same. `WORLD` (`'world'`) is also the opponent a roll aims at the
  world with, never an oid (an oid is eight hex digits). Written only by the GM's page.
- Book (the GM's page only, never sent; its claims go out as `claims`, R446): `{claims: {name: browser id}, gv, tomb: {rid: gv}, hillGv?}`:
  the table's version, the version each piece was deleted at (at most 3,000), `floor` (the newest version the caps have dropped, R448), and the version Boot
  Hill last changed at.
- Tape (each page's own, never sent): `{receipts: Receipt[]}`.
- Marked: card text with marks (see crc-MarkedText.md), stored as its source string.

- Book.kept (R308, R313): the GM's page's recent rolls, `{character, n, full, roller, table, tab?, sealKey?, priv?}`, at most KEPT (200); the book is never sent.
- DamageSlot.naming (R312): `{by, id}` while the Slot waits for the attacker's name: the attacking
  character's name, and the receipt it came from.
- Receipt.attack (R308): `{target, name, from, kind, result, taken?, waiting?}` (`from` the attacking character's name), the Attack a receipt can
  give; `waiting` lists the Slots waiting for names, as `{damage, row}`, where `row` is `lasting` for a new
  Conviction or Burden (R340).

## Does
- Receipt.transfer (R439, R441): `{target, name, sl, done?: {resource, moved, extra}}`, the transfer a
  successful Request against an NPC offers, `sl` its Success Level; `done` once the GM has made it.
- isPiece(rid), oidOf(rid), ridOf(oid): key helpers.
- check(rid, record): validates a record for its key field by field (types, ranges, string caps, a
  piece's oid matching its key); anything off is rejected whole. Every record from another page or an import passes through it.

## Collaborators
- MarkedText: the type of every text field.

## Sequences
- seq-save.md
