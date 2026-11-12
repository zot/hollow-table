# Tap
**Requirements:** R54, R55, R56, R57, R58, R59, R60, R66, R210, R211, R212

Tapping Resources, Biases, Afflictions and Injuries into Influence cards, with a ledger per source so
every Level can go back where it came from (Hollow Folks, *Tapping Resources* and *Damage
Resources*). Pure: returns the records to write.

## Knows
- A source, named `<character oid>:<rest>`:
  - a `<res>` mark on the front, `<oid>:<name>`; it keeps its Level in its text.
  - a named Damage slot, `<oid>:<damage>/<row>` (`injury/sig`), or its k-th checked box,
    `<oid>:<damage>/<row>#<k>`. Each is worth `rowLevels(row)` less what its `spent` entry holds
    (crc-Records.md), and makes a card named after the slot.
- Anyone may tap any character's sources (R212); nothing here asks who is tapping.

## Does
- Each takes a lookup from oid to character and returns the card and the characters it changed.
- tap(chars, source, where, oid): a new resource-made card born at Min, named after the source, current source set,
  ledger `{source: 1}`, and the source spent by one Level. A Damage source makes a card of its kind
  (`damage` set).
- feed(chars, card, source?, oid): a Level from the current source (or from a dropped source, which becomes
  current) into the card. Refused for a plain card, and for a source of another kind than the card
  (a `<res>` and a card of a Damage kind, or two Damage kinds). For a used card, a new card beside it
  instead.
- unfeed(chars, card): a Level back to the current source, never below what it put in, and the card
  never below Min.
- kill(chars, card): an unused tap's Levels go back to their sources.
- recharge(character): End restores every Damage slot's and box's spent Levels.

## Collaborators
- MarkReader: reads and spends the source's Level.
- Influence: points.

## Sequences
- none
