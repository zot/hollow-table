# BlobStore
**Requirements:** R26, R130, R194

Image bytes by content: the SHA-256 of the bytes is the image's name in the game, the key here, and
what the table asks for. Images are never stored in records.

## Knows
- Db store `blobs`: sha256 → Blob.

## Does
- add(file): hash it, store it, return `{blob, w, h}` for an Image record. Its size comes from a
  `measure` passed in (the page decodes the image; a test fakes it).
- get(hash): the Blob, or nothing.
- accept(hash, bytes): keep bytes from another page only if they hash to `hash`.
- url(hash) / release(hash): an object URL for display, counted, and revoked when no image shows it.

## Collaborators
- Db

## Sequences
- none
