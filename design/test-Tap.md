# Test Design: Tap
**Source:** crc-Tap.md

## Test: the ledger
**Purpose:** Levels move between sources and a card, and come back only to where they came from
**Input:** the mockup's `tap.cjs` Money and Ammo sequence
**Expected:** card and source Levels as in `tap.cjs`, including "3 shift-clicks: only Ammo's 2 come back"
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`

## Test: refusals and refunds
**Purpose:** a plain card can't be fed; a used card starts a new one; a killed tap refunds
**Input:** feed a plain card; feed a used card; kill an unused tap
**Expected:** refused; a new card beside it; source Levels restored
**Refs:** crc-Tap.md
**Code:** `src/rules/tap.test.ts`
