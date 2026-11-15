# Test Design: Tray
**Source:** crc-Tray.md

## Test: what the GM types in the tray
**Purpose:** R347: a whole number sets the world, a blank clears it, anything else changes nothing; 0 is a number (the book's "against Opposition 0")
**Input:** `4`, ` 12 `, `0`, `−2`, the empty string; `four`, `2.5`, `1e3`, `4 + 2`, `10000`
**Expected:** set at 4, 12, 0, −2; blank; null for the rest
**Refs:** crc-Tray.md
**Code:** `src/ui/tray.test.ts`
**Alarm:** 1
**Fire alarm:** let worldFrom take any number Number() reads; red: `2.5` and `1e3` set the world
**Inject:** src/ui/tray.ts:worldFrom
**Pulled:** 2026-11-15 — rang: "what the GM types in the tray" failed, `2.5` set the world; restored clean
