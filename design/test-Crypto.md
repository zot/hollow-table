# Test Design: Identity, Seal and Envelope
**Source:** crc-Identity.md

## Test: a browser's id is Trystero's for its key
**Purpose:** R164, R470: the id this browser gives Trystero is the one Trystero derives from the key, so a brought identity is accepted, and it signs with the kept key
**Input:** an extractable key pair kept in the `identity` store; Trystero's `importUserIdentity` of the same key
**Expected:** the id has Identity's ID shape and equals Trystero's user id; the same store gives the same id, another browser another; `trystero()` carries that id and public key, and its signature verifies with the kept key
**Refs:** crc-Identity.md, seq-join.md
**Code:** `src/net/identity.test.ts`
**Alarm:** 1
**Fire alarm:** derive the id under another domain tag (`trystero:uid:v2:`); red: the id is not Trystero's
**Inject:** src/net/identity.ts:userIdOf
**Pulled:** 2026-11-22 — rang: under `trystero:uid:v2:` the id was not Trystero's user id; restored clean

## Test: a box opens only for what it was made for
**Purpose:** the additional data binds what, from and to
**Input:** a box sealed `recs:gm>dana`; opened as `recs:gm>dana`, `recs:gm>ann`, `edit:gm>dana`
**Expected:** the value; nothing; nothing
**Refs:** crc-Seal.md
**Code:** `src/net/seal.test.ts`
**Alarm:** 2
**Fire alarm:** Seal with no additional data: the box opens as `recs:gm>ann` and as `edit:gm>dana`
**Inject:** src/net/seal.ts:ad
@alarm-hash: 7729fd9fffb403c8
**Pulled:** 2026-11-12 — rang: the box opened as `recs:gm>ann`

## Test: hostile envelopes are dropped
**Purpose:** nothing a peer sends is parsed as markup or accepted out of range
**Input:** a roll with a die showing 7; rolls of 40 and 41 dice; a roll whose character name is `<img src=x onerror=alert(1)>`;
a move with 9 items; moves aimed at a slot with a strip and a chip, at a drawer with and without a
gap's place (one a drop), at a slot named `pocket`, with an unknown `gap`, and at a gap of −1; a record failing check, and one whose oid isn't its rid; a record whose text
holds `<script>` and an attributed tag; things that are no message, and an envelope of another
version
**Expected:** the 7 drops the roll, and so do 41 dice (40 pass); the name is kept as text; the 9-item move, the three bad aims and the bad records
are dropped (R299); the text keeps its tags as plain text; no message is no envelope. That no element is
made from the name is the views' (test-Table); big batches travel whole, chunked by Trystero
(crc-Envelope.md)
**Refs:** crc-Envelope.md, crc-MarkedText.md
**Code:** `src/net/envelope.test.ts`
**Alarm:** 3
**Fire alarm:** Skip `Records.check` on a batch's records: the batch with `script` on a sticky passes
**Inject:** src/net/envelope.ts:put
@alarm-hash: 5ced6dbc0972dece
**Pulled:** 2026-11-12 — rang: the batch carrying `script` on a sticky passed

## Test: an intent says what it points at by name, and nothing else
**Purpose:** R326: an intent's `against` is one of `{def: mental|psych}`, `{act}`, `{fld}`, `{skl}` by name; anything else drops the intent whole
**Input:** intents with no `against`, the four shapes, and `{def: physical}`, `{act: 4}`, an extra `base`, an unknown key, a string, null
**Expected:** the first five pass; the rest are dropped
**Refs:** crc-Envelope.md
**Code:** src/net/envelope.test.ts
**Alarm:** 4
**Fire alarm:** let `against` be anything (`v => true || …`); red: `{"def":"physical"}` passes
**Inject:** src/net/envelope.ts:against
**Pulled:** 2026-11-18 — re-pulled after the intent's shape took `reaction`; rang: the bad `against` passed; restored clean *Earlier —* 2026-11-14 — 2026-11-14 — rang: "an intent says what it points at by name" failed at {"def":"physical"}; restored clean
## Test: an intent may aim at the world
**Purpose:** R376: `intent.vs` is an oid, `world`, or null, and nothing else
**Input:** intents with `vs` an oid, `world`, null; `World`, `the world`, `worlds`, 4, the empty string
**Expected:** the first three pass; the rest drop the intent
**Refs:** crc-Envelope.md
**Code:** `src/net/envelope.test.ts`
**Alarm:** 5
**Fire alarm:** let `vs` be any string; red: `World` and `worlds` pass
**Inject:** src/net/envelope.ts:opponent
@alarm-hash: ce07a21a02ba1cec
**Pulled:** 2026-11-15 — rang: "an intent may aim at the world" failed, any string passed; restored clean
