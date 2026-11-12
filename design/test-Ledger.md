# Test Design: Ledger
**Source:** crc-Ledger.md

## Test: the Ledger's words
**Purpose:** R291: entries dated "Nov 12, 14:03:22"; Checkpoint offers "Round N, hh:mm:ss", blank is
"Checkpoint", cancel makes none; R133, R291: New game is named for when it was made
**Input:** 12 Nov 2026 14:03:22 local; Round 3; answers of spaces, " Before the duel ", cancel
**Expected:** `Nov 12, 14:03:22`, `Round 3, 14:03:22`, `Checkpoint`, `Before the duel`, none,
`New game Nov 12, 14:03:22`
**Refs:** crc-Ledger.md
**Code:** `src/ui/ledger.test.ts`
**Alarm:** 1
**Fire alarm:** Let a blank answer make a blank checkpoint: `named('  ')` is empty
**Inject:** src/ui/ledger.ts:named
**Pulled:** 2026-11-13 — rang: `named('  ')` gave an empty name
