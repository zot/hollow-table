# BlobStore
**Requirements:** R26, R130, R194, R449

Image bytes by content: the SHA-256 of the bytes is the image's name in the game, the key here, and
what the table asks for. Images are never stored in records.

## Knows
- Db store `blobs`: sha256 → `{type, bytes}`, the image's MIME type and an ArrayBuffer (R449: WebKit's
  private IndexedDB refuses a Blob); an older entry may be a Blob.

## Does
- add(file): hash it, store it, return `{blob, w, h}` for an Image record. Its size comes from a
  `measure` passed in (the page decodes the image; a test fakes it).
- get(hash): a Blob made from what is stored, either shape, or nothing.
- accept(hash, bytes): keep bytes from another page only if they hash to `hash`.
- url(hash) / release(hash): an object URL for display, counted, and revoked when no image shows it.

## Collaborators
- Db

## Sequences
- none
