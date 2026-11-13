# Test Design: Folks
**Source:** crc-Folks.md

## Test: the order of the tags
**Purpose:** R293: the GM first, then you, then the rest alphabetically; the GM's own page first
**Input:** Mo's page with Zed, the GM Boss and amy; the GM's page with Zed and amy
**Expected:** Boss, Mo, amy, Zed; GM, amy, Zed
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 1
**Fire alarm:** Put you before the GM on a player's page: Mo's tags read Mo, Boss
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-13 — rang: Mo's tags read Mo before Boss

## Test: quiet and offline
**Purpose:** R293: a page unheard lately is dimmed and unlit; R163: this page offline is a red
"offline" tag with why; the GM's page with no table is plain
**Input:** a stale Sam on the GM's page; Sam's own page offline; the GM's page not live, no why
**Expected:** Sam stale and not live; Sam's tag warns offline; the GM's tag warns nothing
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`

## Test: someone holding another browser's name
**Purpose:** R168, R293: on the GM's page a player whose name another browser holds is red
**Input:** Sam held by `b-real`; Sam from `b-other` and Ann (unheld) on the GM's page; Sam from
`b-real`; Sam from `b-other` on Ann's page
**Expected:** only the first Sam warns impostor; the holder doesn't; a player's page marks no one
**Refs:** crc-Folks.md, crc-Claims.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 2
**Fire alarm:** Mark impostors on every page, not just the GM's: Ann's page marks Sam
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-13 — rang: Ann's page marked Sam an impostor

## Test: names
**Purpose:** R293: the GM's blank name is "GM", cancel keeps it, 32 characters at most; R294: an
arrival is asked again for "GM" or blank, cancel is "Player"
**Input:** gmName of spaces, of cancel, of 40 characters; arrivalName of cancel, "GM", a space,
" Sam "
**Expected:** `GM`, `Bill`, 32 characters; `Player`, ask again, ask again, `Sam`
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 3
**Fire alarm:** Let an arrival be called GM: `arrivalName('GM')` is `GM`
**Inject:** src/ui/folks.ts:arrivalName
**Pulled:** 2026-11-13 — rang: `arrivalName('GM')` gave `GM`

## Test: whom "You are" offers
**Purpose:** R153: the GM, the players present, the owners and the defaults, never open
**Input:** Sam present; owners GM, open, Ann, Sam
**Expected:** GM, Sam, Ann, Player 1, Player 2
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`

## Test: a page that is nobody
**Purpose:** R167, R296: a player's page the GM said is nobody shows "not yours"; offline says more
**Input:** Ann's page told why; Ann's page told why and offline; Ann's page told nothing
**Expected:** `notyours`; `offline`; no warning
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 4
**Fire alarm:** Ignore the GM's why: Ann's page told why warns nothing
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-13 — rang: Ann's page told why warned nothing
