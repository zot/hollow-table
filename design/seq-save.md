# Sequence: a change is saved and sent

```
Person/peer        View/Net            Game                    GameStore            Db           Net (GM's page)
    |                  |                 |                          |                 |                 |
1   |--drop chip------>|                 |                          |                 |                 |
1.1 |                  |--change(fn)---->|                          |                 |                 |
1.2 |                  |                 |--check, apply, mark dirty|                 |                 |
1.3 |                  |<--changed rids--|---changed rids---------->|-----------------|---------------->|
1.4 |                  |--re-render rids |                          |                 |                 |
1.5 |                  |                 |  its pending rids, after a 400 ms pause    |                 |
1.5.1                  |                 |                          |--tx: put/del--->|                 |
1.6 |                  |                 |  the network's own pending rids                              |
1.6.1                  |                 |                          |                 |   redact, seal, send
```

- At step 1.3, listeners hear one event per `change`, so a burial (delete plus Boot Hill) is never half-seen.
- At step 1.5.1, only records that differ from what's stored are written.
- Steps 1.5 and 1.6: the store and the network each keep their own pending rids from what they heard at 1.3; neither waits on the other.
