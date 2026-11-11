# Sequence: a drag on one page shows on the others

```
Dragging page: Moves         Wire                 Other page: Moves (actor)              Game
    |                          |                         |                                  |
1   |--every 100 ms in hand: {s: Stamps.next(), items}-->|                                  |
1.1 |                          |------------------------>|--append to filling               |
1.2 |                          |                         |--no actor running? start one     |
1.3 |                          |                         |--pass: swap; newest arrival first|
1.3.1                          |                         |   first to reach a piece places it
1.3.2                          |                         |   an older arrival only if same page, higher s
1.4 |                          |                         |--change(places)----------------->|
1.5 |                          |                         |--more filled? next frame or 100 ms
2   |--drop: a move with its own number, then the change (seq-edit.md / seq-sync.md)        |
```

- At step 1.3, a piece in someone's hand on the receiving page waits until they let go.
