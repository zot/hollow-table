# MarkedText
**Requirements:** R204, R205, R206, R208

Handwriting with marks: a closed, attribute-free markup naming what a run of text is in the game.
A simple DOM over the text: it models only the eight marks, and every other byte stays exactly where
it was, so parse-then-serialize reproduces the source.

## Knows
- MARKS: `act, res, inf, bias, aff, inj, def, head`. Nothing else is a mark.
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
  nothing is parsed as HTML.
- read(el): the reverse, from edited DOM back to lines: spans with a mark class become marks;
  every other node contributes only its text (pasted markup is reduced to its words).

## Collaborators
- MarkReader: reads game data inside marks.

## Sequences
- none
