# Sequence: a batch goes out and is taken

```
GM page: Game        Authority                 Visibility        Seal            Player page: Copy        Game (player)
    |                    |                          |               |                    |                     |
1   |--flush (changed)-->|                          |               |                    |                     |
1.1 |                    |--gv += 1                 |               |                    |                     |
1.2 |                    |--view for nobody-------->|               |                    |                     |
1.3 |                    |--for each tab: its view->|               |                    |                     |
1.4 |                    |--differs from what it holds? seal it---->|                    |                     |
1.5 |                    |--deleted rids: fresh stamp (Stamps.next), tomb[rid] = gv      |                     |
1.6 |                    |--recs {g, puts, dels, sealed: {tab: box}}------------------>|                     |
1.7 |                    |                          |               |<--open my box------|                     |
1.8 |                    |                          |               |                    |--replace redacted   |
1.9 |                    |                          |               |                    |--fresh? not pending?|
1.9.1                    |                          |               |                    |   not in hand?      |
1.10                     |                          |               |                    |--change(apply)----->|
1.11                     |                          |               |                    |--g == seen+1: seen=g|
1.11.1                   |                          |               |                    |   gap: ask sync     |
```

- At step 1.5, a deletion takes a fresh number, so it is never older than moves sent while the piece was being dragged.
- At step 1.9, a piece whose stamp is lower than the highest applied from that page is skipped.
