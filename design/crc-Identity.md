# Identity
**Requirements:** R164, R165

This browser's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
non-extractable. The browser id survives reloads, so names and the invite's `gm=` hold across them.

## Knows
- Db store `identity`, in the browser's database beside the games but belonging to none of them.
- id: 20 characters from the SHA-256 of the public key.

## Does
- load(db): the key pair, made on first use; with no database, made for this page load only.
- prove(theirNonce, {from, to}, sealPub): a signature over their nonce, the two peer ids (signer's
  first) and this page's identity and sealing keys.
- verify(sig, ourNonce, {from, to}, idPub, sealPub): checks another page's proof; on success, its
  browser id, else null.

## Collaborators
- Db

## Sequences
- seq-join.md
