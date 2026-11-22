# Sequence: a player joins

```
Player page                 Wire (player)          Relays          Wire (GM)              GM page
    |                            |                    |                 |                      |
1   |--join(room from invite)--->|--announce--------->|<--announce------|                      |
1.1 |                            |<==== introduced; WebRTC data channel opens ====>|           |
1.2 |                            |<==== Trystero's handshake: both browsers' keys proved ====>|
1.3 |                            |--hi (seal key, tab)----------------->|                      |
1.4 |                            |<-hi (seal key, tab)------------------|                      |
1.5 |                            |  (a bad proof at 1.2 refuses the peer; Trystero reports it) |
1.6 |                            |--check hi; a malformed one refuses   |--check hi            |
1.7 |<--peer in: browser id, seal key                   |               |--peer in------------>|
1.8 |                            |<------------hello-------------------|                      |
1.9 |--here (name)-------------->|----------------------------------->|--Claims.whoIs------->|
1.10                             |                    |                 |   holder, or nobody: |
1.10.1                           |<-----------claim (not yours), to this tab only--------------|
1.10.2                           |<-----------claims (who holds each name), to everyone, when they changed
1.11 --sync (until the table arrives)------------------------------------------------------->|
1.12 <----------------catch-up: the whole table, to this tab only (seq-sync.md)---------------|
1.12.1 <--------------claims (who holds each name), to this tab only--------------------------|
```

- At step 1.2, Trystero signs a transcript binding the room, both peer ids, both nonces, both DTLS
  fingerprints and both browsers' user ids, with each side's connection key and browser key (R470).
- At step 1.6, a page whose proof failed, or whose `hi` is malformed, never joins; every later
  message's sender is the proven browser, speaking for the tab its `hi` named (R471).
- At step 1.11, the player's page sends none of its own changes until step 1.12 has arrived.
- At step 1.10.1, the player's page takes a `claim` only from the GM's browser (R447).
- At steps 1.10.2 and 1.12.1, the player's page takes `claims` only from the GM's browser, and bars the tags of pages using a name another browser holds (R445, R446).
