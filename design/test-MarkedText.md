# Test Design: MarkedText
**Source:** crc-MarkedText.md

## Test: round trip over real text
**Purpose:** parse-then-serialize reproduces the source byte for byte
**Input:** every card face of the playtest scene, plus text with unknown tags, attributes, unclosed
tags, a bare `<`, `&`, empty lines and trailing newlines
**Expected:** `serialize(parse(s)) === s` for each
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`

## Test: the closed set
**Purpose:** only the eight bare tags are marks
**Input:** `<act>A: 1, +1</act>`, `<act class="x">…</act>`, `<b>bold</b>`, `<script>x</script>`, `<res>`
unclosed
**Expected:** one mark; everything else is text runs with its source kept
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`

## Test: edits touch only their mark
**Purpose:** setMark, mark and unmark change nothing outside their target
**Input:** a Resources line with two `<res>` marks; spend the second; mark a plain run; unmark
**Expected:** each result differs from the source only inside the target
**Refs:** crc-MarkedText.md
**Code:** `src/text/marks.test.ts`
