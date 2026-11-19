# MarkReader
**Requirements:** R54, R74, R83, R207, R258, R261, R267, R322-324, R326, R336, R337, R362, R354, R355, R363, R364, R391, R396, R436

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
- action(text): `{label, base, yellows, bonus, att}`, or null; `att` (R337) is the attribute named as an
  entry in the line's parentheses, `(no att)` null and `(Int)` `Int`, else `Cha`.
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

- field(text) (R323): a `<fld>` mark's `Name N (nXP)`: its name and Level.
- skills(lines) (R324): each `<skl>` mark's Skills with their Levels: a Field Skill at the nearest
  `<fld>` above's Level, one higher with a ✓; a `Skills N:` line's Skills (split at commas outside
  parentheses) at N.
- entries(front) (R391): what an Infer can reveal, in order: each part, split at commas outside
  parentheses (as `Skills N:` lines are), of a line holding a `fld`, `skl`, `res` or `mot` mark, after
  the label through its first colon outside parentheses, if any; and each line under an ITEMS heading,
  whole. Each has its line, label, text, category (Skills for Fields and Skills, Resources,
  Motivations, Items), the Items heading's line for an Item, and its key: label and text, "Skills 3:
  Savvy".
- clues(info) (R396): an Info card's clues, each non-empty line whole, keyed by its text, its
  category the word before its colon (Skill, Resource, Motivation, Item, Opinion, any case, singular
  or plural), or ANY for any other word or none (R436).
- offer(line, heading, underField) (R207, R323, R324): also `fld` for a plain `Name N (nXP)` line,
  and `skl` for a `Skills N:` line or a plain line under a Field.
- points(front, att) (R326, R336): everything on a card's front a drop can point at, each with its line,
  its start and end in that line's text, what it is by name (`{def: 'mental'|'psych'}`, `{act:
  label}`, `{fld: name}`, `{skl: name}`), its base, and its words for the `vs` line: a Defend
  number, an action's Base, a Field or one Skill (Level plus the card's `att`, the attribute the acting action uses: `Cha`,
  `Int`, or null for none; one the card doesn't list counts 0).
- suffered(label) (R362): the Influence an action's label is (`Tricky -Min`: Tricky, −1, Min), or null
  when the label has no sign and Level.
- suffers(front, label) (R362, R363): the Influence that action on that front suffers: a variant's own
  label, or the part after the comma of a label that names its Skill first (`Oratory, Audience
  -Sig`); null for any other, and for a lone Influence (no action above, no Skill named), which is no
  action.
- skillNamed(front, label) (R364): whether the label (before any comma) names a Field or Skill on
  that front, by its name as points() reads it, ignoring case.
- variants(front) (R354, R355): each action line whose label is an Influence, right under another
  action line or under that action's other variants: its line, its label, and the action it varies.

## Collaborators
- MarkedText: supplies the marks.

## Sequences
- none
