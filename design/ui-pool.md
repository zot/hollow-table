# UI: a pool
**Requirements:** R28, R29, R30, R31, R37, R53, R78

Narrow (only Main and Bonus hold anything):
```
 Sam  [P1-die] gather   Infer 4 → 8  vs Devreux ⌖
┌──────┬──────┬─┬─┬─┬─┬─┐
│Bonus │Main  │E│S│B│A│I│     each narrow slot: 1em wide, its first letter, full name on hover
│  ●2  │ ●4   │ │ │ │ │ │
│      │ ●−2  │ │ │ │ │ │     negatives stack from the bottom, signed
└──────┴──────┴─┴─┴─┴─┴─┘
 drawer: [Keep the Peace +Sig][Self-Preservation +Sig]  [+] [−]  used 0  kill
```

Widened (a chip carried near the pool):
```
┌──────┬──────┬──────┬────────┬──────┬──────────┬──────┐
│Bonus │Main  │Edge  │Stagger │Bias  │Affliction│Injury│   anchored at the left edge;
│  ●2  │ ●4   │      │opposit-│      │          │      │   grows to the right
│      │ ●−2  │      │ion only│      │          │      │
└──────┴──────┴──────┴────────┴──────┴──────────┴──────┘
```

- A pile shows as one stacked disc with the value it acts as; open, it lists its members by name.
- Refs: crc-PoolView.md, crc-Drag.md
