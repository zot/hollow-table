# MarkedText
**Requirements:** R204, R205, R206, R208, R209, R246

Handwriting with marks: a closed, attribute-free markup naming what a run of text is in the game.
A simple DOM over the text: it models only the five marks, and every other byte stays exactly where
it was, so parse-then-serialize reproduces the source.

## Knows
- MARKS: `act, res, inf, def, head`. Nothing else is a mark; `<bias>`, `<aff>` and `<inj>` in text
  are text (they are how PieceView draws a Damage slot's entry, never stored, R209).
- Line: a sequence of runs, `text` or `{mark, text}`; marks don't nest. Lines split at `\n`.
- source: the original string, kept so serialization is byte-exact.

## Does
- parse(source): lines of runs. `<tag>…</tag>` with a known tag and no attributes is a mark;
  anything else, including an unknown, unclosed or attributed tag, is text, kept verbatim.
- serialize(lines): the source string. `serialize(parse(s)) === s` for every s.
- marks(lines, tag?): every mark, with its line and index, for readers (MarkReader).
- setMark(lines, at, text): replace one mark's text (a spent Resource's Level), nothing else.
- mark(lines, range, tag) / unmark(lines, at): what the highlighter pens do.
- render(lines, el): builds a slim DOM (a div per line, a span per mark) with `textContent` only;
  nothing is parsed as HTML. An `act` or `def` span's label (labelEnd) is a `b` inside it (R246),
  which read and locate walk through like any text.
- labelEnd(mark, text): how much of a mark's text is its label, up to and including its first colon;
  0 for other marks or no colon.
- read(el): the reverse, from edited DOM back to lines: spans with a mark class become marks;
  every other node contributes only its text (pasted markup is reduced to its words). A div starts
  a line, and so does a `br`, except one ending its line: that is the browser's placeholder for an
  empty line (`<div><br></div>`), and counting it would double every blank line.
- locate(el, node, offset): a DOM position (a selection's end) as `{line, run, offset}` in the
  lines read(el) gives, walked the same way; null when it isn't inside el. A position in plain text
  past a line's last run names the run that would be there.

## Collaborators
- MarkReader: reads game data inside marks.
- Pens: mark, unmark and locate are what a pen uses.

## Sequences
- none
