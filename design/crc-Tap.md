# Tap
**Requirements:** R54-60, R66, R210-212, R225, R250, R259-262

Tapping Resources, Biases, Afflictions and Injuries into Influence cards, with a ledger per source so
every Level can go back where it came from (Hollow Folks, *Tapping Resources* and *Damage
Resources*). Pure: returns the records to write.

## Knows
- A source, named `<character oid>:<rest>`:
  - a `<res>` mark on the front, `<oid>:<name>`; it keeps its Level in its text.
  - a `<mot>` mark on the front, `<oid>:<name>` likewise; its spending is temporary, the Levels left
    in parentheses after its written Level (MarkReader.adjust), and it makes a `mot` card.
  - a named Damage slot, `<oid>:<damage>/<row>` (`injury/sig`), or its k-th checked box,
    `<oid>:<damage>/<row>#<k>`. Each is worth `rowLevels(row)` less what its `spent` entry holds
    (crc-Records.md), and makes a card named after the slot.
- Who may tap (R259): a `<res>` only its character's owner or the GM; Motivations and Damage anyone
  (R212). The rules below never ask who; mayTap does, and the page asks it before a tap starts.

## Does
- mayTap(viewer, char, rest): whether this viewer may tap this source (R259).
- left(char, rest): the Levels a source of this character has left to tap, 0 when it is unknown
  or unnamed (R250: PieceView fades a dry glyph).
- Each takes a lookup from oid to character and returns the card and the characters it changed.
- tap(chars, source, where, oid): a new resource-made card born at Min, named after the source, current source set,
  ledger `{source: 1}`, and the source spent by one Level. A Damage source makes a card of its kind
  (`damage` set); a Motivation a `mot` card of the Motivation's sign (R260).
- feed(chars, card, source?, oid): a Level from the current source (or from a dropped source, which becomes
  current) into the card. Refused for a plain card, and for a source of another kind than the card
  (a `<res>` and a card of a Damage kind, two Damage kinds, or a Motivation and any other kind). For a used card, a new card beside it
  instead.
- unfeed(chars, card): a Level back to the current source, never below what it put in, and the card
  never below Min.
- kill(chars, card): an unused tap's Levels go back to their sources.
- recharge(character): End restores every Damage slot's and box's spent Levels.
- rechargeMotives(character): the end of a scene removes every Motivation's parentheses (R262).

## Collaborators
- MarkReader: reads and spends the source's Level.
- Influence: points.

## Sequences
- none
