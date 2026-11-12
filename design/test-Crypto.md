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
**Purpose:** nothing a peer sends is parsed as markup or accepted out of range
**Input:** a roll with a die showing 7; a roll whose character name is `<img src=x onerror=alert(1)>`;
a move with 9 items; a record failing check; a batch part arriving 31 s after its first; a record
whose text holds `<script>` and an attributed tag
**Expected:** the 7 drops the roll; the name is kept as text and no element is made; the 9-item
move, the bad record and the late part are dropped; the text keeps its tags as plain text
**Refs:** crc-Envelope.md, crc-MarkedText.md
**Code:** `src/net/envelope.test.ts`
