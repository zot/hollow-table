# Test Design: Authority
**Source:** crc-Authority.md

## Test: judge
**Purpose:** each refusal, and nothing else refused
**Input:** the playtest game; edits from Dana (holds "Dana", owns Sam): move Sam; move Beauford
(Ann's); rename Devreux's loose Influence (redacted to her); put back a sticky tombed after her
base; a Boot Hill change from a copy behind the latest; the same from an impostor "Dana"
**Expected:** taken; refused; refused; refused (deletion answered), though taken from a copy made
after the deletion; refused whole, though taken from a copy that saw Boot Hill's last change; all
refused
**Refs:** crc-Authority.md, seq-edit.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 1
**Fire alarm:** Skip the checks that the sender can see the piece as it is, before and after (drop both redaction tests): Dana's rename of Devreux's card is taken
**Inject:** src/net/authority.ts:judge
**Pulled:** 2026-11-12 — rang: Dana's rename of Devreux's card was taken

## Test: out seals what differs and nothing else
**Purpose:** each tab gets sealed only the pieces it sees differently; giving Sam to Dana sends his
sheet; taking him back sends the redacted one
**Input:** two player tabs; a change to Sam's sheet; Sam given to Dana; taken back
**Expected:** Dana's box holds Sam's sheet only while he's hers; Ann's never does; the public part
never holds a secret word
**Refs:** crc-Authority.md, crc-Visibility.md, seq-sync.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 2
**Fire alarm:** Seal each tab's view of every changed piece, whether it differs or not: Ann's box holds Sam
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-12 — rang: the GM's Sam was sealed to Dana (`authority.test.ts:73`), to Ann as well

## Test: claims
**Purpose:** the first browser to claim a name holds it, until the GM hands it over
**Input:** "Dana" from browser A twice, then from browser B; "GM" from A; Dana handed to B
**Expected:** A holds Dana; B is nobody; "GM" can't be claimed; after the hand-over B holds it and A
is nobody
**Refs:** crc-Claims.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 3
**Fire alarm:** Let a second browser claim a held name: browser B plays Dana before any hand-over
**Inject:** src/net/claims.ts:whoIs
**Pulled:** 2026-11-12 — rang: browser B played Dana before any hand-over
