# Sequence: a player's change

```
Player: Game          Copy                      Seal          GM: Authority                   GM: Game
    |                   |                          |                  |                             |
1   |--changed rids---->|                          |                  |                             |
1.1 |                   |--stamp each (Stamps.next), base = seen      |                             |
1.2 |                   |--pending[rid] = {s, base}|                  |                             |
1.3 |                   |--edit, sealed to GM----->|----------------->|                             |
1.4 |                   |                          |                  |--judge (pure)               |
1.4.1                   |                          |                  |   nobody? mayChange? redacted?
1.4.2                   |                          |                  |   tomb newer than base?     |
1.4.3                   |                          |                  |   stale Boot Hill? (whole)  |
1.5 |                   |                          |                  |--take allowed-------------->|
1.6 |                   |                          |                  |<-changed: out to everyone (seq-sync.md)
1.7 |                   |<--refused: GM's version under the player's number, as the answer-------|
1.8 |                   |--answer clears pending   |                  |                             |
2   |                   |  (no answer within 3 s)  |                  |                             |
2.1 |                   |--resend as it is now, same group and base   |                             |
2.2 |                   |--after 5 tries: ask for the whole table     |                             |
```

- At step 1.7, the answer arrives whether the change was taken, refused or changed nothing.
- In the second diagram's step 2.1, a stale change keeps its old base, so it can't take a fresh one down with it.
