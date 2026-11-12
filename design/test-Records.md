# Test Design: Records
**Source:** crc-Records.md

## Test: check takes the scene and refuses the malformed
**Purpose:** every record of the playtest scene passes `check`; anything off is refused whole
**Input:** each scene record under its key; then one fault at a time: an unknown field, a missing
field, a wrong type, an oid not matching its key, an oversized string, a die showing 7, an unknown
kind, an unknown singleton, an array or a class instance where a record belongs, a negative spent
Level in a Damage slot, a back with a column that isn't Damage, a negative absorb, an Influence of an unknown Damage
kind, a sticky whose `big` isn't a boolean, an Influence whose `mot` isn't true; and an Influence of the Injury kind, a sticky with `big`
false (R248), and Devreux's Motivation card with `mot` (R260)
**Expected:** the scene (its big sticky included), the Injury Influence and the sticky pass; every
faulty record is refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 1
**Fire alarm:** Let fields accept unknown fields (drop the second `every`): the record carrying `script` passes
**Inject:** src/model/records.ts:fields
**Pulled:** 2026-11-12 — rang: a faulty record passed check (`records.test.ts:35`, true instead of false)
