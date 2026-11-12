# UI: a character card
**Requirements:** R5, R22, R23, R24, R75, R202, R203, R209, R213, R214

Front:
```
┌─────────────────────────────────────────────────┐
│ Samuel Diamond, Rank 3          ⚀ Mental Atk: 2, +2   │
│ Cha 2  Int 2  Wis 4             ⚀ Infer: 4, +2         │
│ Private Investigator 2          Defend: mental 2 / psych 4 (double underline)
│   Investigation (x2)            Sparked: 46  Grains: 14│
│                                 Resources              │ ← head
│                                 ▭ Money +Maj  ▭ Ammo +Sig│ ← res, tap glyphs
└────────────────────────────────────────────────╱┘ ← flip corner
```

Front and back follow Samuel Diamond's card in *A Ghoulish Problem*; the back adds an Injuries
column beside the printed Biases and Afflictions (Hollow Folks, *Injury, Bias, and Affliction
Pools*). The boxes and the absorb heading follow the example card in *Bunkum*, where Biases is the
only column used.

Back (Injuries empty, so collapsed to its name):
```
┌──────────────────────────────────────────────────────────────┐
│ BIASES (absorb 2)            AFFLICTIONS              │INJ│ │
│ □     Mild ▭ Distrust        Mild ______________      │   │ │
│ □ □   Min  ______________    Min  ______________      │   │ │
│ ☑     Sig  ▭ Uncertain ▭     Sig  ______________      │   │ │
│       Maj  ______________    Maj  ______________      │   │ │
│ NOTES                                                        │
│ ____________________________________________________________ │
└──────────────────────────────────────────────────────────────┘
```
- A slot's boxes sit in front of its Level word (R213). An entry is drawn as its column's mark
  (`bias`, `aff`, `inj`) with a tap glyph ▭ before it; a checked box adds a glyph after the entry,
  one per checked box.
- A heading shows `(absorb N)` only when N isn't 0 (R214); clicking the heading edits it.

- ⚀ is the action die: die-shaped, so it can't be taken for a Slot box □ or a tap glyph ▭.
- Paper is tilted; it squares up while it holds the cursor.
- The pens appear beside a card while you write on it: one highlighter per mark, in a row down
  its right edge, tips toward the paper. The pen the caret's line fits slides out to that line.

```
┌──────────────────────────────┐ ◁▬▬ Action ▬▬▌
│ Infer: 4, +2|                │◁▬▬ Action ▬▬▌   ← offered: beside the caret's line
│ Resources                    │ ◁▬ Resource ▬▌
│ Money +Maj                   │ ◁▬ Influence ▌
│                              │ ◁▬▬ Defend ▬▬▌
└──────────────────────────────┘ ◀■■ Heading ■■▌
```
- Refs: crc-PieceView.md, crc-Pens.md
