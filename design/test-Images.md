# Test Design: Images
**Source:** crc-ImageExchange.md

## Test: images by hash
**Purpose:** images go peer to peer by hash, and a page that kept one answers the next
**Input:** the GM's page and Dana's over a fake room, each with its own BlobStore. The GM adds an
image and Dana wants it; Dana adds one and the GM wants it; the GM's page gone, Ann joins and wants
both; an image only the GM's page has, wanted while it's gone, then the GM's page back
**Expected:** each page gets the image and keeps it; Ann gets both from Dana's page; the last is
missing with "Nobody at the table has sent this image yet…", and 10 s after the GM's page is back
it is there and no longer missing
**Refs:** crc-ImageExchange.md, seq-images.md
**Code:** `src/net/images.test.ts`
**Alarm:** 1
**Fire alarm:** Count an answer as had without keeping it (skip BlobStore.accept): Dana's page never has the GM's image, so can't answer Ann
**Inject:** src/net/images.ts:ImageExchange
**Pulled:** 2026-11-12 — rang: Dana's page never kept the GM's image
