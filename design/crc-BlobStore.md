# BlobStore
**Requirements:** R26, R130, R194

Image bytes by content: the SHA-256 of the bytes is the image's name in the game, the key here, and
what the table asks for. Images are never stored in records.

## Knows
- Db store `blobs`: sha256 → Blob.

## Does
- add(file): hash it, store it, return `{blob, w, h}` for an Image record.
- get(hash): the Blob, or nothing.
- accept(hash, bytes): keep bytes from another page only if they hash to `hash`.
- url(hash): an object URL for display, revoked when no image shows it.

## Collaborators
- Db

## Sequences
- none
