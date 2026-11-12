# MarkReader
**Requirements:** R54, R74, R83, R207

Reads the game inside marks, and only there. Each grammar is also used to *offer* a pen for a plain
line that fits it.

## Knows
- The action grammar: `LABEL: N [stuff], [Nd][±N] [stuff]`, split at the first comma outside
  parentheses.
- The Influence grammar: `Name ±Level`, Level being Min, Sig, Maj, Ext or Exq, or a number of points.
- The Defend grammar: `N`, `mental N / psych M`, or `N / M` (mental / psych).

## Does
- action(text): `{label, base, yellows, bonus}`, or null.
- influence(text): `{name, sign, level}`, or null. Used for `res` and `inf`.
- defend(text): `{mental, psych}` (equal for a single number), or null.
- offer(line, heading): the mark whose grammar a plain line fits (`act` for an action line, `res` for
  `Name +Level` after a "Resources" heading), or null.
- spend(text, by): the same Influence text with its Level moved by `by` Levels (*Money +Maj* to
  *+Sig*), keeping everything else as written. Levels are words up to Exquisite, then
  points; levelsOf and levelWord convert.

## Collaborators
- MarkedText: supplies the marks.

## Sequences
- none
