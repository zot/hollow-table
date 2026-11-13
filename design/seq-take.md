# Sequence: taking an Attack, and naming it

```
Target's owner: Tape, PieceView      Absorb          GM: Rolls                          Attacker: Tape
    |                                   |                 |                                    |
1   |--Take N (receipt.attack, untaken) |                 |                                    |
1.1 |--card to its back, the column     |                 |                                    |
1.2 |--pages(card, kind, N)------------>|                 |                                    |
1.3 |--‹ k of n ›, the Slots shown; Escape backs out      |                                    |
1.4 |--take {id, page}------------------------------------>|                                    |
1.4.1                                   |                 |--owner or GM? untaken? one of pages?|
1.4.2                                   |<--fill(card, kind, page, attacker)-----|              |
1.4.3                                   |                 |--change; attack taken, waiting names|
1.5 |<--the receipt again, every tape (as a CRIT)---------|--------------------------------->|
2   |                                   |                 |<--name {id, column, row, name}-----|
2.1                                     |                 |--attacker's owner or GM? waiting?   |
2.2                                     |                 |--the slot named; no longer waiting  |
2.3 |<--the receipt again, every tape-------------------------------------------------------->|
```

- At step 1.4.1 the GM's page works the pages out again from its own records, so a page that
  doesn't match is refused, as is a second take of the same Attack.
- At step 2 the attacker may not see the card; the name goes through the GM's page and is written
  there, so it reaches the target's owner like any change.
