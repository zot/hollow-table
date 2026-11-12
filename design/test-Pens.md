# Test Design: Pens
**Source:** crc-Pens.md

## Test: a pen marks a selection
**Purpose:** a selection inside one plain run is marked with the pen's mark, whichever way it was
dragged; a selection across lines changes nothing
**Input:** `Money +Maj and more`; select `Money +Maj` forwards and backwards with the Resource pen;
a selection from the first line into a second; one from just after a mark on one line to the same
place on the next
**Expected:** `<res>Money +Maj</res> and more` both ways; both two-line selections return the same
lines
**Refs:** crc-Pens.md, crc-MarkedText.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 1
**Fire alarm:** In apply, stop ordering the selection's ends: the backwards selection has start after end and is left unmarked
**Inject:** src/ui/pens.ts:apply
**Pulled:** 2026-11-12 — rang: the backwards selection left `Money +Maj and more` unmarked

## Test: any pen on marked text unmarks it
**Purpose:** R206's second half: the caret or a selection in a mark unmarks it, whatever the pen
**Input:** `Res: <res>Money +Maj</res>`; the caret inside the mark, with the Action pen; a
selection inside the mark, with the Resource pen; a bare caret just after the mark (where a pen
leaves it) and just before it
**Expected:** `Res: Money +Maj` each time
**Refs:** crc-Pens.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 2
**Fire alarm:** Unmark only when the pen is the mark's own: the Action pen leaves the `<res>` mark in place
**Inject:** src/ui/pens.ts:apply
**Pulled:** 2026-11-12 — rang: the Action pen left `Res: <res>Money +Maj</res>` marked

## Test: a bare caret marks its run
**Purpose:** one click marks the line the caret is on, trimmed of surrounding spaces; a selection
across runs changes nothing
**Input:** `  Infer: 4, +2  ` with the caret at offset 5 and the Action pen; a selection from the
plain run before a mark to the one after it
**Expected:** `  <act>Infer: 4, +2</act>  `; the spanning selection returns the same lines
**Refs:** crc-Pens.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 3
**Fire alarm:** Mark the bare caret's whole run without trimming: the spaces go inside the mark
**Inject:** src/ui/pens.ts:apply
**Pulled:** 2026-11-12 — rang: the spaces went inside the mark, `<act>  Infer: 4, +2  </act>`

## Test: the offered pen
**Purpose:** R207: a plain line fitting a grammar is offered its pen, reading the nearest heading
above it
**Input:** a text with `Infer: 4, +2`, `<head>Resources</head>`, `Money +Maj`, `<head>Notes</head>`,
`Ammo +Sig`, and a line already holding a mark
**Expected:** `act` for the action line, `res` for Money, null for Ammo (its heading is Notes), null
for the marked line and for a line that isn't there
**Refs:** crc-Pens.md, crc-MarkReader.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 4
**Fire alarm:** Read the first heading in the text instead of the nearest one above: Ammo, under Notes, is offered the Resource pen
**Inject:** src/ui/pens.ts:heading
**Pulled:** 2026-11-12 — rang: Ammo, under Notes, was offered `res`

## Test: the rest make room
**Purpose:** the offered pen beside its line never hides another pen: the rest keep their order and
step past it
**Input:** five pens a step of 25 apart, each offered in turn beside lines at -40, 0, 12, 37 and 140,
and two worked placements
**Expected:** `[25, 0, 50, 75, 100]` for Action at 25, `[30, 0, 55, 80, 105]` for Action at 30, and
no two pens closer than a step anywhere
**Refs:** crc-Pens.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 7
**Fire alarm:** In places, stop stepping past the offered pen: Resource stays at 25 under Action at 30
**Inject:** src/ui/pens.ts:places
**Pulled:** 2026-11-12 — rang: Resource stayed at 25 under Action, the 100 expected for Heading came out 25

## Test: locating a selection
**Purpose:** MarkedText.locate names the same line, run and offset that read gives the text, so a
pen acts where the selection is
**Input:** a hand-built node tree as render draws it: a line `Res: ` + a `res` span + `, more`, an
empty line (`div` holding a `br`), and a third line; positions in the text after the mark, inside
the mark, at the empty line's `(div, 0)`, in the third line, after the first line's last child
(where a pen leaves the caret), and in a node outside the text
**Expected:** `{0, 2, 3}`, `{0, 1, 4}`, `{1, 0, 0}`, `{2, 0, k}`, `{0, 2, 6}` and null
**Refs:** crc-MarkedText.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 5
**Fire alarm:** In scan, give plain text after a mark the mark's run index (`line.length - 1`): the position after the mark names run 1
**Inject:** src/text/marks.ts:scan
**Pulled:** 2026-11-12 — rang: the position after the mark named run 1 instead of 2

## Test: an empty line is one line
**Purpose:** the browser writes an empty line as `<div><br></div>`; read takes it as one empty line,
so blank lines don't double each time the text is saved
**Input:** the same tree as above
**Expected:** read serializes to `Res: <res>Money +Maj</res>, more`, an empty line, `third line`
**Refs:** crc-MarkedText.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 6
**Fire alarm:** In scan, let every `br` start a line (the 9.4.1 behaviour): the empty line becomes two and the third line moves to line 3
**Inject:** src/text/marks.ts:scan
**Pulled:** 2026-11-12 — rang: the empty line became two (read gained a fourth line) and the third line moved to line 3

## Test: several Resources on one line
**Purpose:** R247: the Resource pen at a bare caret on a line of comma-separated `Name +Level` entries
marks each entry, the commas and spaces left plain
**Input:** `Money +Min, Liquid Courage +Maj` and `  Money +Min ,Ammo +Sig ` with the Resource pen;
`Money +Min, a horse` and `Money +Min, Debt -Sig` with it; `Money +Min, Ammo +Sig` with the Influence pen
**Expected:** `<res>Money +Min</res>, <res>Liquid Courage +Maj</res>` and
`  <res>Money +Min</res> ,<res>Ammo +Sig</res> `; the other three each one mark over the whole run
**Refs:** crc-Pens.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 8
**Fire alarm:** In entries, drop the sign check: `Money +Min, Debt -Sig` is split into two Resources, the debt among them
**Inject:** src/ui/pens.ts:entries
**Pulled:** 2026-11-12 — rang: `Money +Min, Debt -Sig` was split into two Resources, the debt among them

## Test: several Motivations on one line
**Purpose:** R258: the Motivation pen at a bare caret marks each comma-separated `Name ±Level`, either sign
**Input:** `Be Left Alone +Sig, Dread of the New Moon -Min` with the Motivation pen
**Expected:** `<mot>Be Left Alone +Sig</mot>, <mot>Dread of the New Moon -Min</mot>`
**Refs:** crc-Pens.md
**Code:** `src/ui/pens.test.ts`
**Alarm:** 9
**Fire alarm:** In entries, keep the Resource sign rule for Motivations: the negative entry stops the split
**Inject:** src/ui/pens.ts:entries
**Pulled:** 2026-11-12 — rang: the negative entry stopped the split; the whole line became one Motivation
