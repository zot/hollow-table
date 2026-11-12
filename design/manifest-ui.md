# UI manifest
**Requirements:** R1-4, R6, R7, R11-13, R17, R219, R221, R240, R252, R255, R258, R263, R267

One page, no routes. The table fills the window under the bar. Everything is paper and table
furniture; the chrome is the bar.

## Theme tokens (`src/ui/theme.css`, `:root`)

| Token | Value | Use |
|---|---|---|
| `--walnut` | `#3E2C22` + faint grain | the table surface |
| `--card` / `--card-edge` | `#FFFFFF` / `#888` | character and reference cards |
| `--sticky` | `#FFF200` | sticky notes |
| `--paper` | `#FBFAF6` | receipts, the tape, ledger pages |
| `--chip-pos` / `--chip-neg` | `#93C47D` / `#E06666` | chips (a red chip also shows its sign) |
| `--slot` | `#CFE2F3` | Bonus, Main, Edge |
| `--stagger` | `#F4CCCC` | Stagger |
| `--bias` | `#E06666` | Bias |
| `--affliction` | `#4A2F63`, lettering `#F3E9D2` | Affliction |
| `--injury` | `#D9C4A0` | Injury |
| `--oak`, `--nickel`, `--enamel` | `#8A5A2E`, `#C9CCCF`, `#C8372D` | the register |
| `--cloth` | `#2F5D3A` | the Ledger's binding |
| `--amber` | `#F0A040` | the current opponent's ring |

## Marks and pens

Seven pens, one per stored mark, each a chisel-tip highlighter whose barrel is its mark's highlight
with a darker cap and its word printed in PT Mono, sentence case. The Heading pen is a black felt
marker with cream lettering, since a heading is drawn bold rather than highlighted. `bias`, `aff`
and `inj` are how Damage slots are drawn; they have no pen.

| Mark | Highlight | Non-colour cue |
|---|---|---|
| `act` | `#FFD27A` | its die |
| `res` | `#BDE5A8` | its tap glyph |
| `mot` | `#9FDCD0` | its tap glyph, dashed underline |
| `att` | `#E7DDB0` | wavy underline |
| `inf` | `#A9D4F0` | dotted underline |
| `bias` | `#F4AFC0` | its tap glyph, its column |
| `aff` | `#CDB6EE` | its tap glyph, its column |
| `inj` | `#E9D3A6` | its tap glyph |
| `def` | `#D6D6D6` | double underline |
| `head` | none (pen: `--ink`) | Caveat bold, like the printed headings |

**At rest a card looks printed (R245)**, and while written on, a Damage entry fills only once named (R263). The highlights and their underlines show only while the
paper holds the caret or its pens hold focus, the same moment the pens are out; otherwise only the
weights below, the dice and the glyphs say what is marked. **Weights (R246):** an `act` or `def`
mark's label, up to its first colon, is bold; a heading is 18 px bold, and a heading on a card's
first line (its name) 21 px.

**The tap glyph (R249, R250)** is a tiny card, 11 by 14: white, a 1.5 px ink border with 2 px
corners, a hard 1.5 px offset shadow in ink, `#FFF6A8` under the pointer. A resource-made Influence
card carries the same mark before its name. A dry source's glyph is at opacity .3 with the
not-allowed pointer.

## Drop targets (R222)

What a carried thing would land on lights up while it's over it.

| Target | Look |
|---|---|
| a slot | 3 px translucent white outline (`#fff8`), 2 px out |
| a drawer (a card goes home there) | 3 px translucent white outline |
| the kill box | 3 px outline in the red chip colour: deleting reads as danger |
| a chip a +1 rides, a card a tap merges into | 3 px solid white outline |
| a card a sticky, text or image pins to | 3 px translucent white outline on its face |
| the bar | dark red while tossing; Boot Hill shows its arrow while burying (9.4.5) |
| the gap in a drawer (R240) | an empty card-sized space (110×40) with a dashed light outline; the cards slide aside to make it |

## Type

- **Caveat**: all handwriting (cards, stickies, loose text, headings on cards).
- **PT Mono**: reference cards, receipts, slot labels, the bar's small chrome.
- **Sancreek**: the wordmark, once.
- Sentence case everywhere; no all-caps labels.

## Global rules

- Every control is a thing at the table (R7): keys, tags, tabs, glyphs, pages. No web buttons,
  pills, dropdowns or floating panels.
- Visible focus on every control: a 2px `--amber` outline offset from the paper.
- `prefers-reduced-motion`: lifts, flips, slides and dice tumble become instant.
- No piece is held in 3D (R252): `perspective`, `preserve-3d` and `backface-visibility` make Chrome
  draw a card's text soft, worse while it is raised to write on. A flip is a 2D squeeze, `scaleX` 1 to
  0 on one face and 0 to 1 on the other, .25 s in all. Nor does a `filter` sit over a whole tray of
  pens: the pens' shadow is on each pen.
- Ruled lines (the back's notes, R255) are SVG lines with `vector-effect: non-scaling-stroke`, one
  screen pixel at any zoom and antialiased on tilted paper. CSS has no non-scaling line: a hard
  gradient stripe breaks into steps when tilted, a soft one fades unevenly zoomed out, and one sized
  from the zoom still steps (all three compared at 0.58 and 1.6, 11-12).
- Chrome (labels, slot rows, drawer tools, roll row, register, bar) is `user-select: none`.
- The slimmest DOM that draws it: one element per piece and per slot, more only where a control
  needs its own target.

## Layouts

- ui-table.md, ui-pool.md, ui-card.md, ui-register.md, ui-ledger.md
