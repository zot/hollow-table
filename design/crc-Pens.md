# Pens
**Requirements:** R206, R207

The highlighter pens beside a piece while you write on it: one per mark, in place of a formatting
toolbar.

## Does
- show(piece): the eight pens beside the piece holding the cursor; gone when it loses it.
- apply(tag): marks the selection (MarkedText.mark), or unmarks marked text under it.
- offer(line): when the line being written fits a mark's grammar (MarkReader.offer), that pen is
  raised beside it; one click marks the line.

## Collaborators
- MarkedText, MarkReader, PieceView

## Sequences
- none
