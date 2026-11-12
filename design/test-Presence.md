# Test Design: Presence
**Source:** crc-Presence.md

## Test: who is at the table
**Purpose:** pages greet and answer, leave, and know when they can reach nobody
**Input:** the GM's page and Dana's over a fake room; the GM renames itself; Dana's connection
closes; the GM's page cut off for 15 s, then back
**Expected:** each knows the other's name and role, the `here` answers going only to the greeter;
Dana sees the new name; the GM's people empty when Dana goes; live at 14 s, offline at 15 s with
why, live again once reachable
**Refs:** crc-Presence.md, seq-join.md
**Code:** `src/net/presence.test.ts`
**Alarm:** 1
**Fire alarm:** Answer `here` to everyone instead of the greeter: the `here` answers go out with no `to`
**Inject:** src/net/presence.ts:Presence
**Pulled:** 2026-11-12 — rang: the `here` answers went out with no `to`

## Test: rooms and invites
**Purpose:** a room is a label and 128 random bits; the invite carries the room and the GM's browser
**Input:** a room for "The 11-08 playtest"; two fresh rooms; an invite from a URL with a query and a
hash; the plain page; a malformed invite
**Expected:** `the-11-08-playtest-` and 32 hex digits; the two differ; the invite is the base with
only `room` and `gm`, and reads back; the plain page and the malformed one are the GM's
**Refs:** crc-Presence.md
**Code:** `src/net/presence.test.ts`
**Alarm:** 2
**Fire alarm:** Keep the base's query in the invite: the link carries `test` and the hash
**Inject:** src/net/presence.ts:invite
**Pulled:** 2026-11-12 — rang: the invite kept the base query (`test`)

## Test: a page that goes quiet
**Purpose:** R293: a heartbeat every 10 s keeps a page fresh; unheard for 25 s it is stale, and
after 60 s it is gone as if it had left
**Input:** the GM's page and Dana's, both started, for 40 s; then Ann joins and never starts her
heartbeat, for 25 s, then to 60 s
**Expected:** Dana fresh and still there; Ann stale at 25 s; Ann gone (and reported gone) at 60 s
**Refs:** crc-Presence.md
**Code:** `src/net/presence.test.ts`
**Alarm:** 3
**Fire alarm:** Never let a quiet page go (drop the 60 s check): Ann is still there at 60 s
**Inject:** src/net/presence.ts:Presence
**Pulled:** 2026-11-13 — rang: Ann was still there at 60 s
