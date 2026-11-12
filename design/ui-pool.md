# UI: a pool
**Requirements:** R28, R227, R228, R229, R230, R231, R240, R241, R244, R31, R37, R53, R78

The mat keeps its drawer's width; slots open from the left as many as fit, a slot holding anything
always open, and the rest stand as 1em strips at the right, so the slots always fill the mat.

Empty (Bonus, Main, Edge and Stagger fit; the rest are strips):
```
 Sam  [P1-die] gather   Infer 4 → 8  vs Devreux ⌖
┌───────────────────────────────────────────────┐   white frame
│╭──────╮╭──────╮╭──────╮╭────────╮╭─╮╭─╮╭─╮    │
││      ││      ││      ││        ││B││A││I│    │   tall rounded slots, name in the middle
││Bonus ││ Main ││ Edge ││Stagger ││ ││ ││ │    │   (PT Mono, sentence case)
││      ││      ││      ││opposit-││ ││ ││ │    │
││      ││      ││      ││ion only││ ││ ││ │    │   strips packed at the right
│╰──────╯╰──────╯╰──────╯╰────────╯╰─╯╰─╯╰─╯    │
├───────────────────────────────────────────────┤
│▌Keep the Peace +Sig  ▌Self-Pres +Sig  ┆+┆┆−┆ [used] ▩kill │  the drawer, a tray in the mat
│▌Old Sympathy for Sparkers +Min        ┆ ┆┆ ┆ [ 0  ] ▩    │  cards left, tool tiles right
└───────────────────────────────────────────────┘
```

Holding chips (stacks tuck under the stronger chip before them):
```
╭──────╮
│ (4)  │   strongest nearest the edge, drawn on top
│ (2)  │
│      │
│ (−2) │   negatives from the bottom
╰──────╯
```

A chip carried over the slots (R244): the strip under it opens and a slot closes to pay for it,
the one the chip came from if now empty, else the first empty one to the left; the mat keeps its
width (or grows by that one slot if none can close, the drawer staying put).
```
lifted the −2 from Stagger, now over the Bias strip:
╭─╮╭──────╮╭──────╮╭──────╮╭──────╮╭─╮╭─╮
│S││Bonus ││ Main ││ Edge ││ Bias ││A││I│   Stagger (left empty) paid for Bias
╰─╯╰──────╯╰──────╯╰──────╯╰──────╯╰─╯╰─╯
```

A card carried over a drawer (R240): a gap opens where it would go and follows it; the other cards
slide aside, and the tray grows a row if it must.
```
│▌Keep the Peace +Sig  ┊          ┊  ▌Self-Pres +Sig   ┆+┆┆−┆ [used] ▩kill │
│▌Old Sympathy for Sparkers +Min                       ┆ ┆┆ ┆ [ 0  ] ▩    │
```
When a drawer grows, any piece the mat now covers slides just clear below it (R241).

- A pile shows as a stack of discs in its colour; open, its members are listed beside it, each with
  its name.
- Refs: crc-PoolView.md, crc-Drag.md
