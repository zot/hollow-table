# Test Design: BlobStore
**Source:** crc-BlobStore.md

## Test: images by content
**Purpose:** bytes are named by their SHA-256; others' bytes are kept only if they match
**Input:** MemoryDb; add a small image; get it back; accept the same bytes under the right hash
and under a wrong one; take a URL twice, release it twice
**Expected:** add gives `{blob: <sha256 hex>, w, h}` from measure; get returns the same bytes;
accept keeps the right one and refuses the wrong; the URL is revoked only at the second release
**Refs:** crc-BlobStore.md
**Code:** `src/store/blobs.test.ts`
**Alarm:** 1
**Fire alarm:** Keep another page's bytes without hashing them: the wrong hash is accepted
**Inject:** src/store/blobs.ts:accept
**Pulled:** 2026-11-19 — re-pulled after R449 (accept changed): rang, bytes under the wrong hash were accepted; restored clean *Earlier —* 2026-11-12 — rang: bytes under the wrong hash were accepted
## Test: images kept as bytes, where a Blob cannot be stored
**Purpose:** R449: an image is stored as its type and bytes, so a database that refuses Blobs (WebKit's private IndexedDB) keeps it; one stored as a Blob before still loads
**Input:** a MemoryDb whose puts throw WebKit's error on a Blob; add a PNG; get it; accept a JPEG from another page; a GIF put in as a Blob directly, then got
**Expected:** the add gives its hash and size; the PNG comes back with its type and bytes; the JPEG is kept; the GIF loads with its type and bytes
**Refs:** crc-BlobStore.md
**Code:** `src/store/blobs.test.ts`
**Alarm:** 2
**Fire alarm:** store the file whole, as before R449; red: the add throws WebKit's error
**Inject:** src/store/blobs.ts:#keep
**Pulled:** 2026-11-19 — rang: the add threw WebKit's error (Error preparing Blob/File data to be stored in object store); restored clean
