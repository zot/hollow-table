# Seal
**Requirements:** R184, R187

Sealed boxes between the GM's page and one player's page: an ECDH P-256 key pair per page load, a
shared AES-GCM key per pair, and additional data naming what the box is and who it's from and to.

## Knows
- This page's sealing key pair (new each load).
- Shared keys by the other page's sealing key.

## Does
- seal(theirKey, what, from, to, value): `{iv, data}`; the additional data is `what:from>to`.
- open(theirKey, what, from, to, box): the value, or nothing if the box was made for anything else.

## Collaborators
- none (WebCrypto)

## Sequences
- seq-sync.md
- seq-edit.md
