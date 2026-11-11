# Sequence: a player joins

```
Player page                 Wire (player)          Relays          Wire (GM)              GM page
    |                            |                    |                 |                      |
1   |--join(room from invite)--->|--announce--------->|<--announce------|                      |
1.1 |                            |<==== introduced; WebRTC data channel opens ====>|           |
1.2 |                            |--identity key, seal key, nonce------>|                      |
1.3 |                            |<-identity key, seal key, nonce-------|                      |
1.4 |                            |--proof: sign(their nonce, both peer ids, my keys)---------->|
1.5 |                            |<-proof---------------|               |                      |
1.6 |                            |--verify; bad proof refuses the peer  |--verify              |
1.7 |<--peer in: browser id, seal key                   |               |--peer in------------>|
1.8 |                            |<------------hello-------------------|                      |
1.9 |--here (name)-------------->|----------------------------------->|--Claims.whoIs------->|
1.10                             |                    |                 |   holder, or nobody: |
1.10.1                           |<-----------claim (not yours), to this tab only--------------|
1.11 --sync (until the table arrives)------------------------------------------------------->|
1.12 <----------------catch-up: the whole table, to this tab only (seq-sync.md)---------------|
```

- At step 1.6, a page whose proof fails never joins; every later message's sender is the proven browser.
- At step 1.11, the player's page sends none of its own changes until step 1.12 has arrived.
