# Identity
**Requirements:** R164, R470

This browser's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
non-extractable. The browser id survives reloads, so names and the invite's `gm=` hold across them.
Trystero proves it (R470): the key is brought to Trystero, which signs its handshake with it.

## Knows
- Db store `identity`, in the browser's database beside the games but belonging to none of them.
- id: the user id Trystero derives from the public key, 22 base62 characters of a SHA-256 of
  `trystero:uid:v1:` and the key's coordinates (Trystero checks that the two agree, so a drift in
  Trystero's derivation is refused at the join rather than passing unnoticed).
- ID: the shape of a browser id; an id of any other shape is from before Trystero proved them (R472,
  R473).

## Does
- load(db): the key pair, made on first use; with no database, made for this page load only.
- trystero(): the identity Trystero is given: the id, the public key, and signing with the private
  half, which never leaves the browser.

## Collaborators
- Db

## Sequences
- seq-join.md
