# Wire
**Requirements:** R156, R160, R162, R165

The only code that knows Trystero. Joins a room over the pinned Nostr relays, lets a peer in only
after the identity handshake, and sends envelopes to everyone or to one peer.

## Knows
- RELAYS: the pinned relay list, the same on every page; a page opened with the test hook may be
  given the specs' local relay instead (R297).
- APP: the Trystero app id, `hollow-table`; Trystero `@trystero-p2p/nostr` 0.26.0, pinned.
- peers: Trystero peer id → `{tab, browser, sealKey}` once the handshake has proved them; a tab's
  peer, for sending to one tab. A message is taken only from a proven peer speaking for its own tab.
- MAX_BYTES (64 MB): Trystero chunks a big message and reassembles it up to this; BLOB_MAX (25 MB)
  for an image.

## Does
- join(room): connects; reports relays reachable and peers connected.
- handshake (Trystero's `onPeerHandshake`): exchanges identity keys, sealing keys, nonces and tab
  ids; each side signs the other's nonce with both peer ids and its own keys (Identity); a bad
  signature is refused and the peer never joins.
- send(kind, body, to?): an envelope to every peer, or to one tab; resolves with how many peers it
  reached.
- on(kind, fn): delivers checked envelopes (Envelope) with the sender's proven tab, browser id and
  sealing key. Nothing echoes back.
- request(hash) / answer(fn): the image request action (ImageExchange); the first answer wins.
- onJoin(fn) / onLeave(fn): a peer passed the handshake; a closed connection counts as leaving.
- reachable(): relays open and peers connected, for Presence's liveness.

- Link (`src/net/link.ts`): the face it shows the rest of the page, `{tab, send(kind, body, to?),
  on(kind, fn)}`; Authority, Copy, Presence and Rolls see only this. FakeRoom
  (`src/net/fakeroom.ts`) is the tests' Link: a room in memory that checks every message as Wire
  will and can drop, delay or cut off a page.

## Collaborators
- Identity: proves this browser and checks the other's proof.
- Seal: this page's sealing key, vouched for in the handshake.
- Envelope: checks every message before anyone sees it.

## Sequences
- seq-join.md
