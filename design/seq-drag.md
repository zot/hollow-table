# Sequence: carrying a chip into a narrow pool

```
Person          Gesture           Drag                  PoolView (Sam)        Moves          Game
  |                |                |                         |                  |               |
1 |--press chip--->|                |                         |                  |               |
1.1                |--moved 5 px--->|                         |                  |               |
1.2                |                |--lift: shadow, hold------|----------------->|               |
1.3                |                |--carry: every 100 ms-----|---------------->send            |
1.4                |                |--near Sam's pool?------->|--widen (anchored left)          |
1.5                |                |--over Main slot          |                  |               |
1.6 |--release---->|--------------->|--drop: resolve target    |                  |               |
1.7                |                |--change: chip into Main, Pool.rollUp plan----------------->|
1.8                |                |                         |<-render: Main holds a chip-------|
1.9                |                |                         |--narrow the empty slots          |
```

- At step 1.4, the pool widens before the pointer reaches its slots, so the slot aimed at doesn't move.
