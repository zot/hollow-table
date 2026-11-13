# Sequence: carrying a chip into a narrow pool

```
Person          Gesture           Drag (carry)          Hands / PoolView      Moves          Game
  |                |                |                         |                  |               |
1 |--press chip--->|                |                         |                  |               |
1.1                |--moved 5 px--->|                         |                  |               |
1.2                |                |--lift: shadow, hold------|----------------->|               |
1.3                |                |--each frame: place, aim->|--show(own)        |               |
1.3.1              |                |   the same items---------|---------------->drag (100 ms)   |
1.4                |                |--aim: Sam's strip------->|--reach: widen (anchored left)   |
1.5                |                |--over Main slot          |                  |               |
1.6 |--release---->|--------------->|--drop: the last aim------>|--drop(own)------>drop           |
1.7                |                |--change: chip into Main, Pool.rollUp plan----------------->|
1.8                |                |                         |<-render: Main holds a chip-------|
1.9                |                |                         |--narrow the empty slots          |
```

- At step 1.4, the pool widens before the pointer reaches its slots, so the slot aimed at doesn't move.
