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
**Pulled:** 2026-11-12 — rang: bytes under the wrong hash were accepted
