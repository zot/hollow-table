# ImageExchange
**Requirements:** R26, R194, R195

Images peer to peer: bytes stay in each page's BlobStore; a page missing one asks the table by hash.

## Knows
- missing: hashes shown on the table but not in the BlobStore.
- RETRY_MS: 10 s.

## Does
- want(hash): asks the table unless this page has it; the first answer whose bytes hash right is
  kept (BlobStore.accept), so this page can answer the next asker. True once it has it.
- answer: this page answers requests with what its BlobStore has.
- watch(game): every image the game shows is wanted as it arrives; the GM's page and players' pages
  both watch (R26).
- changed(fn): told when an image arrives or is found missing, so the page draws it again: shown, or
  striped with why (R195).
- start() / stop(): every RETRY_MS, asks again for what is still missing; the image shows striped and
  marked missing with why until then.

## Collaborators
- Wire, BlobStore

## Sequences
- seq-images.md
