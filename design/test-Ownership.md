# Test Design: Ownership
**Source:** crc-Ownership.md

## Test: the die
**Purpose:** click and shift-click for each viewer and owner
**Input:** the mockup's `owner.cjs` sequence
**Expected:** owners as in `owner.cjs`
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`

## Test: the GM's check
**Purpose:** mayChange refuses handing a character to someone else and touching another's
**Input:** Dana changes Sam (hers), Beauford (Ann's), an open pregen, and sets Sam's owner to Ann
**Expected:** yes, no, yes, no
**Refs:** crc-Ownership.md
**Code:** `src/rules/ownership.test.ts`
