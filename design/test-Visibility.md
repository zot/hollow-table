# Test Design: Visibility
**Source:** crc-Visibility.md

## Test: no secret survives redaction
**Purpose:** a redacted record holds none of its secret words
**Input:** the playtest scene plus a card tapped from Devreux's Saloon Gossip, and Devreux holding a
Sig Bias `Mistrusts the law` with a Level spent and Bias absorb 2; viewers nobody, Dana (owning Sam), the GM; secret
words taken from each character's sheet (front, Damage slots, notes), Influence names and tap ledgers;
Devreux buried with its cards
**Expected:** for each viewer, every record they can't read contains none of its secret words, and
a hidden back's Damage slots are unnamed, unspent and unchecked, its absorb 0;
the GM's view is unchanged
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 1
**Fire alarm:** Keep the tap ledger on a redacted card (drop the `tap` removal): nobody sees `Saloon` (Saloon Gossip)
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-12 — rang: nobody saw `Saloon` on the redacted card's tap ledger
## Test: what stays public
**Purpose:** names, places, drawer counts and chip values in pools survive
**Input:** Devreux's Influence in Sam's Stagger, viewed by Dana
**Expected:** points shown, name gone; Devreux's name and place shown
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 2
**Fire alarm:** Blank points in pool slots too (drop the `inSlot` exception): Devreux's card in Sam's Stagger shows 0 instead of 4
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-12 — rang: Devreux's card in Sam's Stagger showed 0 instead of 4
