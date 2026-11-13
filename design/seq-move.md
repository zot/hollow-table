# Sequence: a drag on one page shows on the others

```
Dragging page: Moves         Wire                 Other page: Moves (actor)              Hands
    |                          |                         |                                  |
1   |--every 100 ms in hand: {s, items with aim}-------->|                                  |
1.1 |                          |------------------------>|--append to filling               |
1.2 |                          |                         |--no actor running? start one     |
1.3 |                          |                         |--pass: swap; newest arrival first|
1.3.1                          |                         |   first to reach a piece places it
1.3.2                          |                         |   an older arrival only if same page, higher s
1.4 |                          |                         |--show(tab, winners): lift, aim-->|
1.5 |                          |                         |--more filled? next frame or 100 ms
2   |--drop: a move with its own number (drop: true), then the change (seq-edit.md / seq-sync.md)
2.1 |                          |                         |--drop(tab, winners): held there--->|
2.2 |                          |                         |   the change arrives (or 1 s): let go
```

- At step 1.3, a piece in someone's hand on the receiving page waits until they let go.
- At step 1.4, the GM's page shows only what Authority.mayMove allows (a nobody's moves aren't shown).
- Nothing saved changes until step 2's change: a drop the change doesn't follow goes back (2.2).
