# Tap
**Requirements:** R54-60, R66, R210-212, R225, R250, R259-262, R343, R344, R432, R433

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
  - an Opinion (R433), `<npc oid>:o<record oid>/<name>`: a line of an Opinion Record (crc-Records.md)
    whose Influence is `<name>`, read with its parentheses taken off; it spends as a Motivation does,
    into parentheses after its fixed Level, and makes a `mot` card named "<NPC>: <name>", at home with
    the NPC, whose oid starts the source. The record, not the NPC, is what it changes.
  - a named Conviction or Burden, `<oid>:<damage>/lasting` (R343): worth Absorb.lastingLevels of its
    points less its `spent`, and makes a card of its column's kind named after it.
- Who may tap (R259): a `<res>` only its character's owner or the GM; Motivations and Damage anyone
  (R212); an Opinion only the GM (R432). The rules below never ask who; mayTap does, and the page asks it before a tap starts.

## Does
- mayTap(viewer, char, rest): whether this viewer may tap this source (R259).
- leftOf(chars, source): the Levels a source has left to tap, 0 when it is unknown
  or unnamed (R250: PieceView fades a dry glyph).
- Each takes a lookup from oid to a character or an Opinion Record, and returns the card and the
  characters and records it changed.
- tap(chars, source, where, oid): a new resource-made card born at Min, named after the source, current source set,
  ledger `{source: 1}`, and the source spent by one Level. A Damage source makes a card of its kind
  (`damage` set); a Motivation or an Opinion a `mot` card of its sign (R260, R433).
- feed(chars, card, source?, oid): a Level from the current source (or from a dropped source, which becomes
  current) into the card. Refused for a plain card, and for a source of another kind than the card
  (a `<res>` and a card of a Damage kind, two Damage kinds, or a Motivation or Opinion and any other kind). For a used card, a new card beside it
  instead.
- unfeed(chars, card): a Level back to the current source, never below what it put in, and the card
  never below Min.
- kill(chars, card): an unused tap's Levels go back to their sources.
- recharge(character): End restores every Damage slot's and box's spent Levels, and a Conviction's
  or Burden's (R343).
- mildGone(card) (R344): End for a tapped card: the card less the Levels its ledger says came from
  a Mild slot or box (`<damage>/mild`, `<damage>/mild#k`), 2 points each and never below Min, its
  ledger without them and its current source one of the rest; null when Mild sources gave all of
  it; the card itself when none did.
- rechargeMotives(character): the end of a scene removes every Motivation's parentheses (R262).

## Collaborators
- MarkReader: reads and spends the source's Level.
- Influence: points.

## Sequences
- none
