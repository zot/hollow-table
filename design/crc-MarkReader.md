# MarkReader
**Requirements:** R54, R74, R83, R207, R258, R261, R267

Reads the game inside marks, and only there. Each grammar is also used to *offer* a pen for a plain
line that fits it.

## Knows
- The action grammar: `LABEL: N [stuff], [Nd][±N] [stuff]`, split at the first comma outside
  parentheses.
- The Influence grammar: `Name ±Level`, Level being Min, Sig, Maj, Ext or Exq, or a number of points.
- A Motivation's adjusted value: the Influence grammar, then the Levels left in parentheses,
  `Keep the Peace +Sig (+Min)` or `(0)` (Bunkum, *Adjusted Motivations*).
- The attribute grammar: `Name N` pairs, a capitalised three-letter name and a signed number
  (`Cha 2  Int 2  Wis 4`).
- The Defend grammar: `N`, `mental N / psych M`, or `N / M` (mental / psych).

## Does
- action(text): `{label, base, yellows, bonus}`, or null.
- influence(text): `{name, sign, level}`, or null. Used for `res`, `mot` and `inf`.
- motiveLeft(text): a Motivation's Levels left: the parenthesis when there is one, else its written
  Level.
- adjust(text, by): a Motivation's text with `by` more Levels spent (fewer when negative), its written
  Level kept and the Levels left in parentheses; back to full, the parentheses go. Null below zero.
- unadjusted(text): the text with its parentheses removed (a recharge).
- attributes(text): `{Cha: 2, Int: 2, Wis: 4}` from an `<att>` mark's text.
- defend(text): `{mental, psych}` (equal for a single number), or null.
- offer(line, heading): the mark whose grammar a plain line fits (`act` for an action line, `res` for
  `Name +Level` after a "Resources" heading, `mot` for `Name ±Level` after a "Motivations" heading,
  `att` for a line of two or more `Name N` pairs), or null.
- spend(text, by): the same Influence text with its Level moved by `by` Levels (*Money +Maj* to
  *+Sig*), keeping everything else as written. Levels are words up to Exquisite, then
  points; levelsOf and levelWord convert.

## Collaborators
- MarkedText: supplies the marks.

## Sequences
- none
