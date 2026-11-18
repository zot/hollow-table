# Test Design: Records
**Source:** crc-Records.md

## Test: check takes the scene and refuses the malformed
**Purpose:** every record of the playtest scene passes `check`, and a buried Info card whole or as a player gets it (R403, R406); anything off is refused whole
**Input:** each scene record under its key; then one fault at a time: an unknown field, a missing
field, a wrong type, an oid not matching its key, an oversized string, a die showing 7, an unknown
kind, an unknown singleton, an array or a class instance where a record belongs, a negative spent
Level in a Damage slot, a back with a column that isn't Damage, a negative absorb, an Influence of an unknown Damage
kind, a sticky whose `big` isn't a boolean, an Influence whose `mot` isn't true; and an Influence of the Injury kind, a sticky with `big`
false (R248), and Devreux's Motivation card with `mot` (R260); a back with a Conviction and a Burden
waiting for its name, and a receipt waiting on a `lasting` row (R340, R341); faulty: a Condition in
`lasting` (`injury`), and a Conviction with negative points
**Expected:** the scene (its big sticky included), the Injury Influence and the sticky pass; every
faulty record is refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 1
**Fire alarm:** Let fields accept unknown fields (drop the second `every`): the record carrying `script` passes
**Inject:** src/model/records.ts:fields
**Pulled:** 2026-11-12 — rang: a faulty record passed check (`records.test.ts:35`, true instead of false)

## Test: check refuses a Condition in `lasting`
**Purpose:** R341: only Biases and Afflictions hold a Conviction or Burden; the physical overflow stays a Note
**Input:** Sam with `lasting.injury` `{name: 'x', points: 2, spent: 0}`
**Expected:** refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 2
**Fire alarm:** let `lasting` take every Damage column (`DAMAGE` for `LASTING` in its shape); red: the back with an `injury` Conviction passes
**Inject:** src/model/records.ts:lasting
@alarm-hash: c4be4d9e9a96710f
**Pulled:** 2026-11-15 — rang: "check takes the scene and refuses the malformed" failed, the `injury` Conviction passed; restored clean

## Test: the world's record
**Purpose:** R347: `world` is a singleton of a set flag and a whole number; anything else is refused whole
**Input:** `{set: true, total: 4}`, `{set: false, total: 0}`; a string flag, a fraction, a missing field, an extra field
**Expected:** the first two pass; the rest are refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 3
**Fire alarm:** leave `world` out of the singletons; red: the good records are refused
**Inject:** src/model/records.ts:SINGLETONS
@alarm-hash: 08fb61028cb0a870
**Pulled:** 2026-11-18 — re-pulled after the Opinion shape joined PIECES; rang: the good records were refused; restored clean *Earlier —* 2026-11-18 — re-pulled after the Connections shape joined PIECES; rang: the good records were refused; restored clean *Earlier —* 2026-11-15 — rang: "the world's record" failed, the good records refused; restored clean
## Test: a card an action suffers
**Purpose:** R362: an Influence may carry `once: true`, and nothing else in that field
**Input:** Beauford's Tricky card with `once: true`, and with `once: false`
**Expected:** the first passes, the second is refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 4
**Fire alarm:** leave `once` out of the Influence's fields; red: the `once` card is refused
**Inject:** src/model/records.ts:PIECES
@alarm-hash: 2a56c86c0a6fb185
**Pulled:** 2026-11-18 — re-pulled after the Opinion shape joined PIECES; rang: the `once` card was refused; restored clean *Earlier —* 2026-11-18 — re-pulled after the Connections shape joined PIECES; rang: the `once` card was refused; restored clean *Earlier —* 2026-11-16 — rang: "a card an action suffers" failed, the `once` card was refused; restored clean
## Test: a card's revealed entries and Info cards
**Purpose:** R391: a character's `shown` is a list of revealed entries' keys, absent when none; R400: its `info` a list of texts
**Input:** Devreux with `shown` as a list of keys; as a list of a number; as a bare string; with `info` as texts; as a list of lists
**Expected:** taken; refused; refused; taken; refused
**Refs:** crc-Records.md
**Code:** `src/model/records.test.ts`
**Alarm:** 5
**Fire alarm:** take any list as `shown`; red: a list of line numbers is taken
**Inject:** src/model/records.ts:PIECES
@alarm-hash: 2a56c86c0a6fb185
**Pulled:** 2026-11-18 — re-pulled after the Opinion shape joined PIECES; rang: a list of line numbers was taken; restored clean *Earlier —* 2026-11-18 — re-pulled after the Connections shape joined PIECES; rang: a list of line numbers was taken; restored clean *Earlier —* 2026-11-18 — rang: "a line is its text, not its number" failed, a list of numbers taken; restored clean
