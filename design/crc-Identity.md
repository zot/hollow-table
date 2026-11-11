# Identity
**Requirements:** R164, R165

This browser's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
non-extractable. The browser id survives reloads, so names and the invite's `gm=` hold across them.

## Knows
- Db store `identity` (its own database, not a game's).
- id: 20 characters from the SHA-256 of the public key.

## Does
- load(): the key pair, made on first use.
- prove(theirNonce, peerIds, keys): a signature binding their nonce, both peer ids and this page's
  identity and sealing keys.
- verify(proof, ourNonce, peerIds, keys): checks another page's proof; on success, its browser id.

## Collaborators
- Db

## Sequences
- seq-join.md
