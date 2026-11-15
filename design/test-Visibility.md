# Test Design: Visibility
**Source:** crc-Visibility.md

## Test: no secret survives redaction
**Purpose:** a redacted record holds none of its secret words
**Input:** the playtest scene plus a card tapped from Devreux's Saloon Gossip, and Devreux holding a
Sig Bias `Mistrusts the law` with a Level spent, a Conviction `Sheriffs lie` (R341), and Bias absorb 2; viewers nobody, Dana (owning Sam), the GM; secret
words taken from each character's sheet (front, Damage slots, Convictions and Burdens, notes), Influence names and tap ledgers;
Devreux buried with its cards
**Expected:** for each viewer, every record they can't read contains none of its secret words, and
a hidden back's Damage slots are unnamed, unspent and unchecked, its absorb 0, and it has no `lasting`;
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

## Test: a hidden back hides its Conviction
**Purpose:** R341: a back its viewer can't read says nothing of its Conviction or Burden, not even that it has one
**Input:** Devreux's Conviction `Sheriffs lie`, as nobody and Dana see it
**Expected:** no `lasting` on the redacted back, and no `Sheriffs` anywhere in it
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 3
**Fire alarm:** in blankBack, keep the back's `lasting` (spread `b` first); red: nobody sees `Sheriffs lie` fails
**Inject:** src/rules/visibility.ts:blankBack
@alarm-hash: 8f35cb09e2d6ee2b
**Pulled:** 2026-11-15 — rang: "no secret survives redaction" failed, a hidden back kept `Sheriffs lie`; restored clean

## Test: the world's number is the GM's alone
**Purpose:** R348: anyone but the GM gets `{set, total: 0}`; the GM's view differs, so it is sealed for the GM's tabs only
**Input:** the world `{set: true, total: 4}`, redacted for Dana, for nobody, and for the GM
**Expected:** `{set: true, total: 0}` twice; the GM's unchanged; differs for the GM, not for Dana
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 4
**Fire alarm:** drop the world's redaction; red: Dana's view keeps 4
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-15 — rang: "the world's number is the GM's alone" failed, Dana's view kept 4; restored clean
