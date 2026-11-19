# Test Design: Build
**Source:** crc-Build.md

## Test: which relays answer
**Purpose:** R452: `npm run relays` tells a relay that answers from one that refuses or stays silent, and lists the pinned ones first
**Input:** three fake sockets: one that opens and answers EOSE, one refused before opening, one that opens and never answers (a 50 ms wait); the report of all three with two of them pinned
**Expected:** the first answers; the second is refused, saying why; the third connected but didn't answer; the report lists the pinned answering one, then the pinned refused one, then the unpinned
**Refs:** crc-Build.md
**Code:** `tools/relays.test.ts`
**Alarm:** 1
**Fire alarm:** count a relay that only opens as answering (end on `onopen`); red: the silent relay answers
**Inject:** tools/relays.ts:probe
**Pulled:** 2026-11-19 — rang: the silent relay was reported as answering; restored clean
