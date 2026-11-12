# Pens
**Requirements:** R206, R207

The highlighter pens beside a piece while you write on it: one per mark, in place of a formatting
toolbar. Five pens, one per stored mark (`act`, `res`, `inf`, `def`, `head`); Damage entries are
slots, not marks, so they have none (R209).

## Knows
- PENS: each mark with the word printed on its barrel: Action, Resource, Influence, Defend, Heading.
- The writing area last written in, so a pen reached by keyboard still knows its text.

## Does
- tray(piece): the five pens beside the piece's right edge, shown while one of its writing areas
  (a card's front or notes, a sticky, loose text) holds the cursor or a pen holds focus. Pressing a
  pen takes neither the cursor nor the selection from the text, and never carries the piece.
- apply(lines, from, to, tag): what a pen does. Marked text under the selection (or the caret, or
  a bare caret at a mark's edge) is unmarked (MarkedText.unmark), whichever pen it is; a selection inside one plain run is marked
  (MarkedText.mark); a bare caret on plain text marks its run, trimmed of surrounding spaces. A
  selection across runs or lines changes nothing, and the pen shakes.
- offered(lines, line): the mark a plain line fits (MarkReader.offer), given the nearest heading
  mark above it, or null.
- offer: as the caret moves or the text changes, the offered pen slides out of the row to sit
  beside the caret's line, lifted; one click marks the line.
- places(count, k, at, step): where each pen sits when pen k is offered at `at`: the others keep
  their order a step apart and step past it, so none is hidden under it.
- After a pen acts, the text is redrawn and saved through the writing area's own input (PieceView),
  and the caret goes back to the end of the line it acted on.

## Collaborators
- MarkedText: locate (selection to line, run and offset), read, render, mark, unmark.
- MarkReader: offer.
- PieceView: puts a tray on each piece that has writing areas.

## Sequences
- none
