# Tap
**Requirements:** R55, R56, R57, R58, R59, R60, R66

Tapping Resources, Biases, Afflictions and Injuries into Influence cards, with a ledger per source so
every Level can go back where it came from. Pure: returns the records to write.

## Knows
- A source: a mark on a character's card (`<res>`, `<bias>`, `<aff>`, `<inj>`), named
  `<character oid>:<name>`.

## Does
- tap(source, at): a new resource-made card born at Min, named after the source, current source set,
  ledger `{source: 1}`, and the source's text spent by one Level.
- feed(card, source?): a Level from the current source (or from a dropped source, which becomes
  current) into the card. Refused for a plain card. For a used card, a new card beside it instead.
- unfeed(card): a Level back to the current source, never below what it put in.
- kill(card): an unused tap's Levels go back to their sources.
- recharge(character): End restores every Bias and Affliction row's spent Levels.

## Collaborators
- MarkReader: reads and spends the source's Level.
- Influence: points.

## Sequences
- none
