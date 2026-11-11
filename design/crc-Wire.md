# Wire
**Requirements:** R156, R160, R162, R165

The only code that knows Trystero. Joins a room over the pinned Nostr relays, lets a peer in only
after the identity handshake, and sends envelopes to everyone or to one peer.

## Knows
- RELAYS: the pinned relay list, the same on every page.
- APP: the Trystero app id.
- peers: Trystero peer id → `{browser, sealKey}` once the handshake has proved them.

## Does
- join(room): connects; reports relays reachable and peers connected.
- handshake (Trystero's `onPeerHandshake`): exchanges identity keys, sealing keys and nonces; each
  side signs the other's nonce with both peer ids and its own keys (Identity); a bad signature is
  refused and the peer never joins.
- send(envelope, to?): to every peer, or to one; resolves with how many peers it reached.
- on(kind, fn): delivers checked envelopes (Envelope) with the sender's proven browser id and
  sealing key. Nothing echoes back.
- request(hash) / answer(fn): the image request action (ImageExchange).
- onLeave(fn): a closed connection counts as leaving.

## Collaborators
- Identity: proves this browser and checks the other's proof.
- Seal: this page's sealing key, vouched for in the handshake.
- Envelope: checks every message before anyone sees it.

## Sequences
- seq-join.md
