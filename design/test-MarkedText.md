# Test Design: MarkedText
**Source:** crc-MarkedText.md

## Test: round trip over real text
**Purpose:** parse-then-serialize reproduces the source byte for byte
**Input:** every card face of the playtest scene, plus text with unknown tags, attributes, unclosed
tags, a bare `<`, `&`, empty lines and trailing newlines
**Expected:** `serialize(parse(s)) === s` for each
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`
**Alarm:** 1
**Fire alarm:** Treat an unclosed known tag as a mark running to the end of the line (drop the `end < 0` skip): `<res>Money +Maj` serializes with a closing tag and the round trip fails on it
**Inject:** src/text/marks.ts:parseLine
**Pulled:** 2026-11-12 — rang: `<res>Money +Maj` serialized as `<res>Money +Maj</res>`
## Test: the closed set
**Purpose:** only the five bare tags are marks; Damage tags are text (R209)
**Input:** `<act>A: 1, +1</act>`, `<act class="x">…</act>`, `<b>bold</b>`, `<script>x</script>`,
`<bias>x</bias>`, `<res>` unclosed
**Expected:** one mark; everything else is text runs with its source kept
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`
**Alarm:** 2
**Fire alarm:** Let a mark's opening tag carry attributes (`<(act|…)[^>]*>`): `<act class="x">` becomes a second mark and the marks list has two
**Inject:** src/text/marks.ts:TAG
@alarm-hash: 48ebfb8060369026
**Pulled:** 2026-11-12 — rang: `<act class="x">` became a mark and the round trip lost the attribute
## Test: edits touch only their mark
**Purpose:** setMark, mark and unmark change nothing outside their target
**Input:** a Resources line with two `<res>` marks; spend the second; mark a plain run; unmark
**Expected:** each result differs from the source only inside the target
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`
**Alarm:** 3
**Fire alarm:** In unmark, stop joining the freed text to its neighbours: the first run stays `Res: ` instead of `Res: Money +Maj, `
**Inject:** src/text/marks.ts:unmark
**Pulled:** 2026-11-12 — rang: the first run stayed `Res: ` instead of `Res: Money +Maj, `

## Test: a label is an action or Defend up to its colon
**Purpose:** R246: the bold label is read from the mark, through its first colon, only for `act` and `def`
**Input:** `Infer: 4, +2` and `Attack: 4 (Suasion: Charm), +1` as `act`, `Defend: 6 / 5` as `def`, an
`act` with no colon, `Money: +Maj` as `res`, `Resources:` as `head`
**Expected:** 6, 7, 7, 0, 0, 0
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`
**Alarm:** 4
**Fire alarm:** In labelEnd, take the last colon instead of the first: the Attack label runs to `Suasion:`
**Inject:** src/text/marks.ts:labelEnd
**Pulled:** 2026-11-12 — rang: the Attack label ran past `Suasion:` (labelEnd gave 21, not 7)
