# Test Design: Identity, Seal and Envelope
**Source:** crc-Identity.md

## Test: the handshake proof
**Purpose:** a proof binds the nonce, both peer ids and the keys
**Input:** two identities; a good proof; the same proof with another nonce, swapped peer ids, or a
different sealing key
**Expected:** the good one verifies to the right browser id; each altered one fails
**Refs:** crc-Identity.md, seq-join.md
**Code:** `src/net/identity.test.ts`

## Test: a box opens only for what it was made for
**Purpose:** the additional data binds what, from and to
**Input:** a box sealed `recs:gm>dana`; opened as `recs:gm>dana`, `recs:gm>ann`, `edit:gm>dana`
**Expected:** the value; nothing; nothing
**Refs:** crc-Seal.md
**Code:** `src/net/seal.test.ts`

## Test: hostile envelopes are dropped
**Purpose:** the mockup's `tablerolls.cjs` and `clean.cjs` cases, as records
**Input:** a roll with a 7; a name holding markup; a move with 9 items; a record failing check; a
batch part arriving 31 s after its first
**Expected:** each dropped whole; markup kept as text where it is text
**Refs:** crc-Envelope.md
**Code:** `src/net/envelope.test.ts`
