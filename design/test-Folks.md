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
**Pulled:** 2026-11-19 — re-pulled after R469 (tags gained said): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after R445 (tags changed): rang, Mo's tags read Mo, Boss; restored clean *Earlier —* 2026-11-13 — rang: Mo's tags read Mo before Boss
## Test: quiet and offline
**Purpose:** R293: a page unheard lately is dimmed and unlit; R163: this page offline is a red
"offline" tag with why; the GM's page with no table is plain
**Input:** a stale Sam on the GM's page; Sam's own page offline; the GM's page not live, no why
**Expected:** Sam stale and not live; Sam's tag warns offline; the GM's tag warns nothing
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`

## Test: someone holding another browser's name
**Purpose:** R168, R293, R445: only on the GM's page is a player whose name another browser holds red (and clickable)
**Input:** Sam held by `b-real`; Sam from `b-other` and Ann (unheld) on the GM's page; Sam from
`b-real`; Sam from `b-other` on Ann's page
**Expected:** only the first Sam warns impostor; the holder doesn't; a player's page makes no one red
**Refs:** crc-Folks.md, crc-Claims.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 2
**Fire alarm:** Make impostors red on every page, not just the GM's: Ann's page makes Sam red
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-19 — re-pulled after R469 (tags gained said): rang; restored clean *Earlier —* 2026-11-19 — re-aimed after R445 (the bar is on every page now, the red still the GM's): rang, Ann's page made the other Sam red; restored clean *Earlier —* 2026-11-13 — rang: Ann's page marked Sam an impostor
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
**Pulled:** 2026-11-23 — re-pulled after R476 (arrivalName takes held names): rang, `arrivalName('GM')` gave `GM`; restored clean *Earlier —* 2026-11-13 — rang: `arrivalName('GM')` gave `GM`
## Test: an arrival picks a held name in any case
**Purpose:** R476: a name this browser holds, typed in any case, is that name as held; any other is a new name
**Input:** arrivalName of " fred " with Fred held, of "Sam" with Fred held, of "GM" with Fred held
**Expected:** `Fred`, `Sam`, ask again
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 7
**Fire alarm:** compare held names with case; red: " fred " gives `fred`, a second name beside Fred
**Inject:** src/ui/folks.ts:arrivalName
**Pulled:** 2026-11-23 — rang: compared with case, " fred " gave `fred` beside Fred; restored clean

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
**Pulled:** 2026-11-19 — re-pulled after R469 (tags gained said): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after R445 (tags changed): rang, Ann's page told why warned nothing; restored clean *Earlier —* 2026-11-13 — rang: Ann's page told why warned nothing
## Test: every page bars someone holding another browser's name
**Purpose:** R445: the tag of someone using a name another browser holds is barred on every page, the holder's never
**Input:** Sam held by `b-real`; Sam from `b-other` on Ann's page, the GM's, and the real Sam's; Sam from `b-real` on Ann's page; Sam from `b-other` on Ann's page before any claims arrived
**Expected:** the other Sam barred on all three pages; the holder not barred; nothing barred without claims
**Refs:** crc-Folks.md, crc-Claims.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 5
**Fire alarm:** bar impostors on the GM's page only (as before R445); red: Ann's page doesn't bar the other Sam
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-19 — re-pulled after R469 (tags gained said): rang; restored clean *Earlier —* 2026-11-19 — rang: Ann's page didn't bar the other Sam; restored clean
## Test: a refused rename is said on your own tag
**Purpose:** R469: a refusal is said on the page's own tag, after offline and "not yours"
**Input:** Dana's own tag with a `said`; with `notYours` and `said`
**Expected:** her name, warned `said`; then `notyours`
**Refs:** crc-Folks.md
**Code:** `src/ui/folks.test.ts`
**Alarm:** 6
**Fire alarm:** ignore `said`; red: the tag warns nothing
**Inject:** src/ui/folks.ts:tags
**Pulled:** 2026-11-19 — rang: the tag warned nothing; restored clean
